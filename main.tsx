/** @jsx createElement */

import { createElement, render } from './core.ts'
import { Children } from './jsx.ts'

const ParentElement = ({ children }: { children: Children }) => <div id="parent">{children}</div>

const Hello = ({ to }: { to: string }) => <div>hello, {to}!!!</div>

async function* CounterElement({ delay, initial, children }: { delay: number, initial: number, children: Children }) {
  let counter = initial
  while (true) {
    await new Promise(resolve => setTimeout(resolve, delay))
    yield (
      <div>
        <div>{counter++}</div>
        {children}
      </div>
    )
  }
}

render(
  document.body, [],
  <CounterElement delay={1000} initial={1000}>
    <ParentElement><Hello to="world" /></ParentElement>
  </CounterElement>
)
