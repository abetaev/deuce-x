/** @jsx createElement */

import { createElement, render } from './core.ts'
import { Children } from './jsx.ts'

const ParentElement = ({ children }: { children: Children }) => <div id="parent">{children}</div>

const Hello = ({ to }: { to: string }) => <div>hello, {to}!!!</div>

type CounterProps = { value: number }
async function* Counter({value}: CounterProps) {
  while (true) {
    value ++
    console.log(value)
    yield (
      <div>
        <div>{value}</div>
        <button onClick={() => console.log(value)}>poo</button>
        {value % 2 ? <Counter value={value}/> : null}
      </div >
    )
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

render(
  document.body,
  <Counter value={132} />
)
