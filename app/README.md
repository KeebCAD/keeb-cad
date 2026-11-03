# @keeb-cad/app

The composition package (AD-10, AD-25): the four thread entries and their wiring. Nothing imports it.

- `src/main.ts`: the main thread's entry; mounts the editor (`@keeb-cad/editor`).
- `src/model.worker.ts`, `src/case.worker.ts`, `src/routing.worker.ts`: the worker entries, stubs until the workers are spawned.

dependency-cruiser fences each entry's own module graph (`.dependency-cruiser.mts`). It is one package in the keeb-cad pnpm workspace, so run every command from the repo root.

## Setup

```sh
pnpm install
```

## Check

```sh
pnpm check
```

This runs typecheck, lint, format check, depcruise (AD-10), unit tests, build and the Playwright smoke test (Chromium, against `vite preview` on port 4173) for the whole workspace.

`pnpm install` sets up a pre-commit hook that runs the fast part (`pnpm check:fast`: lint, format check, depcruise).

Neither fixes anything. To fix:

```sh
pnpm lint:fix  # eslint --fix
pnpm format    # prettier --write
```

## Run the app

```sh
pnpm --filter @keeb-cad/app dev      # dev server
pnpm --filter @keeb-cad/app preview  # serve the production build (run `pnpm build` first)
```
