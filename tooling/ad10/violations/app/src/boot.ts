// Allowed for app's own files (its worker entries need them); main.ts reaches them only through here.
import '@keeb-cad/pipeline'
import '@keeb-cad/blueprint/worker'
import '@keeb-cad/case'
import 'quickjs-wasi'
