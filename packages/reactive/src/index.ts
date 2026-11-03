// The one file that imports @vue/reactivity (AD-10). The recompute trace joins it in its own story.
// `reactive` is Vue-free on purpose: only editor, ui and di/vue import `vue` (AD-10).
// eslint-disable-next-line vue/prefer-import-from-vue
export * from '@vue/reactivity'
