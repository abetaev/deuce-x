/** @jsx h */
/** @jsxFrag Fragment */
import { h, render } from 'https://deno.land/x/deuce_x/jsx.ts';
import { Fragment } from 'https://deno.land/x/deuce_x/cmp.tsx';
import { usePipe } from 'https://deno.land/x/deuce_x/use.ts';

type View = (props: Record<never, never>) => JSX.Element
const [navigate, navigation] = usePipe<View | "back">()

type Navigator = (to: View | "back") => void

const MainView = ({ navigate }: { navigate: Navigator }) =>
  <button onClick={() => navigate(() => <SecondaryView navigate={navigate} />)}>go to secondary</button>

const SecondaryView = ({ navigate }: { navigate: Navigator }) =>
  <button onClick={() => navigate("back")}>go back</button>


async function* View() {
  const stack: View[] = []
  navigate(() => <MainView navigate={navigate} />)
  let Current: View | undefined
  for await (const View of navigation()) {
    console.log('view', View)
    if (View === "back") {
      if (stack.length > 0) {
        console.log('back', stack)
        Current = stack.pop()
      }
    } else if (Current) {
      stack.push(Current)
      Current = () => <View />
    } else Current = () => <View />
    if (Current) yield <Current />
  }
}

render(document.body, <View/>)
