// Empty stand-in for @types/node in the browser project (tsconfig.json `typeRoots`). makerjs's
// @types/pdfkit and @types/fontkit write `/// <reference types="node" />`, which would otherwise
// put Node globals (`process`, `Buffer`) into src/. Node code is typed by scripts/tsconfig.json.
export {}
