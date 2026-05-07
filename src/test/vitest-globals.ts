type GlobalApi = (...args: any[]) => any

type MockFunction = GlobalApi & {
  mock: { calls: unknown[][] }
  mockImplementation: (implementation: GlobalApi) => MockFunction
  mockReturnValue: (value: unknown) => MockFunction
  mockRestore: () => void
}

const getGlobalApi = (name: string, required = true): GlobalApi => {
  const api = (globalThis as unknown as Record<string, unknown>)[name]
  if (typeof api !== 'function') {
    if (!required) {
      return (() => {
        throw new Error(`[vitest-globals] Optional Vitest global API "${name}" is not available.`)
      }) as GlobalApi
    }
    throw new Error(
      `[vitest-globals] Vitest global API "${name}" is not available. Enable test.globals in vite.config.ts.`
    )
  }
  return api as GlobalApi
}

const createMockFunction = (initialImplementation?: GlobalApi): MockFunction => {
  let implementation = initialImplementation
  const mock = ((...args: unknown[]) => {
    mock.mock.calls.push(args)
    return implementation?.(...args)
  }) as MockFunction

  mock.mock = { calls: [] }
  mock.mockImplementation = (nextImplementation: GlobalApi) => {
    implementation = nextImplementation
    return mock
  }
  mock.mockReturnValue = (value: unknown) => {
    implementation = () => value
    return mock
  }
  mock.mockRestore = () => undefined

  return mock
}

const fallbackVi = {
  fn: createMockFunction,
  spyOn: (target: Record<string, any>, property: string) => {
    const original = target[property]
    const mock = createMockFunction(
      typeof original === 'function' ? original.bind(target) : () => original
    )
    mock.mockRestore = () => {
      target[property] = original
    }
    target[property] = mock
    return mock
  },
  clearAllMocks: () => undefined,
  restoreAllMocks: () => undefined,
}

const globalVi = (globalThis as unknown as { vi?: typeof fallbackVi }).vi

export const suite = getGlobalApi('suite', false)
export const test = getGlobalApi('test')
export const describe = getGlobalApi('describe')
export const it = getGlobalApi('it')
export const expect = getGlobalApi('expect')
export const assert = getGlobalApi('assert', false)
export const vitest = globalVi ?? fallbackVi
export const vi = globalVi ?? fallbackVi
export const beforeAll = getGlobalApi('beforeAll')
export const afterAll = getGlobalApi('afterAll')
export const beforeEach = getGlobalApi('beforeEach')
export const afterEach = getGlobalApi('afterEach')
