/** @jsx createElement */

import { createElement, render } from './core.ts'
import { Children } from './jsx.ts'

const ParentElement = ({ children }: { children: Children }) => <div class="parent">{children}</div>

const Hello = ({ to }: { to: string }) => <div>hello, {to}!!!</div>

function useEvent<T>(): [(data: T) => void, Promise<T>] {
  let satisfy: undefined | ((data: T) => void) = undefined
  const promise = new Promise<T>(resolve => satisfy = resolve)
  if (!satisfy) throw `unsatistyable`
  return [satisfy, promise]
}

type LiveProps = { value: number }
async function* Live({ value }: LiveProps) {
  while (value < 10) {
    const [resolve, promise] = useEvent<number>()
    yield (
      <div>
        <ParentElement>
          <Hello to={`${value}`} />
        </ParentElement>
        <ParentElement>
          <button onClick={() => resolve(value + 1)}>click me!</button>
        </ParentElement>
      </div>
    )
    value = await promise
  }
}

render(
  document.body,
  <Live value={1} />
)
