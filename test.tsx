/** @jsx createElement */

import { createElement, render } from './cool-stuff.ts'

const Hello = () => <div>Hello</div>

type HelloProps = { delay: number, name: string }
const FutureHello = async ({ delay, name }: HelloProps) => {
  await wait(delay)
  return <div>Hello {name} from future</div>
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function* Counter() {
  let counter = 0;
  while (counter < 10) {
    yield counter++
    await wait(1000)
  }
}

async function* ActiveHello({ delay, name }: HelloProps) {
  let counter = 0
  while (counter < 10) {
    yield counter % 2 ? <div>active odd {name} {counter}</div> : <div>active even {name} {counter}</div>
    await wait(delay)
    counter++
  }
  return <div>active end {name} {delay}</div>
}

async function* RecursiveHello({ delay, name }: HelloProps) {
  let counter = 0
  while (counter < 10) {
    console.log('recursive', counter)
    yield counter % 2 ? <RecursiveHello delay={delay} name={name} /> : <div>recursive odd {name}</div>
    await wait(delay)
    counter++
  }
  return <div>recursive end {name} {delay}</div>
}

const Delay = async ({ ms, children }: { ms: number, children: JSX.Children }) => {
  await new Promise(resolve => setTimeout(resolve, ms))
  return children
}

render(
  document.body,
  // <RecursiveHello delay={500} name="test"/>
  <div>
    <ul>
      <li>item 1</li>
      <li>item 2</li>
      <li>item 3</li>
    </ul>
    <FutureHello delay={999} name="first"/>
    <FutureHello delay={666} name="second"/>
    <FutureHello delay={333} name="third"/>
    <Delay ms={999}>
      <ActiveHello delay={999} name="first" />
    </Delay>
    <Delay ms={333}>
      <ActiveHello delay={666} name="second" />
    </Delay>
    <Delay ms={666}>
      <ActiveHello delay={333} name="third" />
    </Delay>
  </div>
)
