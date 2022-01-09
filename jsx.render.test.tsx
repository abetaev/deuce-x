/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="deno.ns" />
/** @jsx h */
/** @jsxFrag Fragment */

import { h, render, Fragment } from './jsx.ts'
import { useWait } from './use.ts'

import './jsx.render.mock.ts'

import { assertEquals, assertThrows, fail } from "https://deno.land/std@0.120.0/testing/asserts.ts";
const { test } = Deno

test("render simple components", () => {

  const StringComponent = ({ value }: { value: string }) => value
  const BooleanComponent = ({ value }: { value: boolean }) => value
  const NumberComponent = ({ value }: { value: number }) => value

  const root = document.createElement("container")

  render(root, (<>
    <StringComponent value="hello" />
    <BooleanComponent value={false} />
    <NumberComponent value={12345} />
  </>))

  assertEquals(root.childNodes.length, 3)
  assertEquals(root.childNodes[0].textContent, "hello")
  assertEquals(root.childNodes[1].textContent, "false")
  assertEquals(root.childNodes[2].textContent, "12345")

})

test("render static components", () => {

  const root = document.createElement("container")

  render(root, (
    <ul style={{ borderStyle: "solid", borderColor: "black", borderWidth: "1px" }}>
      <li class={["primary", "selected"]}>item 0</li>
      <li class="secondary">item 1</li>
      <li class="tertiary">item 2</li>
    </ul>
  ))

  assertEquals(root.childNodes.length, 1)
  const ul = root.childNodes[0] as Element
  assertEquals(ul.tagName, "UL")
  assertEquals(ul.childNodes.length, 3)
  assertEquals(ul.getAttribute("style"), "border-style: solid; border-color: black; border-width: 1px")
  const expectedClasses = ["primary selected", "secondary", "tertiary"]
  for (let i = 0; i < 3; i++) {
    const li = ul.childNodes[i] as Element
    assertEquals(li.tagName, "LI")
    assertEquals(li.textContent, `item ${i}`)
    assertEquals(li.getAttribute("class"), expectedClasses[i])
  }

})

test("render future component", async () => {

  const root = document.createElement("container")

  const FutureComponent = async ({ text, delay }: { text: string, delay: number }) => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return <div>{text}</div>
  }

  render(root, <FutureComponent text="hello from future" delay={5} />)

  assertEquals(root.childNodes.length, 0)

  await delay()

  assertEquals(root.childNodes.length, 1)
  const div = root.childNodes[0] as Element
  assertEquals(div.tagName, "DIV")
  assertEquals(div.childNodes.length, 1)
  assertEquals(div.childNodes[0].textContent, "hello from future")

})

test("render active component with return", async () => {
  const root = document.createElement("container")

  const ActiveComponent = async function* ({ lock, count }: { lock: () => Promise<void>, count: number }) {
    let i
    for (i = 0; i < count; i++) {
      if (i % 2)
        yield "odd"
      else
        yield
      await lock()
    }
    return i
  }

  const [wait, next] = useWait()
  render(root, <ActiveComponent lock={wait} count={10} />)

  await delay()

  let i
  for (i = 0; i < 10; i++) {
    if (i % 2) {
      assertEquals(root.childNodes.length, 1)
      assertEquals(root.childNodes[0].textContent, `odd`)
    } else {
      assertEquals(root.childNodes.length, 0)
    }
    next()
    await delay()
  }

  await delay()
  assertEquals(root.childNodes.length, 1)
  assertEquals(root.childNodes[0].textContent, `${i}`)
  next()
  await delay()
  assertEquals(root.childNodes.length, 1)
  assertEquals(root.childNodes[0].textContent, `${i}`)

})

test("render active component without return", async () => {
  const root = document.createElement("container")

  const ActiveComponent = async function* ({ lock, count }: { lock: () => Promise<void>, count: number }) {
    let i
    for (i = 0; i < count; i++) {
      yield i
      await lock()
    }
  }

  const [wait, next] = useWait()
  render(root, <ActiveComponent lock={wait} count={10} />)

  await delay()

  let i
  for (i = 0; i < 10; i++) {
    assertEquals(root.childNodes.length, 1)
    assertEquals(root.childNodes[0].textContent, `${i}`)
    next()
    await delay()
  }

  await delay()
  assertEquals(root.childNodes.length, 0)
  next()
  await delay()
  assertEquals(root.childNodes.length, 0)

})

test("try render undefined", () => {
  const root = document.createElement("container")

  const WrongComponent = (): JSX.Element => undefined as unknown as JSX.Element

  assertThrows(
    () => render(root, <WrongComponent />),
    Error,
    'unknown element: type="undefined", data="undefined"'
  )
})

const delay = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms))