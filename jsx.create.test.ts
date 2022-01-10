/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="deno.ns" />
import { h } from './jsx.ts'

import { assert, assertEquals, assertStrictEquals, fail } from "https://deno.land/std@0.120.0/testing/asserts.ts";

const { test } = Deno

test("create simple element", () => {
  const element = h(() => "text", {})
  assertStrictEquals(element, "text")
})

test("create empty intrinsic element with some attributes", () => {
  const classValue = ["first", "second"]
  const styleValue = {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "black"
  }
  const element = h(
    "div", {
    class: classValue,
    style: styleValue
  })
  if (typeof element !== "object")
    fail('element is not an object')
  else if (element === null)
    fail('null element')
  else if (!("name" in element))
    fail('not an intrinsic element')
  else {
    assertEquals(element.name, "div")
    assertEquals(element.props, {
      class: classValue,
      style: styleValue
    })
    assertEquals(element.children, [])
  }
})

test("create empty future element with some props", async () => {
  const FutureComponent = async ({ delay, text }: { delay: number, text: string }) => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return text
  }

  const element = h(FutureComponent, { delay: 10, text: "this is expected with delay" })

  if (typeof element !== "object")
    fail('element is not an object')
  else if (element === null)
    fail('null element')
  else if (!("then" in element))
    fail('not a future element')
  else
    assertEquals(await element, "this is expected with delay")
})

test("create empty active element with some props", async () => {
  const element = h(async function* ({ delay, limit }: { delay: number, limit: number }) {
    let i
    for (i = 0; i < limit; i++) {
      yield i
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    return i
  }, { delay: 5, limit: 15 })
  if (typeof element !== "object")
    fail('element is not an object')
  else if (element === null)
    fail('null element')
  else if (!("next" in element))
    fail('not an iterator element')
  else {
    let i
    for (i = 0; i < 15; i ++) {
      const result = await element.next()
      assert(!result.done)
      assertEquals(result.value, i)
    }
    const result = await element.next()
    assert(result.done)
    assertEquals(result.value, i)
  }
})