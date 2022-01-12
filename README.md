# deuce-x

reactive like 💩 implementation of JSX for browser.

this is opinion on how JSX should be implemented inspired by:

1. curiosity about [crank-js](https://crank.js.org/)
2. and hatred for [react](https://reactjs.org/)

## requirements

this project requires:

- [deno](https://deno.land/)

- (modern) web browser

> **NOTE**: it does not support any kind of server-side rendering.

## usage

consists of:

- **jsx** - jsx implementation

- **cmp** - useful components

- **use** - useful functions

### jsx

provides:

- `createElement` (or shorthand `h`) - transforms hyperscript into `JSX.Element`

- `render` - renders arbitrary set of `JSX.Element`s into DOM `Element`

```tsx
/** @jsx h */
import { h, render } from "https://deno.land/x/deuce_x/jsx.ts";

render(
  document.body, /* or any other element */
  <div>hello world</div>,
);
```

#### supported component types

##### primitives

```tsx
// numbers
render(target, 0, 1.618033988749, 2.718281828459, 3.141592653589);

// booleans
render(target, true, false);

// strings
render(target, "hello", "world");
```

##### intrinsic HTML elements

```tsx
render(
  target,
  <div>this is basic example<div>,
  <hr/>,
  <ul>
    <li>item 1</li>
    <li>item 2</li>
    <li>item 3</li>
  </ul>
)
```

##### arrays

```tsx
render(
  target,
  [
    1.618033988749,
    true,
    "hello",
    <div>world</div>,
  ],
);
```

##### static components

```tsx
type Props = { to: value };
const Hello = ({ to }: Props) => <div>hello, {to}!</div>;

render(
  target,
  <Hello to="world" />,
);
```

##### active components

this is component which _maintains_ state.

```tsx
type Props = { limit: value; delay: number };
async function* Counter({ limit, delay }: Props) {
  // define state
  let counter = 0;

  do {
    // render state
    yield <div>counting: {counter}</div>;

    await new Promise((resolve) => setTimeout(resolve, delay));

    // update state
    counter++;
  } while (counter < limit); // loop may be infinite

  // if function does not have return component will dissappear
  return <div>finished: {counter}</div>;
}

render(target, <Counter limit={16} delay={333} />);
```

##### future components

this is component which needs to perform asynchronous operations.

```tsx
type Props = { url: string };
const FetchJSON = ({ url }: Props) =>
  fetch(url).then((response) => response.json());
// or it can be async
const FetchJSON2 = async ({ url }: Props) => {
  const response = await fetch(url);
  return response.json();
};
// which will effectively be the same
render(
  target,
  <FetchJSON url="https://example.com/sample.json" />,
  <FetchJSON2 url="https://example.com/sample.json" />,
);
```

### cmp

provides:

- `Fragment` - component to group other components

- `State` - component to extract state from active components

#### `Fragment`

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { Fragment } from "https://deno.land/x/deuce_x/cmp.ts";

const ComponentWithFragment = () => (
  <>
    <div>first</div>
    <div>second</div>
    <div>third</div>
  </>
);
```

fragments are syntax sugar for arrays.

#### `State`

```tsx
/** @jsx h */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { State } from "https://deno.land/x/deuce_x/cmp.ts";

async function* stateProvider() {
  let iteration = 0;
  while (true) {
    yield { iteration };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
type Props = { iteration: number };
const StatelessComponent = ({ iteration }: Props) => (
  <div>iteration #{iteration}</div>
);
const StatefulComponent = (
  <State input={stateProvider}>{StatelessComponent}</State>
);
```

### use

provides:

- `useLink` - get reference to dom elements when they are rendered

- `useWait` - block execution until notice

- `useEvent` - send event to subscribers

- `usePipe` - event wrapped into iterator

- `useMux` - multiplexed pipes

#### useLink

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { Fragment } from "https://deno.land/x/deuce_x/cmp.ts";
import { useLink } from "https://deno.land/x/deuce_x/use.ts";

const [socket, plug] = useLink<HTMLInputElement>();

const Interactive = () => (
  <>
    <input socket={socket} />
    <button
      onClick={async () => {
        alert(`you have entered: ${(await plug).value}`);
      }}
    />
  </>
);
```

#### `useWait`

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { Fragment } from "https://deno.land/x/deuce_x/cmp.ts";
import { useWait } from "https://deno.land/x/deuce_x/use.ts";

const [lock, release] = useWait();
const ClickCounter = async function* () {
  let clicks = 0;
  while (true) {
    yield `clicks so far: ${clicks}`;
    await lock(); // execution will stop here until someone invokes release
    clicks++;
  }
};

render(
  target,
  <>
    <ClickCounter />
    <button onClick={release}>click!</button>
  </>,
);
```

#### `useEvent`

```tsx
/** @jsx h */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { useEvent } from "https://deno.land/x/deuce_x/use.ts";

const [emitEvent, onEvent] = useEvent<string>();
onEvent((event) => alert(`alert received: ${event}`));

render(
  target,
  <button onClick={() => emitEvent("achtung!")}>alert me!</button>,
);
```

#### `usePipe`

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { Fragment } from "https://deno.land/x/deuce_x/cmp.ts";
import { usePipe } from "https://deno.land/x/deuce_x/use.ts";

const [sendToPipe, eventPipe] = usePipe<void>();
type PipeListenerProps = { input: PipeOutput<void> };
const PipeListener = async function* ({ input }: PipeListenerProps) {
  let events = 0;
  for await (const event of input()) {
    events++;
    yield `received ${events} events so far`;
  }
};

render(
  target,
  <>
    <button onClick={() => sendToPipe()}>generate pipe event</button>
    <PipeListener input={eventPipe} />
  </>,
);
```

#### `useMux`

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "https://deno.land/x/deuce_x/jsx.ts";
import { Fragment } from "https://deno.land/x/deuce_x/cmp.ts";
import { useLink, useMux, usePipe } from "https://deno.land/x/deuce_x/use.ts";

type CreateEvent = { type: "create"; value: string };
type RemoveEvent = { type: "remove"; value: number };

const [create, createPipe] = usePipe<string>();
const [remove, removePipe] = usePipe<string>();
const eventPipe = useMux({
  create: createPipe,
  remove: removePipe,
});

type ListProps = { events: Pipe<CreateEvent | RemoveEvent> };
const List = async function* ({ input }: PipeListenerProps) {
  const list: string[] = [];
  for await (const event of input()) {
    switch (event) {
      case "create":
        list.push(event.value);
        break;
      case "remove":
        list.splice(event.value, 1);
        break;
    }
    yield list.map((record, id) => (
      <div>
        <span>{id}.</span>
        <span>{record}</span>
      </div>
    ));
  }
};

render(
  target,
  <>
    <div>
      <input type="text" socket={recordSocket} />
      <button
        onClick={async () => {
          const input = (await recordPlug);
          create(input.value);
          input.value = "";
        }}
      >
        create
      </button>
    </div>
    <div>
      <input type="text" socket={recordSocket} />
      <button
        onClick={async () => {
          const input = (await recordPlug);
          remove(+input.value);
          input.value = "";
        }}
      >
        remove
      </button>
    </div>
    <List input={eventPipe} />
  </>,
);
```

### examples

rerer to:

- [demo](./examples/demo/) provides examples of the above features you can
  experiment with

- [todo](./examples/todo/) implementation example

## TODO

- refactor TODO demo
- support SVG namespace
- generate jsx type definitions from standard
- write more docs
- check for memory leaks
- check for performance ( --> optimize )
