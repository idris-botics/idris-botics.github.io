// Secrets that were solved with the help of a spoiler keep a SOLVED WITH HELP stamp in the achievements list for the rest of the visit.
const helped = new Set<string>()
export const markHelped = (id: string) => { helped.add(id) }
export const isHelped = (id: string) => helped.has(id)
