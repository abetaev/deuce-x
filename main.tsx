/** @jsx createElement */

import { createElement, render } from './core.ts'
import { Children } from './jsx.ts'

const Parent = ({ children }: { children: Children }) => <div>{children}</div>

const Hello = ({ to }: { to: string }) => <div>hello, {to}!!!</div>

function useEvent<T>(): [(data: T) => void, Promise<T>] {
  let satisfy: undefined | ((data: T) => void) = undefined
  const promise = new Promise<T>(resolve => satisfy = resolve)
  if (!satisfy) throw `unsatistyable`
  return [satisfy, promise]
}

type ActiveProps = { value: number }
async function* Active({ value }: ActiveProps) {
  while (value < 10) {
    const [resolve, promise] = useEvent<number>()
    yield (
      <Parent>
        <Hello to={`${value}`} />
        <button onClick={() => resolve(value + 1)}>click me!</button>
      </Parent>
    )
    value = await promise
  }
}

type FutureProps = { label: string, delay: number }
async function Future({ label, delay }: FutureProps) {
  await new Promise(resolve => setTimeout(resolve, delay))
  return <Hello to={`future ${label} with delay ${delay}`} />
}

async function* TODOList() {

  yield (
    <ul>
    </ul>
  )
}

const TODO = () => {
  return (
    <main>
      <TODOList/>
      <input type="text" onKeyDown={({ key, target }) => {
        if (key === "Enter") {
          const input = target as HTMLInputElement
          const value = input.value
          input.value = ""
        }
      }} />
    </main>
  )
}

render(
  document.body,
  <TODO />,
)
