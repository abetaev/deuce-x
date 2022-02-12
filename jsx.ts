/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="ES2021" />

import './jsx.defs.ts'
import { kebabize } from './util.ts'

// create

type ArrayComponent<T> = (props: T) => JSX.ArrayElement
type StatelessComponent<T> = (props: T) => JSX.StatelessElement
type StatefulComponent<T> = (props: T) => JSX.StatefulElement
type FutureComponent<T> = (props: T) => JSX.FutureElement
type SyntheticComponent<T> =
  StatelessComponent<T>
  | StatefulComponent<T>
  | FutureComponent<T>
  | ArrayComponent<T>

type IntrinsicComponent = keyof JSX.IntrinsicElements

export type Component<T> = IntrinsicComponent | SyntheticComponent<T>

export const createElement = <T extends Record<string, unknown> = Record<string, unknown>>(component: Component<T>, props: T, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<T>): component is IntrinsicComponent =>
    typeof component === "string";

  if (isIntrinsicComponent(component)) return {
    name: component,
    props,
    children: children.length === 1 ? children[0] : children
  };

  if (Array.isArray(component)) // this appears to be the case if rendering <State/> ¯\_(ツ)_/¯
    return component.map(subcomponent => createElement(subcomponent, props, ...children))

  return component({ children, ...props }) // TODO: why this cast is required?

}

export const h = createElement

// render

function createSlot(value: JSX.Element): Slot {
  if (value === null) return absentSlot

  if (Array.isArray(value)) return createArraySlot(value)

  if (typeof value === "object") {
    if ("name" in value) return createStatelessSlot(value)
    if ("next" in value) return createStatefulSlot(value)
    if ("then" in value) return createFutureSlot(value)
  } else if (typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number")
    return createTextSlot(value)

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


function createTextSlot(source: JSX.TextElement): Slot {
  return {
    mount(render) {
      render([document.createTextNode(`${source}`)])
    },
    unmount() { }
  }
}

function createStatelessSlot(source: JSX.NodeElement): Slot {
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
        .map(name => [name, source.props[name]] as [string, unknown])
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

function createArraySlot(source: JSX.ArrayElement): Slot {
  const allNodes: Node[][] = []
  const slots: Slot[] = []
  return {
    mount(render) {
      const updateSlot = (index: number, nodes: Node[]) => {
        allNodes[index] = nodes
        // TODO: can send more detailed info to render for efficiency
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

function createFutureSlot(source: JSX.FutureElement): Slot {
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

function createStatefulSlot(source: JSX.StatefulElement): Slot {
  let live = true
  let slot: Slot = absentSlot
  return {
    mount(render) {
      (async () => {
        let result: IteratorResult<JSX.Element | void>
        do {
          result = await source.next(live)
          slot.unmount()
          if (result.value !== undefined)
            slot = createSlot(result.value)
          else
            slot = absentSlot
          slot.mount(render)
        } while (live && !result.done)
        if (!result.done) await source.next(false)
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
