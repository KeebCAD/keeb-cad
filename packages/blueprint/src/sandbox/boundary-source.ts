// Runs before any blueprint code, in the VM. The host never reads guest values, so everything
// a lane can return or throw is turned into one JSON string here.
export const BOUNDARY_SOURCE = String.raw`(() => {
  'use strict'
  const parse = JSON.parse, stringify = JSON.stringify
  const isArray = Array.isArray, finite = Number.isFinite, same = Object.is
  const getPrototypeOf = Object.getPrototypeOf, hasOwn = Object.hasOwn
  const ownKeys = Reflect.ownKeys, describe = Object.getOwnPropertyDescriptor
  const freeze = Object.freeze, defineProperty = Object.defineProperty
  const objectPrototype = Object.prototype, arrayPrototype = Array.prototype
  const text = String, MakeFunction = Function, Refused = TypeError, OutOfMemory = InternalError

  const ALLOWED = new Set([
    'AggregateError', 'Array', 'ArrayBuffer', 'AsyncDisposableStack', 'BigInt', 'BigInt64Array',
    'BigUint64Array', 'Boolean', 'DataView', 'DisposableStack', 'Error', 'EvalError',
    'Float16Array', 'Float32Array', 'Float64Array', 'Function', 'Infinity', 'Int16Array',
    'Int32Array', 'Int8Array', 'Iterator', 'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object',
    'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set',
    'SharedArrayBuffer', 'String', 'SuppressedError', 'Symbol', 'SyntaxError', 'TypeError',
    'URIError', 'Uint16Array', 'Uint32Array', 'Uint8Array', 'Uint8ClampedArray', 'WeakMap',
    'WeakSet', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
    'eval', 'globalThis', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined',
    'unescape', 'use',
  ])

  for (const name of ownKeys(globalThis)) {
    if (!ALLOWED.has(name)) delete globalThis[name]
  }
  delete Math.random

  let hosts, factories
  let current, stage, op
  let open = false

  const sentinel = freeze({})
  let notExact
  function fail(path, reason) { notExact = { path, reason }; throw sentinel }

  function walk(value, path) {
    if (value === null) return 'null'
    if (value === true) return 'true'
    if (value === false) return 'false'
    if (typeof value === 'string') return stringify(value)
    if (typeof value === 'number') {
      if (!finite(value)) fail(path, text(value))
      if (same(value, -0)) fail(path, '-0')
      return stringify(value)
    }
    if (typeof value !== 'object') fail(path, typeof value)
    const array = isArray(value)
    const prototype = getPrototypeOf(value)
    if (array ? prototype !== arrayPrototype : prototype !== objectPrototype && prototype !== null)
      fail(path, 'not a plain object or array')
    const keys = ownKeys(value)
    let out = ''
    let index = 0
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (typeof key === 'symbol') fail(path, 'a symbol key')
      if (array && key === 'length') continue
      const where = array ? path + '[' + key + ']' : path + '.' + key
      const entry = describe(value, key)
      if (!hasOwn(entry, 'value')) fail(where, 'an accessor')
      if (!entry.enumerable) fail(where, 'not enumerable')
      if (array && key !== text(index)) fail(where, 'a sparse array or a non-index key')
      out += (index === 0 ? '' : ',') + (array ? '' : stringify(key) + ':') + walk(entry.value, where)
      index++
    }
    if (array) {
      if (value.length !== index) fail(path, 'a sparse array')
      return '[' + out + ']'
    }
    return '{' + out + '}'
  }

  function isOutOfMemory(error) {
    if (typeof error !== 'object' || error === null || !(error instanceof OutOfMemory)) return false
    const message = describe(error, 'message')
    return message !== undefined && message.value === 'out of memory'
  }

  // Guest code may run during a walk or a String() (a Proxy trap, a toString); no operation or
  // use() may be reached from there.
  function whileClosed(fn) {
    const wasOpen = open
    open = false
    try {
      return fn()
    } finally {
      open = wasOpen
    }
  }

  function encodeThrow(error) {
    return whileClosed(() => {
      try {
        if (isOutOfMemory(error)) return '{"outOfMemory":true}'
        return stringify({ failed: text(error).slice(0, 500) })
      } catch (inner) {
        if (isOutOfMemory(inner)) return '{"outOfMemory":true}'
        return '{"failed":"a thrown value could not be converted to text"}'
      }
    })
  }

  function encodeReturn(value) {
    return whileClosed(() => {
      notExact = undefined
      try {
        return '{"ok":' + walk(value, '$') + '}'
      } catch (error) {
        if (error === sentinel) return stringify({ notJsonExact: notExact })
        throw error
      }
    })
  }

  const REFUSED_INPUTS = '{"inputs":null}'

  // Answers {"inputs":...} or {"bad":<key>}; the host fails the run on either refusal, so a
  // caller that catches the throw still fails.
  function encodeInputs(inputs) {
    return whileClosed(() => {
      try {
        if (typeof inputs !== 'object' || inputs === null || isArray(inputs)) {
          return '{"inputs":' + walk(inputs, '$') + '}'
        }
        const prototype = getPrototypeOf(inputs)
        if (prototype !== objectPrototype && prototype !== null) return REFUSED_INPUTS
        let out = ''
        for (const key of ownKeys(inputs)) {
          if (typeof key === 'symbol') return REFUSED_INPUTS
          const entry = describe(inputs, key)
          if (!hasOwn(entry, 'value') || !entry.enumerable) return stringify({ bad: key })
          let part
          try {
            part = walk(same(entry.value, -0) ? 0 : entry.value, '$')
          } catch (error) {
            if (isOutOfMemory(error)) throw error
            return stringify({ bad: key })
          }
          out += (out === '' ? '' : ',') + stringify(key) + ':' + part
        }
        return '{"inputs":{' + out + '}}'
      } catch (error) {
        if (isOutOfMemory(error)) throw error
        return REFUSED_INPUTS
      }
    })
  }

  function laneOf(id) {
    const compiled = factories.get(id)
    if (compiled.error !== undefined) throw compiled.error
    return compiled.factory().lanes[stage]
  }

  function makeOp(names) {
    const made = {}
    for (const name of names) {
      made[name] = freeze((...args) => {
        if (!open) throw new Refused('an operation was called outside a running lane')
        return parse(hosts.call(name, stringify(args)))
      })
    }
    return freeze(made)
  }

  function use(id, inputs) {
    if (!open) throw new Refused('use() was called outside a running lane')
    const caller = current
    const inputsText = inputs === undefined ? '{"inputs":{}}' : encodeInputs(inputs)
    const begun = parse(
      hosts.nestedBegin(caller, typeof id === 'string' ? id : '', inputsText),
    )
    if (hasOwn(begun, 'error')) throw begun.error
    let answer
    current = id
    try {
      const value = laneOf(id)(freeze({ inputs: begun.inputs, pulls: {}, queries: {} }), op)
      answer = encodeReturn(value)
    } catch (error) {
      answer = encodeThrow(error)
    } finally {
      current = caller
    }
    const ended = parse(hosts.nestedEnd(id, answer))
    if (hasOwn(ended, 'error')) throw ended.error
    return ended.value
  }

  defineProperty(globalThis, 'use', { value: freeze(use), enumerable: false })

  const hidden = [
    function* () {},
    (function* () {})(),
    async function () {},
    async function* () {},
    (async function* () {})(),
    [][Symbol.iterator](),
    new Map()[Symbol.iterator](),
    new Set()[Symbol.iterator](),
    ''[Symbol.iterator](),
    /a/[Symbol.matchAll](''),
    [].values().map((x) => x),
    Iterator.from({ next() { return { done: true } } }),
    Iterator.concat(),
    OutOfMemory,
  ]

  // Both are accessors whose setters keep state in the engine, across runs.
  delete Error.prepareStackTrace
  delete Error.stackTraceLimit

  // A frozen message or name on an error prototype would make every later assignment of an
  // error's own message or name fail (the override mistake), and subclasses do exactly that.
  const errorConstructors = [
    Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError,
    AggregateError, SuppressedError, OutOfMemory,
  ]
  for (const { prototype: proto } of errorConstructors) {
    for (const key of ['message', 'name']) {
      const entry = describe(proto, key)
      const value = entry.value
      defineProperty(proto, key, {
        get() { return value },
        set(next) {
          if (this === proto) throw new Refused('an error prototype is frozen')
          defineProperty(this, key, { value: next, writable: true, enumerable: false, configurable: true })
        },
        enumerable: entry.enumerable,
        configurable: false,
      })
    }
  }

  const seen = new Set()
  const pending = [globalThis, ...hidden]
  while (pending.length > 0) {
    const object = pending.pop()
    if (object === null || (typeof object !== 'object' && typeof object !== 'function')) continue
    if (seen.has(object)) continue
    seen.add(object)
    freeze(object)
    pending.push(getPrototypeOf(object))
    for (const key of ownKeys(object)) {
      const entry = describe(object, key)
      if (hasOwn(entry, 'value')) pending.push(entry.value)
      else pending.push(entry.get, entry.set)
    }
  }
  Object.preventExtensions(globalThis)

  return (call, nestedBegin, nestedEnd, scriptsText) => {
    hosts = { call, nestedBegin, nestedEnd }
    factories = new Map()
    for (const entry of parse(scriptsText)) {
      try {
        factories.set(entry.id, {
          factory: MakeFunction("'use strict';\nreturn (" + entry.script + "\n)"),
        })
      } catch (error) {
        factories.set(entry.id, { error: text(error).slice(0, 500) })
      }
    }

    return (id, stageName, argsText, operationNamesText) => {
      current = id
      stage = stageName
      open = true
      try {
        op = makeOp(parse(operationNamesText))
        const value = laneOf(id)(parse(argsText), op)
        open = false
        return encodeReturn(value)
      } catch (error) {
        return encodeThrow(error)
      } finally {
        open = false
        current = undefined
      }
    }
  }
})()`
