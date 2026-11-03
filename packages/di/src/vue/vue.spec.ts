import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'

import { Container } from '../container'
import { MissingInjectorProviderError } from '../errors'
import { InjectorToken } from '../injector'
import { createMultiToken, createToken } from '../token'
import { provideInjector, useInjector, useService } from './index'

function makeContainer() {
  const c = new Container()
  return { c, injector: c.resolve(InjectorToken) }
}

describe('provideInjector + useService', () => {
  it('resolves a single-binding service inside a child component', async () => {
    const { c, injector } = makeContainer()
    const t = createToken<string>('Greeting')
    c.register(t).useValue('hello')

    const Child = defineComponent({
      setup() {
        const greet = useService(t)
        return () => h('p', greet)
      },
    })

    const Root = defineComponent({
      setup() {
        provideInjector(injector)
        return () => h(Child)
      },
    })

    const screen = await render(Root)
    await expect.element(screen.getByText('hello')).toBeInTheDocument()
  })

  it('resolves a multi-binding service to an array', async () => {
    const { c, injector } = makeContainer()
    const t = createMultiToken<string>('Items')
    c.register(t).useValue('a')
    c.register(t).useValue('b')

    const Child = defineComponent({
      setup() {
        const items = useService(t)
        return () => h('p', items.join(','))
      },
    })

    const Root = defineComponent({
      setup() {
        provideInjector(injector)
        return () => h(Child)
      },
    })

    const screen = await render(Root)
    await expect.element(screen.getByText('a,b')).toBeInTheDocument()
  })

  it('throws when useService runs without a provided injector', async () => {
    const t = createToken<string>('X')
    const Bad = defineComponent({
      setup() {
        useService(t)
        return () => h('div')
      },
    })
    await expect(render(Bad)).rejects.toThrow(MissingInjectorProviderError)
  })
})

describe('useInjector', () => {
  it('returns the provided injector', async () => {
    const { injector } = makeContainer()
    let captured: unknown
    const Child = defineComponent({
      setup() {
        captured = useInjector()
        return () => h('div')
      },
    })
    const Root = defineComponent({
      setup() {
        provideInjector(injector)
        return () => h(Child)
      },
    })
    await render(Root)
    expect(captured).toBe(injector)
  })
})
