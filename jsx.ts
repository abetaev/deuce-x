/// <reference lib="DOM" />
/// <reference path="./jsx.d.ts" />

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

type ActiveState = { type: "active", start: () => void, stop: () => void, substate: StaticState }
type FutureState = { type: "future", promise: Promise<ContextState>, substate(): ContextState }
type StaticState = { type: "static", node: Node, children: ContextState[] }
type ContextState = StaticState | ActiveState | FutureState
type Context<T = ContextState> = T[]
export const render = (target: Element, children: JSX.Children, previous: Context<ContextState> = []): Context => {

  const current: Context = []

  const cleanState = (state: ContextState) => {
    if (state.type === "static") state.children.forEach(child => cleanState(child))
    else if (state.type === "active") state.stop()
    else console.warn('future state was not resolved', state)
  }

  const createStaticTextState = (data?: string | number | boolean): StaticState => ({
    type: "static",
    node: document.createTextNode(data ? `${data}` : ""),
    children: []
  })

  const createStaticNodeState = (data: JSX.NodeElement): StaticState => {
    const { name, props, children } = data;
    const node = document.createElement(name)
    if (props) Object.keys(props)
      .forEach(name => {
        if (name === "socket")
          props[name as keyof JSX.Props](node)
        else if (name.match(/on[A-Z].*/))
          node.addEventListener(name.substring(2).toLowerCase(), props[name as keyof JSX.Props])
        else
          node.setAttribute(name.toLowerCase(), `${props[name as keyof JSX.Props]}`)
      })
    return {
      type: "static",
      node,
      children: children ? render(node, children) : []
    }
  }

  const createActiveState = (iterator: JSX.ActiveElement): ActiveState => {
    let live = false;
    const substate = createStaticTextState("💩")
    return {
      type: "active",
      start: async () => {
        if (live) return
        let context: Context = [substate];
        let result = await iterator.next()
        live = true
        while (live && !result.done) {
          context = render(target, result.value, context)
          result = await iterator.next()
        }
        context.forEach(node => cleanState(node))
      },
      stop: () => live = false,
      substate
    }
  }

  const createFutureState = (promise: Promise<Awaited<JSX.Element>>): FutureState => {
    let substate: ContextState = createStaticTextState("💩")
    return ({
      type: "future",
      promise: promise.then(element => render(target, element, [substate])[0]).then((state) => substate = state),
      substate: () => substate
    })
  }

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number" || typeof element === "undefined"

  const isNodeElement = (element: JSX.Element): element is JSX.StaticElement =>
    element !== null && typeof element === "object" && "name" in element

  const isIteratorElement = (element: JSX.Element): element is JSX.ActiveElement =>
    element !== null && typeof element === "object" && "next" in element

  const isPromiseElement = (element: JSX.Element): element is Promise<Awaited<JSX.Element>> =>
    element !== null && typeof element === "object" && "then" in element

  children && (Array.isArray(children) ? children : [children])
    .forEach((jsxElement, index) => {
      if (isTextElement(jsxElement))
        current[index] = createStaticTextState(jsxElement)
      else if (isNodeElement(jsxElement))
        current[index] = createStaticNodeState(jsxElement)
      else if (isIteratorElement(jsxElement))
        current[index] = createActiveState(jsxElement)
      else if (isPromiseElement(jsxElement))
        current[index] = createFutureState(jsxElement)
      else if (jsxElement === null)
        current[index] = createStaticTextState("💩") // leave some poo :)
      else throw `unsupported element ${typeof jsxElement}: ${JSON.stringify(jsxElement)}`
    })

  const mergeState = (currentState: ContextState, previousState?: ContextState) => {

    function getNode(state?: ContextState): Node | undefined {
      if (state) switch (state.type) {
        case "active":
          return state.substate.node
        case "future":
          return getNode(state.substate())
        case "static":
          return state.node
      }
    }

    const replacement = getNode(currentState) || document.createTextNode("💩")
    const placeholder = getNode(previousState)

    if (placeholder) target.replaceChild(replacement, placeholder)
    else target.appendChild(replacement)

    if (currentState.type === "active") currentState.start()
    previousState && cleanState(previousState)

  }

  for (let index = 0; index < current.length; index++)
    mergeState(current[index], previous[index])
  for (let index = current.length; index < previous.length; index++)
    cleanState(previous[index])

  return current

}
