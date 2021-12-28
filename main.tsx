
namespace JSX {

  export type Element = CustomElement | DOMElement

  export type CustomElement = {
    type: "custom"
  }

  export type DOMElement = {
    type: "dom"
    name: string
    props: Record<string, string | boolean | number>
    children: Element | Element[]
  }

}

type Props = Record<string, unknown>

type Component<TProps extends Props> = (props: TProps) => JSX.Element

type ElementFactory = CustomElementFactory | DOMElementFactory

type CustomElementFactory = <TProps extends Props>(component: Component<TProps>, props: TProps, ...children: JSX.Element[]) => JSX.CustomElement

type HTMLElementFactory = <TName extends keyof HTMLElementTagNameMap, TProps extends Props>(name: TName, props: TProps, ...children: JSX.Element[]) => JSX.DOMElement

type SVGElementFactory = <TName extends keyof SVGElementTagNameMap, TProps extends Props>(name: TName, props: TProps, ...children: JSX.Element[]) => JSX.DOMElement

type DOMElementFactory = HTMLElementFactory | SVGElementFactory

type Renderer<Target> = (element: JSX.Element, target: Target) => void | Promise<void>



const createElement: ElementFactory = (value, props, ...children) => {
  if (typeof value === "function") return {
    type: "custom"
  }

  if (typeof value === "string") return {
    type: "dom",
    name: value,
    props,
    children
  }

  throw `unsupported element type ${typeof value}`
}


const renderConsole: Renderer<Console> = (element, target) => {

}


const MyElement = () => <div></div>
