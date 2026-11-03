// Restore order: everything is "tidied" back with a quick reverse animation (about half a second) before Calm returns.
// Skipped under reduced motion, and never run twice at once.
export function tidyThen(done: () => void) {
  const root = document.documentElement
  if (root.classList.contains('tidy') || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return }
  root.classList.add('tidy')
  window.setTimeout(() => { root.classList.remove('tidy'); done() }, 520)
}
