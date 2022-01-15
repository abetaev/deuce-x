/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="ES2021" />
/// <reference path="./jsx.d.ts" />

import { kebabize } from './util.ts'

// create

type SimpleElement = Awaited<JSX.TextElement>
type StaticElement = Awaited<JSX.NodeElement>
type ActiveElement = AsyncIterator<JSX.Element | void, JSX.Element | void>
type FutureElement = Promise<JSX.Element>
type PluralElement = Array<JSX.Element>

type PluralComponent<T> = (props: T) => PluralElement
type StaticComponent<T> = (props: T) => StaticElement
type ActiveComponent<T> = (props: T) => ActiveElement
type FutureComponent<T> = (props: T) => FutureElement
type SyntheticComponent<T> =
  StaticComponent<T>
  | ActiveComponent<T>
  | FutureComponent<T>
  | PluralComponent<T>

type IntrinsicComponent = keyof JSX.IntrinsicElements

export type Component<T> = IntrinsicComponent | SyntheticComponent<T>

export const createElement = <T>(component: Component<T>, props: T, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<T>): component is IntrinsicComponent =>
    typeof component === "string";

  if (isIntrinsicComponent(component)) return {
    name: component,
    props,
    children: children.length === 1 ? children[0] : children
  };

  if (Array.isArray(component)) // this appears to be the case if rendering <State/> ¯\_(ツ)_/¯
    return component.map(subcomponent => createElement(subcomponent, props, ...children))

  return component({ children, ...props }) as JSX.Element // TODO: why this cast is required?

}

export const h = createElement

// render

function createSlot(value: JSX.Element): Slot {
  if (value === null) return absentSlot

  if (Array.isArray(value)) return createPluralSlot(value)

  if (typeof value === "object") {
    if ("name" in value) return createStaticSlot(value)
    if ("next" in value) return createActiveSlot(value)
    if ("then" in value) return createFutureSlot(value)
  } else if (typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number")
    return createSimpleSlot(value)

  throw new Error(`unknown element: type="${typeof value}", data="${value}"`)
}

type Renderer = (update: Node[]) => void

interface Slot {
  mount(render: Renderer): void
  unmount(): void
}

const absentSlot: Slot = {
  mount(render) { render([]) },
  unmount() { }
}


function createSimpleSlot(source: SimpleElement): Slot {
  return {
    mount(render) {
      render([document.createTextNode(`${source}`)])
    },
    unmount() { }
  }
}

function createStaticSlot(source: StaticElement): Slot {
  let children: Slot | undefined
  return {
    mount(render) {
      const element = document.createElement(source.name)
      function update(replacement: Node[]) {
        element.replaceChildren(...replacement)
      }
      if (source.children) {
        children = createSlot(source.children)
        children.mount(update)
      }
      type StyleObject = Record<string, string | number | boolean>
      function transformStyle(input: StyleObject) {
        return Object.keys(input)
          .map(key => `${kebabize(key)}: ${input[key]}`)
          .join('; ')
      }
      if (source.props) Object.keys(source.props)
        .map(name => [name, source.props[name as keyof JSX.Props]] as [string, unknown])
        .forEach(([name, value]) => {
          if (typeof value === "function" && name === "socket")
            (value as JSX.Socket<EventTarget>)(element)
          else if (Array.isArray(value) && name === "class")
            element.setAttribute("class", value.join(' '))
          else if (typeof value === "object" && value && name === "style")
            element.setAttribute("style", transformStyle(value as StyleObject))
          else if (typeof value === "function" && name.match(/on[A-Z].*/))
            element.addEventListener(name.substring(2).toLowerCase(), value as EventListenerOrEventListenerObject)
          else
            element.setAttribute(name.toLowerCase(), `${value}`)
        })
      render([element]);
    },
    unmount() { children?.unmount() }
  }
}

function createPluralSlot(source: PluralElement): Slot {
  const allNodes: Node[][] = []
  const slots: Slot[] = []
  return {
    mount(render) {
      const updateSlot = (index: number, nodes: Node[]) => {
        allNodes[index] = nodes
        render(allNodes.flat())
      }
      source.map(createSlot)
        .map((slot, index) => {
          slots[index] = slot
          slot.mount(nodes => updateSlot(index, nodes))
        })
    },
    unmount() {
      slots.forEach(slot => slot.unmount())
    }
  }
}

function createFutureSlot(source: FutureElement): Slot {
  let live = true
  let slot: Slot | undefined
  return {
    mount(update) {
      source.then(element => {
        if (live) {
          slot = createSlot(element)
          slot.mount(update)
        }
      })
    },
    unmount() {
      live = false;
      slot?.unmount()
    }
  }
}

function createActiveSlot(source: ActiveElement): Slot {
  let live = true
  let slot: Slot = absentSlot
  return {
    mount(render) {
      (async () => {
        let result: IteratorResult<JSX.Element | void>
        do {
          result = await source.next()
          slot.unmount()
          if (result.value !== undefined)
            slot = createSlot(result.value)
          else
            slot = absentSlot
          slot.mount(render)
        } while (live && !result.done)
      })()
    },
    unmount() {
      live = false;
      slot?.unmount()
    }
  }
}

export function render(parent: Element, ...element: JSX.Element[]) {
  const update = (children: Node[]) => parent.replaceChildren(...children)
  createSlot(element).mount(update)
}
