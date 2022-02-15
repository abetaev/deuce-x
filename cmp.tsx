/** @jsx h */
/** @jsxFrag Fragment */

import { h } from './jsx.ts'

/**
 * stateful component allows to extract state to separate
 * asynchronous generator/iterator or generator function.
 */
type StatefulProps<T> = {
  children: (props: T) => JSX.Element
  input: (() => AsyncIterator<T | void, T | void, boolean>) | (AsyncIterator<T, T | void, boolean>)
}
export async function* Stateful<T>({ children, input }: StatefulProps<T>): AsyncGenerator<JSX.Element, JSX.Element | void, boolean> {
  const Child = children
  const iterator = typeof input === "function" ? input() : input
  let result: IteratorResult<T | void>
  let live = true
  do {
    result = await iterator.next()
    if (result.value)
      live = yield <Child {...result.value} />
  } while (live && !result.done)
  if (live && result.value)
    return <Child {...result.value} />
}

/**
 * managed component allows to trigger rerender of children.
 * call `useWait` to retrieve lock and update functions.
 */
type ManagedProps<T> = {
  children: (props: T) => JSX.Element
  lock: () => Promise<void>
  state: T
}
export async function* Managed<T>({children: Child, lock, state}: ManagedProps<T>) {
  let live = true
  while(live) {
    live = yield <Child {...state}/>
    await lock()
  }
}

/**
 * implementation of JSX Fragment.
 */
type FragmentProps = { children: JSX.Element }
export const Fragment = ({ children }: FragmentProps) => children
