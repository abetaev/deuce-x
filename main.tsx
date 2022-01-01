/** @jsx createElement */

import { createElement, render } from './jsx.ts'
import { usePipe, useMux } from './use.ts'
import type { PipeOutput } from './use.ts'

type Item = { done: boolean, text: string }

type TODOItemProps = { onDelete: () => void, onToggle: () => void, item: Item }
const TODOItem = ({ onDelete, onToggle, item }: TODOItemProps) => {
  console.log(item)
  return (
    <li class={item.done ? "done" : "todo"} onClick={onToggle}>{item.text}<button onClick={onDelete}>delete</button></li>
  )
}

type TODOListProps = { inputSource: PipeOutput<string> }
async function* TODOList({ inputSource }: TODOListProps) {
  const items: Item[] = JSON.parse(localStorage.getItem("items") || "[]")

  const [remove, removeSource] = usePipe<number>()
  const [toggle, toggleSource] = usePipe<number>()

  const eventSource = useMux({ remove: removeSource, input: inputSource, toggle: toggleSource })

  const List = () => (
    <ul>
      {items.map((item, id) => <TODOItem onDelete={() => remove(id)} item={item} onToggle={() => toggle(id)}/>)}
    </ul>
  )
  yield <List/>

  for await (const message of eventSource()) {
    switch (message.type) {
      case "input": items.push({ done: false, text: message.value }); break;
      case "remove": items.splice(message.value, 1); break;
      case "toggle": items[message.value].done = !items[message.value].done; break;
    }
    localStorage.setItem("items", JSON.stringify(items))    
    yield <List/>
  }

}

const TODO = () => {
  const [addMessage, messagePipe] = usePipe<string>()
  return (
    <main>
      <TODOList inputSource={messagePipe} />
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

render(
  document.body,
  <TODO />,
)
