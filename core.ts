import type { } from './jsx.ts'

export type ChildrenProps = { children: JSX.Children }

type StaticComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => JSX.Element
type ActiveComponent<TProps extends JSX.Props = JSX.Props> = (props: TProps) => AsyncGenerator<JSX.Element, JSX.Element | void, undefined>
type SyntheticComponent<TProps extends JSX.Props = JSX.Props> = StaticComponent<TProps> | ActiveComponent<TProps>

type IntrinsicComponent = keyof JSX.IntrinsicElements

type Component<TProps extends JSX.Props> = IntrinsicComponent | SyntheticComponent<TProps>


export const createElement = <TProps extends JSX.Props>(component: Component<TProps>, props: TProps, ...children: JSX.Element[]): JSX.Element => {

  const isIntrinsicComponent = (component: Component<TProps>): component is IntrinsicComponent => typeof component === "string"

  if (isIntrinsicComponent(component)) {
    return {
      name: component,
      props,
      children: children.length === 1 ? children[0] : children
    };
  }

  return component({ children, ...props })

}

type Context = Node[]
export const render = (target: Element, children: JSX.Children, context: Context = []) => {

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number"

  const isDOMElement = (element: JSX.IntrinsicElement | JSX.SyntheticElement): element is JSX.IntrinsicElement =>
    "name" in element

  const isActiveElement = (element: JSX.SyntheticElement): element is JSX.SyntheticElement =>
    "next" in element

  children && (Array.isArray(children) ? children : [children]).forEach((jsxElement, index) => {
    if (isTextElement(jsxElement)) {
      const node = document.createTextNode(`${jsxElement}`)
      const old = context[index]
      context[index] = node
      if (old) target.replaceChild(node, old)
      else target.appendChild(node)
    } else if (isDOMElement(jsxElement)) {
      const { name, props, children } = jsxElement;
      const node = document.createElement(name)
      if (props)
        Object.keys(props)
          .forEach(name => node.setAttribute(name, `${props[name]}`))
      if (children)
        (Array.isArray(children) ? children : [children])
          .forEach(child => render(node, child, []))
      const old = context[index]
      context[index] = node
      if (old) target.replaceChild(node, old)
      else target.appendChild(node)
    } else if (isActiveElement(jsxElement)) {
      const context: Context = [];
      (async () => {
        for await (const element of { [Symbol.asyncIterator]: () => jsxElement }) {
          render(target, element, context)
        }
      })()
    } else throw `unsupported element ${typeof jsxElement}`
  })
}
