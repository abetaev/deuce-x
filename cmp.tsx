/** @jsx h */
/** @jsxFrag Fragment */

import { h } from './jsx.ts'

/**
 * state component which allows to extract state to separate
 * asynchronous generator/iterator or generator function.
 */
type StatefulProps<T> = {
  children: (props: T) => JSX.Element
  input: (() => AsyncIterator<T>) | (AsyncIterator<T>)
}
export async function* State<T>({ children, input }: StatefulProps<T>) {
  const Child = children
  const iterator = typeof input === "function" ? input() : input
  let result: IteratorResult<T>
  do {
    result = await iterator.next()
    if (result.value)
      yield <Child {...result.value} />
  } while (!result.done)
  if (result.value)
    return <Child {...result.value} />
}

/**
 * implementation of JSX Fragment.
 */
type FragmentProps = { children: JSX.Element }
export const Fragment = ({ children }: FragmentProps) => children
