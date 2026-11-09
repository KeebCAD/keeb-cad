export type ViteManifest = Readonly<
  Record<string, { file: string; imports?: string[]; dynamicImports?: string[] }>
>
