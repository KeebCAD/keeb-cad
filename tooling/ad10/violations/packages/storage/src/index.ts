// Allowed: a non-kernel package imports di's root and reactive.
import '@keeb-cad/di'
import '@keeb-cad/reactive'
// only-editor-imports-di-vue.
import '@keeb-cad/di/vue'
// only-editor-ui-and-di-vue-import-vue.
import 'vue'
// only-reactive-imports-vue-reactivity: storage reaches it only through reactive.
import '@vue/reactivity'
