<div align="center">
  <h1>Sileo</h1>
  <p>An opinionated, physics-based toast component for React.</p>
  <p><a href="https://sileo.aaryan.design">Try Out</a> &nbsp; / &nbsp; <a href="https://sileo.aaryan.design/docs">Docs</a></p>
  <video src="https://github.com/user-attachments/assets/a292d310-9189-490a-9f9d-d0a1d09defce"></video>
</div>

> This is a fork of [`hiaaryan/sileo`](https://github.com/hiaaryan/sileo) with correctness, accessibility, SSR, and API improvements. See [`REVIEW.md`](./REVIEW.md) for the full list of changes vs upstream and [`CHANGELOG.md`](./CHANGELOG.md) for release notes.

### Installation

```bash
npm i sileo
```

### Getting Started

Render a single `<Toaster />` near the root of your app and import the stylesheet once:

```tsx
import { sileo, Toaster } from "sileo";
import "sileo/styles.css";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <YourApp />
    </>
  );
}
```

> **Next.js (App Router):** import `sileo/styles.css` in your root `layout.tsx`. `<Toaster />` is a client component — render it inside a `"use client"` boundary or directly in the layout.

### Triggering toasts

```tsx
sileo.success("Saved");
sileo.error({ title: "Couldn't save", description: "Please try again." });
sileo.info("Heads up"); // same as { title: "Heads up" }

// Promises:
await sileo.promise(fetch("/save"), {
  loading: "Saving…",
  success: "Saved!",
  error: (err) => `Failed: ${err}`,
});

// Custom JSX:
sileo.custom(({ id, dismiss }) => (
  <div role="status">
    <button onClick={dismiss}>Close {id}</button>
  </div>
));

// Update an existing toast:
const id = sileo.loading("Uploading…");
// …later
sileo.update(id, { type: "success", title: "Uploaded!" });
```

### API

| Method                          | Returns        | Notes                                                          |
| ------------------------------- | -------------- | -------------------------------------------------------------- |
| `sileo.show(input)`             | `string` (id)  | Generic; honours `type` on the options.                        |
| `sileo.success(input)`          | `string` (id)  | `input` may be a string shorthand or an options object.        |
| `sileo.error(input)`            | `string` (id)  | Rendered with `role="alert"` / `aria-live="assertive"`.        |
| `sileo.warning(input)`          | `string` (id)  | Rendered with `role="alert"` / `aria-live="assertive"`.        |
| `sileo.info(input)`             | `string` (id)  |                                                                |
| `sileo.loading(input)`          | `string` (id)  | Defaults `duration: null` (no auto-dismiss).                   |
| `sileo.action(input)`           | `string` (id)  | For toasts that require a follow-up action.                    |
| `sileo.custom(render, opts?)`   | `string` (id)  | Render any JSX. `render` receives `{ id, dismiss }`.           |
| `sileo.update(id, input)`       | `string` (id)  | Updates the toast in place; no-op if the id is unknown.        |
| `sileo.promise(p, opts)`        | `Promise<T>`   | Transitions a single toast through loading → success / error.  |
| `sileo.dismiss(id)`             | `void`         | Animates the toast out, then removes it.                       |
| `sileo.clear(position?)`        | `void`         | Removes all toasts (optionally only those at `position`).      |

`input` is either a `string` (treated as `{ title }`) or a `SileoOptions` object.

### Toaster props

| Prop       | Type                                                       | Default       |
| ---------- | ---------------------------------------------------------- | ------------- |
| `position` | `SileoPosition`                                            | `"top-right"` |
| `offset`   | `number \| string \| { top, right, bottom, left }`         | `undefined`   |
| `options`  | `Partial<SileoOptions>` (defaults merged into every toast) | `undefined`   |
| `theme`    | `"light" \| "dark" \| "system"`                            | `undefined`   |

`SileoPosition` is one of `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`.

### Accessibility

- Error and warning toasts render as `role="alert"` with `aria-live="assertive"`. All others use `role="status"` with `aria-live="polite"`.
- Toasts are keyboard focusable (`tabIndex={0}`); press **Escape** while focused to dismiss.
- Hover or focus expands a toast with a description; auto-dismiss is paused while focused or hovered.
- Animations honour `prefers-reduced-motion`.

### SSR

The `<Toaster />` is safe to render on the server. When `theme="system"` it omits `data-theme` on the first render and applies it after mount to avoid hydration mismatches. Imperative calls like `sileo.success(...)` are intended for the client (event handlers, effects).

### Browser support

Modern evergreen browsers. Uses CSS `oklch`, `color-mix`, `linear()` easings, and SVG goo filters.

### Development

```bash
bun install
bun run typecheck
bun run test
bun run build
```

For detailed upstream docs, see the original project site: https://sileo.aaryan.design
