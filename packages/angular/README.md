# `@pillo/angular` — placeholder

> **Not yet published.** This package is **scaffolded but not implemented**. It
> exists to reserve the name and mark the seam a future Angular renderer will
> consume. The usage below is the **planned** API — none of it is installable or
> importable today. Track progress against [`../../MONOREPO-PLAN.md`](../../MONOREPO-PLAN.md).

## What it will be

`@pillo/angular` will be a thin renderer over [`@pillo/core`](../core), exactly
as [`pillo`](../react) (the React renderer) is today. The division of labour is
already fixed by the core extraction:

- **From `@pillo/core` (shared, unchanged):** the toast store, the imperative
  `pillo.*` API, `store.subscribe` / `store.getSnapshot` / `store.setConfig` /
  `store.registerToaster`, the constants, the portable types, and the
  stylesheet. The Angular service subscribes to the **same singleton store** the
  React `<Toaster />` uses.
- **In this package (Angular-specific):** a `Toaster` component that reads the
  store into signals and renders the pill, plus the duration / hover-pause
  scheduler re-implemented against Angular's change detection (the React
  renderer keeps its own copy — this timer state is intentionally per-renderer;
  see the monorepo plan §3).

Because the imperative API lives in core, **`pillo.success(...)` and friends are
byte-for-byte identical to the React package** — only the component and the slot
type differ.

## Planned usage

> ⚠️ Preview — reflects the intended API, subject to change, and **not shippable
> until this package is implemented.**

### Install

```bash
npm i @pillo/angular
```

### Register the stylesheet

The stylesheet is the same portable CSS the React package ships. Add it once —
either via `angular.json`:

```jsonc
// angular.json → projects.<app>.architect.build.options
"styles": [
  "src/styles.css",
  "node_modules/@pillo/angular/styles.css"
]
```

…or from a global stylesheet:

```css
/* src/styles.css */
@import "@pillo/angular/styles.css";
```

### Render a single `<pillo-toaster />` near the root

```ts
import { Component } from "@angular/core";
import { PilloToaster, pillo } from "@pillo/angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [PilloToaster],
  template: `
    <pillo-toaster position="top-right" />
    <button (click)="save()">Save</button>
  `,
})
export class AppComponent {
  save() {
    pillo.success("Saved");
  }
}
```

### Triggering toasts

The `pillo.*` API is imported from `@pillo/angular` (which re-exports it from
core) and behaves exactly as it does in React:

```ts
pillo.success("Saved");
pillo.error({ title: "Couldn't save", description: "Please try again." });
pillo.info("Heads up");

// Promises:
await pillo.promise(save(), {
  loading: "Saving…",
  success: "Saved!",
  error: (err) => `Failed: ${err}`,
});

// Update an existing toast:
const id = pillo.loading("Uploading…");
pillo.update(id, { type: "success", title: "Uploaded!" });
```

For custom content, Angular specializes the core slot type to
`string | TemplateRef<unknown> | Type<unknown>` (where React uses `ReactNode`):

```ts
import type { PilloOptions as CoreOptions } from "@pillo/core";
export type PilloOptions = CoreOptions<string | TemplateRef<unknown> | Type<unknown>>;
```

## Current status

This directory has **no `package.json`**, so it is inert: it is not a workspace
member and does not participate in `bun install`, builds, or tests. Making it a
real package — manifest, `Toaster` component, scheduler, tests, and workspace
wiring — is the work `/angular build` performs.

See [`../../MONOREPO-PLAN.md`](../../MONOREPO-PLAN.md) for the full plan.
