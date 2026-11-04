import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'

import App from './App.vue'
import { createEditorRouter } from './router'

describe('App', () => {
  it('renders the empty editor shell', async () => {
    const router = createEditorRouter()
    await router.push('/')

    const screen = await render(App, { global: { plugins: [router] } })

    await expect.element(screen.getByTestId('editor-shell')).toBeVisible()
    await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('keeb-cad')
    await expect.element(screen.getByTestId('empty-editor')).toHaveTextContent('No design open.')
  })
})
