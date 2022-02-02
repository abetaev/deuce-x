/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="ES2021" />
/// <reference path="./jsx.defs.ts" />

export type EventOutput<T> = (handler: EventInput<T>) => () => void
export type EventInput<T> = (event: T) => void
export function useEvent<T>(): [EventInput<T>, EventOutput<T>] {
  const subscriptions: EventInput<T>[] = []
  return [
    (event) => Promise.resolve().then(() => subscriptions.forEach(handle => handle(event))),
    (handler) => {
      subscriptions.push(handler)
      return () => subscriptions.splice(subscriptions.indexOf(handler), 1)
    }
  ]
}

type WaitLock = () => Promise<void>
type WaitOpen = () => void
export function useWait(): [WaitLock, WaitOpen] {
  let release = () => { }
  return [
    () => new Promise(resolve => release = resolve),
    () => release()
  ]
}

export type PipeOutput<T> = () => AsyncIterable<T>
export type PipeInput<T> = (event: T) => void
export function usePipe<T>(): [PipeInput<T>, PipeOutput<T>, () => void] {
  const [send, onReceive] = useEvent<T>()
  const [lock, open] = useWait()
  let live = true
  return [
    send,
    async function* () {
      let value: T | undefined = undefined
      onReceive(newValue => {
        value = newValue
        open()
      })
      while (live) {
        await lock()
        yield value as unknown as T
      }
    },
    () => { live = false }
  ]
}

export type PipeMuxSource<T> = { [name in keyof T]: PipeOutput<T[name]> }
export type PipeMuxTarget<T> = PipeOutput<{ [K in keyof T]: { type: K, value: T[K] } }[keyof T]>
export function muxPipes<T>(input: PipeMuxSource<T>): [PipeMuxTarget<T>, () => void] {
  const [send, target, close] = usePipe<{ type: keyof T, value: T[keyof T] }>()
  let live = true
  Object.keys(input)
    .map(name => name as keyof T)
    .forEach(async (type) => {
      for await (const value of input[type]())
        if (live) send({ type, value })
        else return
    })
  return [target, () => { live = false; close() }]
}

export type EventMuxSource<T> = { [name in keyof T]: EventOutput<T[name]> }
export type EventMuxTarget<T> = EventOutput<{ [K in keyof T]: { type: K, value: T[K] } }[keyof T]>
export function muxEvents<T>(input: EventMuxSource<T>): EventMuxTarget<T> {
  const [send, target] = useEvent<{ type: keyof T, value: T[keyof T] }>()
  const closeHandlers: (() => void)[] = []
  Object.keys(input)
    .map(name => name as keyof T)
    .forEach((type) => {
      closeHandlers.push(input[type](value => send({ type, value })))
    })
  return (handler) => {
    const close = target(handler)
    return () => {
      close()
      closeHandlers.forEach(close => close())
    }
  }
}

export function useLink<T extends HTMLElement>(): [JSX.Socket<T>, Promise<T>] {
  let socket: JSX.Socket<T> | undefined = undefined
  const plug = new Promise<T>(resolve => socket = resolve)
  if (!socket) throw 'unable to create link'
  return [socket, plug]
}
