import type { } from './jsx.ts'

export type ChildrenProps = { children: JSX.Children }

type StaticComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => JSX.Element
type ActiveComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => AsyncIterator<JSX.Element, JSX.Element | void, undefined>
type SyntheticComponent<TProps extends JSX.Props = JSX.Props> = StaticComponent<TProps> | ActiveComponent<TProps>

type IntrinsicComponent = keyof JSX.IntrinsicElements

type Component<TProps extends JSX.Props> = IntrinsicComponent | SyntheticComponent<TProps>


export const createElement = <TProps extends JSX.Props>(component: Component<TProps>, props: TProps, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<TProps>): component is IntrinsicComponent =>
    typeof component === "string";

  const isActiveComponent = (component: Component<TProps>): component is ActiveComponent<TProps> =>
    typeof component === "function" && component.constructor.name === "AsyncGeneratorFunction";

  const isStaticComponent = (component: Component<TProps>): component is StaticComponent<TProps> =>
    typeof component === "function" && component.constructor.name === "Function"

  if (isIntrinsicComponent(component)) {
    return {
      name: component,
      props,
      children: children.length === 1 ? children[0] : children
    };
  }

  return component({ children, ...props })

}

type LiveState = { type: "live", start: () => void, stop: () => void }
type TreeState = { type: "tree", node: Node, children: ContextState[] }
type ContextState = TreeState | LiveState
type Context<T = ContextState> = T[]
export const render = (target: Element, children: JSX.Children, previous: Context<ContextState | undefined> = []): Context => {

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number"

  const isDOMElement = (element: JSX.Element): element is JSX.IntrinsicElement =>
    element !== null && typeof element === "object" && "name" in element

  const isActiveElement = (element: JSX.Element): element is JSX.ActiveElement =>
    element !== null && typeof element === "object" && "next" in element

  const current: Context = []

  const mergeState = (currentState: ContextState | undefined, previousState: ContextState | undefined) => {
    if (previousState) {
      if (!currentState) cleanupState(previousState)
      else if (currentState.type === "tree") {
        if (previousState.type === "tree") {
          target.replaceChild(currentState.node, previousState.node)
          cleanupTreeState(previousState)
        } else {
          previousState.stop()
          target.appendChild(currentState.node)
        }
      } else {
        if (previousState.type === "tree")
          cleanupState(previousState)
        else previousState.stop()
        currentState.start()
      }
    } else if (currentState) switch (currentState.type) {
      case "tree": target.appendChild(currentState.node); break;
      case "live": currentState.start(); break;
    } else throw `illegal state: both sides of state diff are undefined`
  }

  const cleanupState = (node: ContextState, from: Node = target) => {
    if (node.type === "tree") {
      from.removeChild(node.node)
      cleanupTreeState(node)
    }
    else node.stop()
  }

  const cleanupTreeState = (node: TreeState) => {
    node.children.forEach(child => cleanupState(child, node.node))
  }

  const createTreeState = ({ name, props, children }: JSX.NodeElement): TreeState => {
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

  const createLiveState = (iterator: JSX.ActiveElement): LiveState => {
    let live = true;
    return { 
      type: "live",
      start: async () => {
        let context: Context = [];
        let result = await iterator.next()
        while (live && !result.done) {
          context = render(target, result.value, context)
          result = await iterator.next()
        }
        context.forEach(node => cleanupState(node))
      },
      stop: () => live = false
    }
  }

  children && (Array.isArray(children) ? children : [children])
    .filter(jsxElement => jsxElement !== null)
    .forEach((jsxElement, index) => {
      if (isTextElement(jsxElement)) {
        current[index] = { type: "tree", node: document.createTextNode(`${jsxElement}`), children: [] }
      } else if (isDOMElement(jsxElement)) {
        current[index] = createTreeState(jsxElement)
      } else if (isActiveElement(jsxElement)) {
        current[index] = createLiveState(jsxElement)
      } else throw `unsupported element ${typeof jsxElement}: ${JSON.stringify(jsxElement)}`
    })

  const count = Math.max(current.length, previous.length)
  for (let index = 0; index < count; index++)
    mergeState(current[index], previous[index])

  return current

}
