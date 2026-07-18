<div align="center">
  <h1>Pillo</h1>
  <p>An opinionated, physics-based toast component for React.</p>
  <video src="https://github.com/user-attachments/assets/a292d310-9189-490a-9f9d-d0a1d09defce"></video>
  <p><a href="https://phalla-doll.github.io/pillo/"><strong>Live demo →</strong></a></p>
</div>

> **Pillo** is the maintained successor to [`hiaaryan/sileo`](https://github.com/hiaaryan/sileo), which is no longer maintained. It carries forward the same liquid, physics-based design with correctness, accessibility, SSR, and API improvements. See [`CHANGELOG.md`](./CHANGELOG.md) for release notes.

### Installation

```bash
npm i pillo
```

### Getting Started

Render a single `<Toaster />` near the root of your app and import the stylesheet once:

```tsx
import { pillo, Toaster } from "pillo";
import "pillo/styles.css";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <YourApp />
    </>
  );
}
```

> **Next.js (App Router):** import `pillo/styles.css` in your root `layout.tsx`. `<Toaster />` is a client component — render it inside a `"use client"` boundary or directly in the layout.

### Triggering toasts

```tsx
pillo.success("Saved");
pillo.error({ title: "Couldn't save", description: "Please try again." });
pillo.info("Heads up"); // same as { title: "Heads up" }

// Promises:
await pillo.promise(fetch("/save"), {
  loading: "Saving…",
  success: "Saved!",
  error: (err) => `Failed: ${err}`,
});

// Custom JSX:
pillo.custom(({ id, dismiss }) => (
  <div role="status">
    <button onClick={dismiss}>Close {id}</button>
  </div>
));

// Update an existing toast:
const id = pillo.loading("Uploading…");
// …later
pillo.update(id, { type: "success", title: "Uploaded!" });
```

### API

| Method                          | Returns        | Notes                                                          |
| ------------------------------- | -------------- | -------------------------------------------------------------- |
| `pillo.show(input)`             | `string` (id)  | Generic; honours `type` on the options.                        |
| `pillo.success(input)`          | `string` (id)  | `input` may be a string shorthand or an options object.        |
| `pillo.error(input)`            | `string` (id)  | Rendered with `role="alert"` / `aria-live="assertive"`.        |
| `pillo.warning(input)`          | `string` (id)  | Rendered with `role="alert"` / `aria-live="assertive"`.        |
| `pillo.info(input)`             | `string` (id)  |                                                                |
| `pillo.loading(input)`          | `string` (id)  | Defaults `duration: null` (no auto-dismiss).                   |
| `pillo.action(input)`           | `string` (id)  | For toasts that require a follow-up action.                    |
| `pillo.custom(render, opts?)`   | `string` (id)  | Render any JSX. `render` receives `{ id, dismiss }`.           |
| `pillo.update(id, input)`       | `string` (id)  | Updates the toast in place; no-op if the id is unknown.        |
| `pillo.promise(p, opts)`        | `Promise<T>`   | Transitions a single toast through loading → success / error.  |
| `pillo.dismiss(id)`             | `void`         | Animates the toast out, then removes it.                       |
| `pillo.clear(position?)`        | `void`         | Removes all toasts (optionally only those at `position`).      |

`input` is either a `string` (treated as `{ title }`) or a `PilloOptions` object.

### Toaster props

| Prop       | Type                                                       | Default       |
| ---------- | ---------------------------------------------------------- | ------------- |
| `position` | `PilloPosition`                                            | `"top-right"` |
| `offset`   | `number \| string \| { top, right, bottom, left }`         | `undefined`   |
| `options`  | `Partial<PilloOptions>` (defaults merged into every toast) | `undefined`   |
| `theme`    | `"light" \| "dark" \| "system"`                            | `undefined`   |

`PilloPosition` is one of `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`.

### Accessibility

- Error and warning toasts render as `role="alert"` with `aria-live="assertive"`. All others use `role="status"` with `aria-live="polite"`.
- Toasts are keyboard focusable (`tabIndex={0}`); press **Escape** while focused to dismiss.
- Hover or focus expands a toast with a description; auto-dismiss is paused while focused or hovered.
- Animations honour `prefers-reduced-motion`.

### SSR

The `<Toaster />` is safe to render on the server. When `theme="system"` it omits `data-theme` on the first render and applies it after mount to avoid hydration mismatches. Imperative calls like `pillo.success(...)` are intended for the client (event handlers, effects).

### Browser support

Modern evergreen browsers. Uses CSS `oklch`, `color-mix`, `linear()` easings, and SVG goo filters.

### Project structure

Pillo is a [Bun workspace](https://bun.sh/docs/install/workspaces). The published npm package `pillo` is the React renderer; the framework-agnostic state core lives in `@pillo/core`.

```
packages/
  core/      @pillo/core — the store, the pillo.* API, types, and styles.css (no framework deps)
  react/     pillo — the <Toaster/> + <Pillo/> React renderers, over @pillo/core
  angular/   placeholder reserving a future Angular renderer
playground/  local Vite demo, aliased to the packages' source
```

`@pillo/core` contains no React — it's the shared foundation a non-React renderer would build on. **You never install it directly:** `pillo` re-exports the full core API, and everything loads a single shared store. See [`MONOREPO-PLAN.md`](./MONOREPO-PLAN.md) for the design.

### Development

Run from the repo root; scripts fan out across the workspace.

```bash
bun install
bun run typecheck   # every package
bun run test        # vitest across the workspace
bun run build       # builds @pillo/core first, then pillo
```

### Credits

Pillo builds on the original [`sileo`](https://github.com/hiaaryan/sileo) by [@hiaaryan](https://github.com/hiaaryan), licensed under MIT.
