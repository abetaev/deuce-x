import type { } from './jsx.d.ts'

export type ChildrenProps = { children: JSX.Children }

type StaticComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => JSX.Element
type ActiveComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => AsyncIterator<JSX.Element, JSX.Element | void, undefined>
type SyntheticComponent<TProps extends JSX.Props = JSX.Props> = StaticComponent<TProps> | ActiveComponent<TProps>

type IntrinsicComponent = keyof JSX.IntrinsicElements

type Component<TProps extends JSX.Props> = IntrinsicComponent | SyntheticComponent<TProps>


export const createElement = <TProps extends JSX.Props>(component: Component<TProps>, props: TProps, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<TProps>): component is IntrinsicComponent =>
    typeof component === "string";

  if (isIntrinsicComponent(component)) {
    return {
      name: component,
      props,
      children: children.length === 1 ? children[0] : children
    };
  }

  return component({ children, ...props })

}

type ActiveState = { type: "active", start: () => void, stop: () => void }
type FutureState = { type: "future", promise: Promise<ContextState>, index: number }
type DOMNodeState = { type: "tree", node: Node, children: ContextState[] }
type ContextState = DOMNodeState | ActiveState | FutureState
type Context<T = ContextState> = T[]
export const render = (target: Element, children: JSX.Children, previous: Context<ContextState> = []): Context => {

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number" || typeof element === "undefined"

  const isDOMElement = (element: JSX.Element): element is JSX.IntrinsicElement =>
    element !== null && typeof element === "object" && "name" in element

  const isActiveElement = (element: JSX.Element): element is JSX.ActiveElement =>
    element !== null && typeof element === "object" && "next" in element

  const isFutureElement = (element: JSX.Element): element is Promise<Awaited<JSX.Element>> =>
    element !== null && typeof element === "object" && "then" in element

  const current: Context = []

  const mergeState = (currentState: ContextState, previousState: ContextState | undefined) => {
    if (previousState) {
      if (currentState.type === "tree") {
        if (previousState.type === "tree") {
          target.replaceChild(currentState.node, previousState.node)
          cleanTreeState(previousState)
        } else {
          if (previousState.type === "active") previousState.stop()
          target.appendChild(currentState.node)
        }
      } else {
        if (previousState.type === "tree")
          cleanState(previousState)
        else if (previousState.type === "active")
          previousState.stop()
        if (currentState.type === "active")
          currentState.start()
        else { // future
          current[currentState.index] = createDOMTextState("💩")
          currentState.promise.then(state => current[currentState.index] = state)
        }
      }
    } else switch (currentState.type) {
      case "tree": target.appendChild(currentState.node); break;
      case "active": currentState.start(); break;
      case "future": {
        const state = createDOMTextState("💩")
        current[currentState.index] = state
        target.appendChild(state.node)
        currentState.promise.then(state => current[currentState.index] = state)
        break;
      }
    }
  }

  const cleanState = (node: ContextState, from: Node = target) => {
    if (node.type === "tree") {
      from.removeChild(node.node)
      cleanTreeState(node)
    } else if (node.type === "active") node.stop()
  }

  const cleanTreeState = (node: DOMNodeState) => {
    node.children.forEach(child => cleanState(child, node.node))
  }

  const createDOMTextState = (data?: string | number | boolean): DOMNodeState => ({
    type: "tree",
    node: document.createTextNode(data ? `${data}` : ""),
    children: []
  })

  const createDOMNodeState = (data: JSX.NodeElement): DOMNodeState => {
    const { name, props, children } = data;
    const node = document.createElement(name)
    if (props) Object.keys(props)
      .forEach(name => {
        if (name.match(/on[A-Z].*/)) node.addEventListener(name.substring(2).toLowerCase(), props[name as keyof JSX.Props])
        else node.setAttribute(name.toLowerCase(), `${props[name as keyof JSX.Props]}`)
      })
    return {
      type: "tree",
      node,
      children: children ? render(node, children) : []
    }
  }

  const createActiveState = (iterator: JSX.ActiveElement): ActiveState => {
    let live = false;
    return {
      type: "active",
      start: async () => {
        if (live) return
        let context: Context = [];
        let result = await iterator.next()
        live = true
        while (live && !result.done) {
          context = render(target, result.value, context)
          result = await iterator.next()
        }
        context.forEach(node => cleanState(node))
      },
      stop: () => live = false
    }
  }

  const createFutureState = (promise: Promise<Awaited<JSX.Element>>, index: number): FutureState => ({
    type: "future",
    promise: promise.then(element => render(target, element, [current[index]])[0]),
    index
  })

  children && (Array.isArray(children) ? children : [children])
    .forEach((jsxElement, index) => {
      if (isTextElement(jsxElement))
        current[index] = createDOMTextState(jsxElement)
      else if (isDOMElement(jsxElement))
        current[index] = createDOMNodeState(jsxElement)
      else if (isActiveElement(jsxElement))
        current[index] = createActiveState(jsxElement)
      else if (isFutureElement(jsxElement))
        current[index] = createFutureState(jsxElement, index)
      else if (jsxElement === null)
        current[index] = createDOMTextState("💩") // leave some poo :)
      else throw `unsupported element ${typeof jsxElement}: ${JSON.stringify(jsxElement)}`
    })

  for (let index = 0; index < current.length; index++)
    mergeState(current[index], previous[index])
  for (let index = current.length; index < previous.length; index++)
    cleanState(previous[index])

  return current

}
