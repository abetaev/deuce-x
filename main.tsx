/** @jsx createElement */

import { createElement, render } from './jsx.ts'
import { useLink, useWait, usePipe, useMux } from './use.ts'
import type { PipeOutput } from './use.ts'

type GroupProps = { children: JSX.Children }
const Group = ({ children }: GroupProps) => <div class="group">{children}</div>

type IconButtonProps = { icon: string } & JSX.HTMLAttributes<HTMLButtonElement>
const IconButton = ({ icon, class: className, ...rest }: IconButtonProps) => (
  <button class={["material-icons", ...Array.isArray(className) ? className : className ? [className] : []]} {...rest}>
    {icon}
  </button>
)

type Item = { done: boolean, text: string }

type TODOItemProps = { onDelete: () => void, onToggle: () => void, onChange: (text: string) => void, item: Item }
async function* TODOItem({ onDelete, onToggle, onChange, item }: TODOItemProps) {
  let editing = false

  const View = () => <span onClick={() => { editing = true; update() }}>{item.text}</span>
  const Edit = () => {
    const [socket, plug] = useLink<HTMLInputElement>()
    async function save() {
      const input = await plug
      const { value } = input
      console.log(value)
      onChange(value)
      toggleEdit()
    }
    return (
      <span>
        <Group>
          <input value={item.text} socket={socket} onKeyDown={({ key }) => {
            switch (key) {
              case "Enter": save(); break;
              case "Escape": toggleEdit(); break;
            }
          }} />
          <IconButton icon="save" class="primary" onClick={save} />
          <IconButton icon="clear" class="secondary" onClick={toggleEdit} />
        </Group>
      </span>
    )
  }
  const [pause, update] = useWait()
  function toggleEdit() {
    editing = !editing
    update()
  }
  while (true) {
    yield (
      <li>
        <IconButton icon={item.done ? 'check_box' : 'check_box_outline_blank'} onClick={onToggle} />
        {
          editing
            ? <Edit />
            : <View />
        }
        <IconButton icon="delete" class="danger" onClick={onDelete} />
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
        onChange={(text) => { items[id].text = text }}
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
  const [socket, plug] = useLink<HTMLInputElement>()

  async function create() {
    const input = await plug
    const value = input.value
    input.value = ""
    addMessage(value)
  }

  return (
    <div class="todo">
      <header>deuce-x TODO demo</header>
      <main>
        <TODOList items={items} inputSource={messagePipe} onChange={items => localStorage.setItem(source, JSON.stringify(items))} />
      </main>
      <footer>
        <Group>
          <IconButton icon="filter_list" onClick={() => alert("not implemented")} class="secondary"/>
          <input type="text" socket={socket} onKeyDown={({ key }) => key === "Enter" && create()} />
          <IconButton icon="add" class="primary" onClick={create} />
        </Group>
      </footer>
    </div>
  )
}

const Load = async ({ child }: { child: JSX.Element }) => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
  return child
}

render(
  document.body,
  <Load child={<TODO source="todo" />} />
)
