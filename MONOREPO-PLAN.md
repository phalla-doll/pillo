# Pillo → Monorepo Restructure & `@pillo/core` Extraction

A concrete plan to split the current React-only package into a monorepo with a
framework-agnostic core, so that `@pillo/react` (today's package) and a future
`@pillo/angular` share one store, one imperative API, and one stylesheet.

> Status: draft / proposal. No code moved yet. This describes the target layout
> and the exact seam along which the current `src/` splits.

---

## 1. Why this split works

The current source already has a clean seam. The **state core has zero React in
it** and the **styling is 100% portable CSS**:

| Current file | Contents | Framework coupling | Destination |
|--------------|----------|--------------------|-------------|
| `src/toast.tsx` L62–320 | `store` object + `pillo.*` API | **None** (plain TS, `Set` listeners, `setTimeout`) | `core` |
| `src/toast.tsx` L36–43, L60, L115 | `PilloItem`, `PilloListener`, `timeoutKey` — store-adjacent defs outside the block above | **None** (but `PilloItem extends PilloOptions`, so it takes the same `<Slot>` generic as §4) | `core` |
| `src/toast.tsx` L356–637 | `Toaster` React component | React hooks + JSX | `react` |
| `src/pillo.tsx` | `Pillo` / `CustomPillo` render | React + `motion/react` | `react` |
| `src/styles.css` | All visuals, `data-*` driven | **None** | `core` |
| `src/constants.ts` | Layout / timing / spring | **None** | `core` |
| `src/types.ts` | Public types | Only `ReactNode` | **split** (see §4) |
| `src/icons.tsx` | Inline SVG icons | JSX (trivial) | per-package |

The rule of the split: **everything that ends in a `store.emit()` is core;
everything that reads the store to produce DOM is a renderer.**

---

## 2. Target layout

```
pillo/                          # repo root (workspace)
├── package.json                # private root, workspaces + scripts
├── tsconfig.base.json          # shared compiler options
├── biome.json                  # shared lint/format (moved from implicit)
├── vitest.workspace.ts         # runs each package's tests
├── packages/
│   ├── core/                   # @pillo/core   — no framework
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── store.ts        # ← toast.tsx L58–320 (store + pillo API)
│   │   │   │                   #   + PilloItem (L36–43), PilloListener (L60),
│   │   │   │                   #     timeoutKey (L115)
│   │   │   ├── constants.ts    # ← src/constants.ts (verbatim)
│   │   │   ├── types.ts        # ← src/types.ts minus ReactNode (see §4)
│   │   │   ├── id.ts           # ← generateId / idCounter (toast.tsx L106–113)
│   │   │   └── index.ts        # public core exports
│   │   ├── styles.css          # ← src/styles.css (verbatim)
│   │   └── tests/
│   │       └── store.test.ts   # framework-free store/API assertions
│   │
│   ├── react/                  # @pillo/react  — today's package
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── Toaster.tsx      # ← toast.tsx L322–637
│   │   │   ├── pillo.tsx        # ← src/pillo.tsx (unchanged)
│   │   │   ├── icons.tsx        # ← src/icons.tsx
│   │   │   └── index.ts         # re-exports core API + React components
│   │   └── tests/
│   │       └── pillo.test.tsx   # ← current tests/ (React-level only)
│   │
│   └── angular/                # @pillo/angular — new (separate effort)
│       └── …                   # see companion Angular plan
│
└── playground/                 # stays; depends on @pillo/react via workspace
```

`@pillo/angular` is scaffolded here but implemented separately — this document
only guarantees the core seam it will consume.

---

## 3. `store.ts` — the extraction (the important part)

Move `toast.tsx` **L58–320** into `packages/core/src/store.ts` **essentially
unchanged**. It is already framework-free. The only edits:

1. **Drop the `"use client"` banner** — meaningless outside React/Next.
   The banner is NOT deleted from the project: `packages/react/src/Toaster.tsx`
   and `pillo.tsx` keep it (bunchee preserves directives per entry). Without it,
   Next.js App Router consumers break.
2. **Move `ReactNode`-typed fields behind a generic slot** (see §4) so `custom`,
   `description`, and `icon` don't import React.
3. **Export the store handle** so renderers can subscribe:

```ts
// packages/core/src/store.ts
export interface PilloStore {
  subscribe(fn: PilloListener): () => void;   // returns unsubscribe
  getSnapshot(): PilloItem[];                  // for initial read
  // position/options are set by whichever Toaster is mounted
  setConfig(cfg: { position?: PilloPosition; options?: Partial<PilloOptions> }): void;
  registerToaster(): () => void;               // ← toasterCount inc/dec + dev warn
}

export const store: PilloStore;                // singleton
export const pillo;                            // the imperative API, verbatim
```

`subscribe` wraps the existing `listeners.add/delete` (currently done inline in
the React `Toaster` at L423–432). `registerToaster()` wraps the
`toasterCount`/dev-warning effect (L387–397). Extracting these two means the
React `Toaster` shrinks and the Angular service calls the **same** functions.

Everything else in that block — `dismissToast`, `resolveAutopilot`,
`mergeOptions`, `buildPilloItem`, `createToast`, `updateToast`, the `pillo`
object, `clear`, exit-timer bookkeeping — moves with **no logic changes**.

Three store-adjacent definitions sit *outside* L62–320 but are required by the
store and move with it:

- `PilloItem` (L36–43) — the store's item shape. It `extends PilloOptions`, so
  it becomes `PilloItem<Slot = unknown>` per §4. The React package re-exports
  `PilloItem<ReactNode>` if it needs the concrete type.
- `PilloListener` (L60) and `timeoutKey` (L115) — go into `store.ts` as-is.
- `PilloPromiseOptions` (L235–241) is already inside the moved range, but call
  it out explicitly as a **public core export** — it's part of the `pillo.promise`
  API surface, not an internal.

### What stays in the React `Toaster` (does NOT move to core)

These are genuinely view-layer and remain in `@pillo/react`:

- duration scheduling / hover-pause (`schedule`, `pause`, `resume`, L399–462) —
  **note:** this is per-Toaster timer state, correctly framework-specific, and
  the Angular Toaster will re-implement the same logic against signals.
- `activeId` / `latest` tracking (L471–519)
- viewport offset styles, Esc-to-dismiss, theme resolution (L521–637)

> Decision point: the duration/hover-pause scheduler is duplicated logic between
> React and Angular. **Recommended:** leave it in each renderer for now (it's
> tightly coupled to hover/focus DOM events); revisit hoisting it into core as a
> framework-neutral `TimerController` only if a third renderer appears.

---

## 4. Types: abstracting `ReactNode`

`src/types.ts` is portable except `ReactNode` on `description`, `icon`, and the
`PilloCustomRender` return. Introduce a **generic slot type** in core:

```ts
// packages/core/src/types.ts
// `Slot` is whatever a given renderer accepts as embeddable content.
// React specializes it to ReactNode; Angular to string | TemplateRef | Type.
export interface PilloOptions<Slot = unknown> {
  id?: string;
  title?: string;
  description?: Slot;
  type?: PilloState;
  position?: PilloPosition;
  duration?: number | null;
  icon?: Slot;
  styles?: PilloStyles;
  fill?: string;
  roundness?: number;
  autopilot?: false | { expand?: number; collapse?: number };
  button?: PilloButton;
  custom?: PilloCustomRender<Slot>;
}

export type PilloCustomRender<Slot = unknown> =
  (props: PilloCustomRenderProps) => Slot;
```

Then each renderer re-exports a specialized alias so consumers keep a clean API:

```ts
// packages/react/src/index.ts
import type { ReactNode } from "react";
import type { PilloOptions as CoreOptions } from "@pillo/core";
export type PilloOptions = CoreOptions<ReactNode>;
```

`PilloState`, `PilloStyles`, `PilloButton`, `PilloPosition`,
`PILLO_POSITIONS`, `PilloCustomRenderProps` (just `{ id, dismiss }`) are all
already framework-free and move to core unchanged.

The store internally treats slots as opaque (`unknown`) — it never inspects
`description`/`icon`/`custom`, only passes them through — so this is a pure
type-level change with no runtime impact.

---

## 5. Package manifests

### Root `package.json`

```jsonc
{
  "name": "pillo-workspace",
  "private": true,
  "workspaces": ["packages/*", "playground"],
  "scripts": {
    "build": "bun run --filter='./packages/*' build",
    "typecheck": "bun run --filter='*' typecheck",
    "test": "vitest run"
  },
  "devDependencies": { "typescript": "^5.5.0", "vitest": "^2.1.0" /* … */ }
}
```

### `packages/core/package.json`

Framework-free, no peer deps. Ships JS + types + the stylesheet.

```jsonc
{
  "name": "@pillo/core",
  "version": "0.4.0",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js",
           "types": "./dist/index.d.ts" },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": { "build": "bunchee && cp src/styles.css dist/styles.css" }
  // NOTE: no react, no motion here.
}
```

### `packages/react/package.json`

Today's manifest, with two edits: **depend on core**, and copy `styles.css`
from core at build time so `import "pillo/styles.css"` keeps working.

```jsonc
{
  "name": "pillo",                // Option A (§7): React keeps the unscoped name
  "version": "0.4.0",
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" },
  "dependencies": { "@pillo/core": "workspace:*", "motion": "^12.34.0" },
  "exports": {
    ".": { /* current dual CJS/ESM exports */ },
    "./styles.css": "./dist/styles.css"   // copied from core at build (§6)
  },
  "scripts": {
    "build": "bunchee && cp ../core/dist/styles.css dist/styles.css"
  }
}
```

> Why copy instead of re-exporting core's path: `exports` targets must resolve
> **inside the package's own directory**. After npm hoists dependencies,
> `./node_modules/@pillo/core/...` does not exist under the published react
> package, so a path-into-node_modules export breaks for real consumers. The
> build-time copy is the only reliable way to keep `pillo/styles.css` working.
> "One source of truth" still holds — the copy is a build artifact, not a
> second source (§6).

---

## 6. Build, test, tooling

- **Bundling:** `bunchee` already used — run it per-package (each has its own
  entry). Core builds first (dependency order).
- **Stylesheet:** single source of truth is `packages/core/styles.css`. The
  React package **copies it in its own build step** (see §5 for why re-exporting
  core's path via `exports` doesn't survive npm hoisting). Drift is prevented
  by there being no second *source* — only a build-time copy of core's output.
- **Tests:** add `vitest.workspace.ts` listing both packages. Split the current
  `tests/pillo.test.tsx`:
  - store/API-level assertions → `packages/core/tests/store.test.ts` (no jsdom
    render needed, runs fastest).
  - render/interaction assertions → stay in `packages/react/tests/`.
- **TS:** `tsconfig.base.json` at root; each package extends it and sets its own
  `references`/paths. `@pillo/core` resolves via workspace during dev.
- **Playground:** repoint its dependency to `@pillo/react` (workspace:*). No app
  code changes if the React package keeps the same public exports.

---

## 7. Naming / publishing decision

One thing to decide before executing:

- **Option A — keep `pillo` = React, add `@pillo/core` + `@pillo/angular`.**
  Zero churn for existing React users (`npm i pillo` unchanged). Slight
  asymmetry (React isn't scoped, others are).
- **Option B — scope everything: `@pillo/react`, `@pillo/core`, `@pillo/angular`;**
  publish `pillo` as a thin deprecated alias that re-exports `@pillo/react`.
  Cleaner long-term, but a breaking-ish rename for React users.

**Recommendation: Option A** for the 0.4 line (non-breaking), revisit scoping at
a 1.0 major.

---

## 8. Migration steps (execution order)

1. Create `packages/core/` and move `constants.ts`, `types.ts` (gener-icized),
   `styles.css`, and the store block from `toast.tsx` into `store.ts` + `id.ts`
   — including the store-adjacent defs from §3 (`PilloItem<Slot>`,
   `PilloListener`, `timeoutKey`). Add `store.subscribe` / `registerToaster`
   wrappers. Build core in isolation.
2. Create `packages/react/`, move `pillo.tsx`, `icons.tsx`, and the residual
   `Toaster` component. Rewire imports to `@pillo/core`. Specialize
   `PilloOptions<ReactNode>`. Keep public exports identical to today.
3. Wire root workspace, `tsconfig.base.json`, `vitest.workspace.ts`. Split tests.
4. Repoint `playground` to `@pillo/react`. `bun run build && bun run test` green.
5. Scaffold empty `packages/angular/` with its own plan (separate doc).

Steps 1–4 are a pure refactor: **no behavior change, no public API change** for
React consumers. That's the checkpoint to land before any Angular work begins.

---

## 9. Risks / watch-outs

- **Single global store across frameworks.** The shared `idCounter` and
  `toasterCount` dev-warning live in core, so a React and Angular Toaster on the
  same page won't collide — but realistically only one framework mounts per app.
- **Duplicate-core singletons (the big new failure mode).** The store only works
  because exactly **one** copy of `@pillo/core` loads. Two ways to get two:
  1. *Version skew:* a consumer installs `@pillo/core` directly at a version
     that doesn't dedupe with the one `pillo` depends on → two stores, and
     toasts fired via one never render in the other's Toaster. Mitigate:
     keep core's dep range a caret matching the published version, and document
     that consumers should import everything through the framework package
     (`pillo` re-exports the full core API, so there's no reason to install
     core directly).
  2. *Dual-package hazard:* core ships both CJS and ESM; if the react package's
     ESM build pulls core-ESM while something else in the app requires core-CJS,
     Node instantiates both → two stores. Mitigate: react-CJS must resolve
     core-CJS and react-ESM core-ESM (the default with conditional `exports`),
     and consider shipping `@pillo/core` **ESM-only** — it's a new package with
     no CJS consumers to break, and that eliminates the hazard entirely.
- **Stylesheet drift.** Enforce one source (core). Don't let the React package
  keep its own copy.
- **`motion` stays out of core.** The SVG spring animation is a render concern;
  core must not import it, or it stops being framework-free.
- **Type generic ergonomics.** `PilloOptions<Slot>` must default such that core's
  own internal code compiles without a concrete slot (`unknown` default). Verify
  the store never structurally inspects a slot value (it doesn't today).
