# `@pillo/angular` — placeholder

This package is **scaffolded but not yet implemented**. It exists to reserve the
name and mark the seam that a future Angular renderer will consume.

## What it will do

`@pillo/angular` will be a thin renderer over [`@pillo/core`](../core), exactly
as [`pillo`](../react) (the React renderer) is today. The division of labour is
already fixed by the core extraction:

- **From `@pillo/core` (shared, unchanged):** the toast store, the imperative
  `pillo.*` API, `store.subscribe` / `store.getSnapshot` / `store.setConfig` /
  `store.registerToaster`, the constants, the portable types, and the
  stylesheet. The Angular service subscribes to the **same singleton store** the
  React `<Toaster />` uses.
- **In this package (Angular-specific):** a `Toaster` component/service that
  reads the store into signals and renders the pill, plus the duration /
  hover-pause scheduler re-implemented against Angular's change detection (the
  React renderer keeps its own copy — this timer state is intentionally
  per-renderer; see the monorepo plan §3).

Angular specializes the core slot type to
`string | TemplateRef<unknown> | Type<unknown>` (where React uses `ReactNode`):

```ts
import type { PilloOptions as CoreOptions } from "@pillo/core";
export type PilloOptions = CoreOptions<string | TemplateRef<unknown> | Type<unknown>>;
```

Because it has no `package.json` yet, this directory is inert: it is not a
workspace member and does not participate in `bun install`, builds, or tests.

See [`../../MONOREPO-PLAN.md`](../../MONOREPO-PLAN.md) for the full plan.
