
export const kebabize = (input: string) =>
  input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()

export const delay = (ms = 4) =>
  new Promise(resolve => setTimeout(resolve, ms))