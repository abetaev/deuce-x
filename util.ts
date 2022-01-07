
export const kebabize = (input: string) =>
  input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
