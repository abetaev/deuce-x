/** @jsx createElement */

import { createElement, render } from './jsx.ts'
import { useWait, usePipe, useMux } from './use.ts'
import type { PipeOutput } from './use.ts'

type Item = { done: boolean, text: string }

type TODOItemProps = { onDelete: () => void, onToggle: () => void, onChange: (text: string) => void, item: Item }
async function* TODOItem({ onDelete, onToggle, onChange, item }: TODOItemProps) {
  let editing = false
  const [pause, update] = useWait()
  while (true) {
    yield (
      <li>
        <span onClick={onToggle}>{item.done ? '✅' : '⬜'}</span>
        {
          editing
            ? <span><input /><button onClick={({target}) => onChange((target as HTMLInputElement).value)}>save</button><button onClick={() => {editing = false; update()}}>cancel</button></span>
            : <span onClick={() => {editing = true; update()}}>{item.text}</span>
        }
        <button onClick={onDelete}>delete</button>
      </li>
    )
    await pause()
  }
}


type TODOListProps = { items: Item[], onChange: (items: Item[]) => void, inputSource: PipeOutput<string> }
async function* TODOList({ items, onChange, inputSource }: TODOListProps) {

  const [remove, removeSource] = usePipe<number>()
  const [toggle, toggleSource] = usePipe<number>()

  const eventSource = useMux({ remove: removeSource, input: inputSource, toggle: toggleSource })

  const List = () => (
    <ul>
      {items.map((item, id) => <TODOItem
        onDelete={() => remove(id)} item={item}
        onToggle={() => toggle(id)}
        onChange={(text) => console.log(text)}
      />)}
    </ul>
  )
  yield <List />

  for await (const message of eventSource()) {
    switch (message.type) {
      case "input": items.push({ done: false, text: message.value }); break;
      case "remove": items.splice(message.value, 1); break;
      case "toggle": items[message.value].done = !items[message.value].done; break;
    }
    onChange(items)
    yield <List />
  }

}

type TODOProps = { source: string }
const TODO = ({ source }: TODOProps) => {
  const items: Item[] = JSON.parse(localStorage.getItem(source) || "[]")
  const [addMessage, messagePipe] = usePipe<string>()
  return (
    <main>
      <TODOList items={items} inputSource={messagePipe} onChange={items => localStorage.setItem(source, JSON.stringify(items))} />
      <input type="text" onKeyDown={({ key, target }) => {
        if (key === "Enter") {
          const input = target as HTMLInputElement
          const value = input.value
          input.value = ""
          addMessage(value)
        }
      }} />
    </main>
  )
}

const Load = async ({ child }: { child: JSX.Element }) => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
  return child
}

render(
  document.body,
  [
    <Load child={<TODO source="todo1" />} />,
    <hr />,
    <Load child={<TODO source="todo2" />} />
  ]
)
