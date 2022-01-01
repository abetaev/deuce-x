type DataOutput<TEvent> = (handler: DataInput<TEvent>) => () => void
type DataInput<TEvent> = (event: TEvent) => void
function useData<TEvent>(): [DataInput<TEvent>, DataOutput<TEvent>] {
  let subscriptions: DataInput<TEvent>[] = []
  return [
    (event) => subscriptions.forEach(handle => handle(event)),
    (handler) => {
      subscriptions.push(handler)
      return () => subscriptions = subscriptions.filter(that => that !== handler)
    }
  ]
}

type WaitLock = () => Promise<void>
type WaitOpen = () => void
function useWait(): [WaitLock, WaitOpen] {
  let release = () => { }
  return [
    () => new Promise(resolve => release = resolve),
    () => release()
  ]
}

export type PipeOutput<T> = () => AsyncIterable<T>
export type PipeInput<T> = (event: T) => void
export function usePipe<T>(): [PipeInput<T>, PipeOutput<T>] {
  const [send, onReceive] = useData<T>()
  return [
    send,
    async function* () {
      const [lock, open] = useWait()
      let value: T | undefined = undefined
      onReceive(newValue => {
        value = newValue
        open()
      })
      while (true) {
        await lock()
        if (value !== undefined) yield value
      }
    }
  ]
}

export type MuxSource<T> = { [name in keyof T]: PipeOutput<T[name]> }
export type MuxTarget<T> = PipeOutput<{ [K in keyof T]: { type: K, value: T[K] } }[keyof T]>
export function useMux<T>(input: MuxSource<T>): MuxTarget<T> {
  const [send, target] = usePipe<{ type: keyof T, value: T[keyof T] }>()
  Object.keys(input)
    .map(name => name as keyof T)
    .forEach(async (type) => {
      for await (const value of input[type]())
        send({ type, value })
    })
  return target
}

