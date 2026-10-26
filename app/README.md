# @keeb-cad/editor

The keeb-cad editor app (Vue 3 + Vite). It is one package in the keeb-cad pnpm workspace, so run every command from the repo root.

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
pnpm --filter @keeb-cad/editor dev      # dev server
pnpm --filter @keeb-cad/editor preview  # serve the production build (run `pnpm build` first)
```
