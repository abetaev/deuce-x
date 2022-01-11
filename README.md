# deuce-x

reactive like 💩 implementation of JSX.

this is opinion on how JSX should be implemented inspired by:

1. curiosity about [crank-js](https://crank.js.org/)
2. and hatred for [react](https://reactjs.org/)

## documentation

### base API: jsx.ts

```tsx
/** @jsx h */
import { h, render } from "<...>/jsx.ts";

render(
  document.body, /* or any other element */
  <div>hello world</div>,
);
```

### `Fragment` support

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "<...>/jsx.ts";
import { Fragment } from "<...>/cmp.ts";

const FragmentedComponent = () => (
  <>
    <div>first</div>
    <div>second</div>
    <div>third</div>
  </>
);
```

or use arrays instead

```tsx
/** @jsx h */
import { h } from "<...>/jsx.ts";

const FragmentedComponent = () => [
  <div>first</div>,
  <div>second</div>,
  <div>third</div>,
];
```

but don't forget about commas.

### active component

```tsx
/** @jsx h */
import { h } from "<...>/jsx.ts";

type CounterProps = { delay: number };
async function* Counter({ delay }: CounterProps) {
  let count = 0; // <-- this is state
  while (true) {
    yield count++; // <-- this will be rendered
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
```

### future component

```tsx
/** @jsx h */
import { h } from "<...>/jsx.ts";

type CounterProps = { delay: number };
async function Delayed({ delay }: CounterProps) {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return `i came with ${delay}ms delay`;
}
```

### getting reference to rendered elements

```tsx
/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "<...>/jsx.ts";
import { Fragment } from "<...>/cmp.ts";
import { useLink } from "<...>/use.ts";

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

### further reading

rerer to:

- [demo](./examples/demo/demo.tsx) **for advanced use cases and demonstration**

- [todo](./examples/todo/) implementation example

## TODO

- refactor TODO demo
- support SVG namespace
- generate jsx type definitions from standard
- write more docs
- check for memory leaks
- check for performance ( --> optimize )
