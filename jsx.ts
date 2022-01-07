/// <reference lib="DOM" />
/// <reference path="./jsx.d.ts" />

import { kebabize } from './util.ts'

// create

type SimpleElement = Awaited<JSX.TextElement>
type StaticElement = Awaited<JSX.NodeElement>
type ActiveElement = AsyncIterator<JSX.Element, JSX.Element | void>
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

type Component<TProps> = IntrinsicComponent | SyntheticComponent<TProps>

export const createElement = <T>(component: Component<T>, props: T, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<T>): component is IntrinsicComponent =>
    typeof component === "string";

  if (isIntrinsicComponent(component)) return {
    name: component,
    props,
    children: children.length === 1 ? children[0] : children
  };

  return component({ children, ...props }) as JSX.Element

}

// render

function createSlot(value: JSX.Element): Slot {
  if (value === null) throw 'absent elements are not supported'

  if (Array.isArray(value)) return new PluralSlot(value)

  if (typeof value === "object") {
    if ("name" in value) return new StaticSlot(value)
    if ("next" in value) return new ActiveSlot(value)
    if ("then" in value) return new FutureSlot(value)
  } else if (typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number")
    return new SimpleSlot(value)

  throw `unknown element: type="${typeof value}", data="${value}"`
}

type Renderer = (update: Node[]) => void

interface Slot {
  mount(render: Renderer): void
  unmount(): void
}

class SimpleSlot implements Slot {
  constructor(private source: SimpleElement) { }
  mount(render: Renderer) {
    render([document.createTextNode(`${this.source}`)])
  }
  unmount() { }
}

class StaticSlot implements Slot {
  private children?: Slot
  constructor(private source: StaticElement) { }
  mount(render: Renderer) {
    const element = document.createElement(this.source.name)
    function update(replacement: Node[]) {
      element.replaceChildren(...replacement)
    }
    if (this.source.children) {
      this.children = createSlot(this.source.children)
      this.children.mount(update)
    }
    type StyleObject = Record<string, string | number | boolean>
    function transformStyle(input: StyleObject) {
      return Object.keys(input)
        .map(key => `${kebabize(key)}: ${input[key]}`)
        .join(';')
    }
    if (this.source.props) Object.keys(this.source.props)
      .map(name => [name, this.source.props[name as keyof JSX.Props]] as [string, unknown])
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
  }
  unmount() { this.children?.unmount() }
}

class PluralSlot implements Slot {
  private nodes: Node[][] = []
  private slots: Slot[] = []
  constructor(private source: PluralElement) { }
  mount(render: Renderer) {
    const updateSlot = (index: number, nodes: Node[]) => {
      this.nodes[index] = nodes
      render(this.nodes.flat())
    }
    this.source.map(createSlot)
      .map((slot, index) => {
        this.slots[index] = slot
        slot.mount(nodes => updateSlot(index, nodes))
      })
    const flatten = () => {
      return
    }
    return flatten()
  }
  unmount() {
    this.slots.forEach(slot => slot.unmount())
  }
}

class FutureSlot implements Slot {
  private live = true
  private slot?: Slot
  constructor(private source: FutureElement) { }
  mount(update: Renderer) {
    this.source.then(element => {
      if (this.live) {
        this.slot = createSlot(element)
        this.slot.mount(update)
      }
    })
  }
  unmount() {
    this.live = false;
    this.slot?.unmount()
  }
}

class ActiveSlot implements Slot {
  private live = true
  private slot?: Slot
  constructor(private source: ActiveElement) { }
  mount(render: Renderer) {
    (async () => {
      let result: IteratorResult<JSX.Element>
      do {
        this.slot?.mount(render)
        result = await this.source.next()
        this.slot?.unmount()
        this.slot = createSlot(result.value)
      } while (this.live && !result.done)
    })()
  }
  unmount() {
    this.live = false;
    this.slot?.unmount()
  }
}

export function render(parent: Element, element: JSX.Element) {
  function update(children: Node[]) {
    parent.replaceChildren(...children)
  }
  createSlot(element).mount(update)
}

// fragment

export const Fragment = ({children}: {children: JSX.Element}) => children