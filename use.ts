/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="ES2021" />
/// <reference path="./jsx.defs.ts" />

type Desctructor = () => void

export type Sender<T> = (value: T) => void
export type Handler<T> = Sender<T>
export type Output<T> = () => AsyncIterable<T>

export type Subscriptor<T> = (handler: Handler<T>) => Desctructor
export function useEvent<T>(): [Sender<T>, Subscriptor<T>] {
  const subscriptions: Sender<T>[] = []
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

export function usePipe<T>(source?: [Sender<T>, Subscriptor<T>]): [Sender<T>, Output<T>, Desctructor] {
  const [send, onReceive] = source ? source : useEvent<T>()
  const [lock, open] = useWait()
  let live = true
  return [
    send,
    async function* () {
      let value: T | undefined = undefined
      const unsubscribe = onReceive(newValue => {
        value = newValue
        open()
      })
      while (live) {
        await lock()
        if (value !== undefined) yield value
      }
      unsubscribe()
    },
    () => { live = false }
  ]
}

export function useStream<T>(source?: [Sender<T>, Subscriptor<T>]): [Sender<T>, Output<T>, Desctructor] {
  const [send, onReceive] = source ? source : useEvent<T>()
  const [lock, open] = useWait()
  let live = true
  return [
    send,
    async function* () {
      let buffer: T[] = []
      const unsubscribe = onReceive(newValue => {
        buffer.push(newValue)
        open()
      })
      while (live) {
        if (!buffer.length) await lock()
        yield buffer.splice(0, 1)[0]
      }
      unsubscribe()
    },
    () => { live = false }
  ]
}

export type OutputMuxSource<T> = { [name in keyof T]: Output<T[name]> }
export type OutputMuxTarget<T> = Output<{ [K in keyof T]: { type: K, value: T[K] } }[keyof T]>
export function muxPipes<T>(input: OutputMuxSource<T>): [OutputMuxTarget<T>, () => void] {
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

export type SubscriptionMuxSource<T> = { [name in keyof T]: Subscriptor<T[name]> }
export type SubscriptionMuxTarget<T> = Subscriptor<{ [K in keyof T]: { type: K, value: T[K] } }[keyof T]>
export function muxEvents<T>(input: SubscriptionMuxSource<T>): SubscriptionMuxTarget<T> {
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
