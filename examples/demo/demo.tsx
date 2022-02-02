/** @jsx createElement */
/** @jsxFrag Fragment */

import { createElement, render } from '../../jsx.ts'
import { useLink, useWait, useEvent, usePipe } from '../../use.ts'
import type { PipeOutput } from '../../use.ts'
import { Fragment, Managed, Stateful } from '../../cmp.tsx'
import { delay } from '../../util.ts'

type StaticComponentProps = { to: string }
const StaticComponent = ({ to }: StaticComponentProps) => <div>hello, {to}!</div>

type ActiveComponentProps = { limit: number }
async function* ActiveComponent({ }: ActiveComponentProps) {
  for (let i = 0; i < 10; i++) {
    yield <div>{i} is {i % 2 ? 'odd' : 'even'}</div>
    await delay(1000)
  }
  return <div>what are the odds?.. or evens?</div>
}

async function* stateProvider(): AsyncGenerator<{ to: string }, { to: string }, boolean> {
  yield { to: "me" }
  await delay(5000)
  return { to: "you" }
}

type FutureComponentProps = { children: string }
const FutureComponent = async ({ children }: FutureComponentProps) => {
  await delay()
  return <div>{children}</div>
}

const [socket, plug] = useLink<HTMLInputElement>()

const [lock, release] = useWait()
const ClickCounter = async function* () {
  let clicks = 0;
  while (true) {
    yield `clicks so far: ${clicks}`
    await lock()
    clicks++
  }
}

const [emitEvent, onEvent] = useEvent<string>()
onEvent(event => alert(`alert received: ${event}`))

const [sendToPipe, eventPipe] = usePipe<void>()
type PipeListenerProps = { input: PipeOutput<void> }
const PipeListener = async function* ({ input }: PipeListenerProps) {
  let events = 0;
  for await (const event of input()) {
    events++
    yield `received ${events} events so far`
  }
}

const [lockManaged, updateManaged] = useWait()
type ManagedProps = { counter: number }
const ManagedComponent = ({ counter }: ManagedProps) => `i counted till ${counter}`
type ManagedState = ManagedProps
const managedState: ManagedState = { counter: 0 }

// this function renders everything into provided element
render(
  document.body, // <-- this is where we are going to render


  // valid element can be either:


  // 1. any primitive

  //    - a string:
  "i am just a string ",

  //    - boolean:
  true, false,

  //    - or a number:
  1, 2, 3, 4,


  // 2. or HTML intrinsic element like <div>:
  <div>i am intrinsic component's child</div>,


  // 5. static components are those which expand into
  //    intrinsic elements or primitives
  <StaticComponent to="world" />,


  // 6. active components are those which are represented
  //    by function returning AsyncIterator; for simplicity
  //    these can be generator functions:
  <div>
    <ActiveComponent limit={10} />
  </div>,


  // 7. fragments are fully supported:
  <>
    <div>first in fragment</div>
    <div>second in fragment</div>
    <div>third in fragment</div>
  </>,


  // 8. fragments are the same as arrays:
  [
    <div>first in array</div>,
    <div>second in array</div>,
    <div>third in array</div>
  ],
  //    except slight syntax difference


  // 9. state can be injected into static component
  //    with special <State/> component and generator
  //    function:
  <div>
    <Stateful input={stateProvider}>
      {StaticComponent}
    </Stateful>
  </div>,


  // 10. or by providing AsyncIterator which can be
  //     created by generator function or manually
  //     constructed:
  <div>
    <Stateful input={stateProvider()}>
      {StaticComponent}
    </Stateful>
  </div>,

  // 11. if you need to fetch an object from a server
  //     you may need to use Promise, future component
  //     helps to deal with it:
  <FutureComponent>hello from future</FutureComponent>,


  // 12. there are some more things you can do with
  //     use* functions which provide primitives to
  //     interact and transmit state between different
  //     parts of the program:

  //     - useLink is a way to obtain a real DOM 
  //       component upon rendering happens
  <div>
    <input socket={socket} />
    <button onClick={async () => alert(`you have entered: ${(await plug).value}`)}>get input</button>
  </div>,

  //     - useWait allows to synchronize active components
  <div>
    <ClickCounter />
    <button onClick={release}>click!</button>
  </div>,

  //     - useEvent provides event communication primitive
  <div>
    <button onClick={() => emitEvent("achtung!")}>alert me!</button>
  </div>,

  //     - usePipe allows to transform events into state
  <div>
    <button onClick={() => sendToPipe()}>generate pipe event</button>
    <PipeListener input={eventPipe} />
  </div>,

  //     - useMux allows to multiplex several pipes into one (see TODO example)  

  // 13. managed component which allows to rerender
  //     its contents on external change
  <div>
    <Managed lock={lockManaged} state={managedState}>{ManagedComponent}</Managed>
    <button onClick={() => {managedState.counter ++; updateManaged()}}>increment managed state</button>
  </div>,

)
