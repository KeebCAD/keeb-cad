// Allowed: a non-kernel package imports di's root, reactive and result's root.
import '@keeb-cad/di'
import '@keeb-cad/reactive'
import '@keeb-cad/result'
// only-editor-imports-di-vue.
import '@keeb-cad/di/vue'
// only-editor-ui-and-di-vue-import-vue.
import 'vue'
// only-reactive-imports-vue-reactivity: storage reaches it only through reactive.
import '@vue/reactivity'
// only-tests-import-testing.
import '@keeb-cad/result/testing'
import '@keeb-cad/schema/testing'
// only-storage-browser-imports-dexie: outside the browser backend.
import 'dexie'
