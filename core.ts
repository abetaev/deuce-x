import type { } from './jsx.ts'

export type ChildrenProps = { children: JSX.Children }

type StaticComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => JSX.Element
type ActiveComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => AsyncGenerator<JSX.Element, JSX.Element | void, undefined>
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

type LiveNode = { type: "live", start: () => void, stop: () => void }
type TreeNode = { type: "tree", node: Node, children: ContextNode[] }
type ContextNode = TreeNode | LiveNode
type Context<T = ContextNode> = T[]
export const render = (target: Element, children: JSX.Children, previous: Context<ContextNode | undefined> = []): Context => {

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number"

  const isDOMElement = (element: JSX.Element): element is JSX.IntrinsicElement =>
    element !== null && typeof element === "object" && "name" in element

  const isActiveElement = (element: JSX.Element): element is JSX.ActiveElement =>
    element !== null && typeof element === "object" && "next" in element

  const current: Context = []

  const renderChild = (currentNode: ContextNode, previousNode: ContextNode | undefined) => {
    if (previousNode) {
      if (currentNode.type === "tree") {
        if (previousNode.type === "tree") {
          target.replaceChild(currentNode.node, previousNode.node)
          previousNode.children.forEach(child => removeChild(child, previousNode.node))
        } else {
          target.appendChild(currentNode.node)
          previousNode.stop()
        }
      } else {
        if (previousNode.type === "tree") {
          target.removeChild(previousNode.node)
          previousNode.children.forEach(child => removeChild(child, previousNode.node))
        }
        else previousNode.stop()
        currentNode.start()
      }
    } else switch (currentNode.type) {
      case "tree": target.appendChild(currentNode.node); break;
      case "live": currentNode.start(); break;
    }
  }

  const removeChild = (node: ContextNode, from: Node = target) => {
    if (node.type === "tree") {
      from.removeChild(node.node)
      node.children.forEach(child => removeChild(child, node.node))
    }
    else node.stop()
  }

  children && (Array.isArray(children) ? children : [children])
    .filter(jsxElement => jsxElement !== null)
    .forEach((jsxElement, index) => {
      if (isTextElement(jsxElement)) {
        current[index] = { type: "tree", node: document.createTextNode(`${jsxElement}`), children: [] }
      } else if (isDOMElement(jsxElement)) {
        const { name, props, children } = jsxElement;
        const node = document.createElement(name)
        if (props) Object.keys(props)
          .forEach(name => {
            if (name.match(/on[A-Z].*/)) node.addEventListener(name.substring(2).toLowerCase(), props[name as keyof JSX.Props])
            else node.setAttribute(name.toLowerCase(), `${props[name as keyof JSX.Props]}`)
          })
        const c = children ? render(node, children) : []
        current[index] = { type: "tree", node, children: c }
      } else if (isActiveElement(jsxElement)) {
        let active = true;
        const start = async () => {
          let context: Context = [];
          let result = await jsxElement.next()
          while (active && !result.done) {
            context = render(target, result.value, context)
            result = await jsxElement.next()
          }
          context.forEach(node => removeChild(node))
        }
        const stop = () => active = false
        current[index] = { type: "live", start, stop }
      } else throw `unsupported element ${typeof jsxElement}: ${JSON.stringify(jsxElement)}`
    })

  for (let index = 0; index < current.length; index++)
    renderChild(current[index], previous[index])
  for (let index = current.length; index < previous.length; index++) {
    const node = previous[index]
    if (node) removeChild(node)
  }

  return current

}
