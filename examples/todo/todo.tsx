/** @jsx createElement */
/** @jsxFrag Fragment */

import { createElement, render } from '../../jsx.ts'
import { useLink, useWait, usePipe, muxPipes } from '../../use.ts'
import type { PipeOutput } from '../../use.ts'
import { Fragment } from '../../cmp.tsx'

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

  const View = () => <div onClick={() => { editing = true; update() }}>{item.text}</div>
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
      <>
        <input value={item.text} socket={socket} onKeyDown={({ key }) => {
          switch (key) {
            case "Enter": save(); break;
            case "Escape": toggleEdit(); break;
          }
        }} size={1} />
        <IconButton icon="save" class="primary" onClick={save} />
        <IconButton icon="clear" class="secondary" onClick={toggleEdit} />
      </>
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
        <Group>
          <IconButton icon={item.done ? 'check_box' : 'check_box_outline_blank'} onClick={onToggle} />
          {
            editing
              ? <Edit />
              : <View />
          }
          <IconButton icon="delete" class="danger" onClick={onDelete} />
        </Group>
      </li>
    )
    await pause()
  }
}


type TODOListProps = {
  items: Item[],
  onChange: (items: Item[]) => void,
  inputSource: PipeOutput<string>,
  filterSource: PipeOutput<{ type: "search", query: string } | { type: "status", query?: boolean }>
}
async function* TODOList({ items, onChange, inputSource, filterSource }: TODOListProps) {

  const [remove, removeSource] = usePipe<number>()
  const [toggle, toggleSource] = usePipe<number>()

  const [eventSource] = muxPipes({
    remove: removeSource,
    input: inputSource,
    toggle: toggleSource,
    filter: filterSource
  })

  let searchFilter = ""
  let statusFilter: boolean | undefined = undefined


  const List = () => (
    <ul>
      {items.filter(({text}) => text.toLowerCase().includes(searchFilter))
        .filter(({done}) => statusFilter === undefined || (!!done === statusFilter))
        .map((item, id) => <TODOItem
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
      case "filter":
        switch (message.value.type) {
          case "search": searchFilter = message.value.query; break;
          case "status": statusFilter = message.value.query; break;
        }
        break;
    }
    onChange(items)
    yield <List />
  }

}

type TODOProps = { source: string }
const TODO = ({ source }: TODOProps) => {
  const items: Item[] = JSON.parse(localStorage.getItem(source) || "[]")
  const [addTODO, todoPipe] = usePipe<string>()
  const [filterTODO, filterPipe] = usePipe<{ type: "search", query: string } | { type: "status", query?: boolean }>()
  const [inputSocket, inputPlug] = useLink<HTMLInputElement>()
  const [searchFilterSocket, searchFilterPlug] = useLink<HTMLInputElement>()
  const [statusFilterSocket, statusFilterPlug] = useLink<HTMLButtonElement>()

  async function create() {
    const input = await inputPlug
    const value = input.value
    input.value = ""
    addTODO(value)
  }

  async function searchFilter() {
    const input = await searchFilterPlug
    filterTODO({ type: "search", query: input.value })
  }

  async function switchStatusFilter() {
    const button = await statusFilterPlug
    switch (button.innerText) {
      case "indeterminate_check_box":
        button.innerText = "check_box"
        filterTODO({ type: "status", query: true })
        break;
      case "check_box":
        button.innerText = "check_box_outline_blank"
        filterTODO({ type: "status", query: false })
        break;
      case "check_box_outline_blank":
        button.innerText = "indeterminate_check_box"
        filterTODO({ type: "status" })
        break;
    }
  }

  return (
    <div class="todo">
      <header>
        <Group>
          <IconButton icon="indeterminate_check_box" class="secondary" onClick={switchStatusFilter}
            socket={statusFilterSocket} />
          <input type="text" socket={searchFilterSocket} onInput={searchFilter} placeholder="type to search for memo" />
          <IconButton
            icon="clear" class="danger"
            onClick={async () => { (await searchFilterPlug).value = ""; searchFilter() }} />
        </Group>
      </header>
      <main>
        <TODOList items={items}
          inputSource={todoPipe}
          filterSource={filterPipe}
          onChange={items => localStorage.setItem(source, JSON.stringify(items))}
        />
      </main>
      <footer>
        <Group>
          <input type="text" socket={inputSocket} onKeyDown={({ key }) => key === "Enter" && create()} size={1} />
          <IconButton icon="add" class="primary" onClick={create} />
        </Group>
      </footer>
    </div>
  )
}

render(
  document.body,
  <TODO source="todo" />
)
