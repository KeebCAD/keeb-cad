import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the empty editor shell', async () => {
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('[data-testid="editor-shell"]').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('keeb-cad')
    expect(wrapper.find('[data-testid="empty-editor"]').text()).toBe('No design open.')
  })
})
