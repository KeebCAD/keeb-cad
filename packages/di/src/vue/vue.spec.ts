import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type Component, defineComponent, h } from 'vue'

import { Container } from '../container'
import { MissingInjectorProviderError } from '../errors/missing-injector-provider-error'
import { InjectorToken } from '../injector-token'
import { createMultiToken, createToken } from '../token'
import { provideInjector, useInjector, useService } from './index'

import type { Injector } from '../types'

const providing = (injector: Injector, child: Component) =>
  defineComponent({
    setup() {
      provideInjector(injector)
      return () => h(child)
    },
  })

describe('provideInjector + useService', () => {
  it('resolves a single-binding service inside a child component', async () => {
    const c = new Container()
    const injector = c.resolve(InjectorToken)
    const t = createToken<string>('Greeting')
    c.register(t).useValue('hello')

    const Child = defineComponent({
      setup() {
        const greet = useService(t)
        return () => h('p', greet)
      },
    })

    const screen = await render(providing(injector, Child))
    await expect.element(screen.getByText('hello')).toBeInTheDocument()
  })

  it('resolves a multi-binding service to an array', async () => {
    const c = new Container()
    const injector = c.resolve(InjectorToken)
    const t = createMultiToken<string>('Items')
    c.register(t).useValue('a')
    c.register(t).useValue('b')

    const Child = defineComponent({
      setup() {
        const items = useService(t)
        return () => h('p', items.join(','))
      },
    })

    const screen = await render(providing(injector, Child))
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
    await expect(render(Bad)).rejects.toThrow(new MissingInjectorProviderError())
  })
})

describe('useInjector', () => {
  it('returns the provided injector', async () => {
    const injector = new Container().resolve(InjectorToken)
    let captured: unknown
    const Child = defineComponent({
      setup() {
        captured = useInjector()
        return () => h('div')
      },
    })
    await render(providing(injector, Child))
    expect(captured).toBe(injector)
  })
})
