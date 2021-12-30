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

type Context = Node[]
export const render = (target: Element, children: JSX.Children, previous: Context = []): Context => {

  const isTextElement = (element: JSX.Element): element is JSX.TextElement =>
    typeof element === "string" || typeof element === "boolean" || typeof element === "number"

  const isDOMElement = (element: JSX.IntrinsicElement | JSX.ActiveElement): element is JSX.IntrinsicElement =>
    typeof element === "object" && "name" in element

  const isActiveElement = (element: JSX.ActiveElement): element is JSX.ActiveElement =>
    "next" in element

  const current: Context = []
  children && (Array.isArray(children) ? children : [children]).forEach((jsxElement, index) => {
    if (isTextElement(jsxElement)) {
      current[index] = document.createTextNode(`${jsxElement}`)
      if (previous[index]) target.replaceChild(current[index], previous[index])
      else target.appendChild(current[index])
    } else if (isDOMElement(jsxElement)) {
      const { name, props, children } = jsxElement;
      const node = document.createElement(name)
      if (props) Object.keys(props)
        .forEach(name => {
          if (name.match(/on[A-Z].*/)) node.addEventListener(name.substring(2).toLowerCase(), props[name as keyof JSX.Props])
          else node.setAttribute(name.toLowerCase(), `${props[name as keyof JSX.Props]}`)
        })
      if (children)
        (Array.isArray(children) ? children : [children])
          .forEach(child => render(node, child, []))
      current[index] = node
      if (previous[index]) target.replaceChild(current[index], previous[index])
      else target.appendChild(current[index])
    } else if (isActiveElement(jsxElement)) {
      let active = true;
      const node = async () => {
        let context: Context = [];
        let result = await jsxElement.next()
        while (active && !result.done) {
          context = render(target, result.value, context)
          result = await jsxElement.next()
        }
      }
      current[index]
      const stop = () => { active = false }
    } else throw `unsupported element ${typeof jsxElement}`
  })

  for (let index = current.length; index < previous.length; index++)
    target.removeChild(previous[index])

  return current

}
