import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Integration suites render real components, so the DOM has to exist before
// react-dom or any test module is imported.
const nodeTimers = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
}

GlobalRegistrator.register({ url: 'http://localhost/' })

// happy-dom swaps in the DOM timer signatures, which return a plain number.
// Vite's dev server calls `.unref()` on its handles, so Node's timers have to
// win — React and Testing Library are happy with either.
Object.assign(globalThis, nodeTimers)
