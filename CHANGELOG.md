# Changelog

## 0.3.0 — renamed to `pillo`

`pillo` is the maintained successor to the now-unmaintained [`sileo`](https://github.com/hiaaryan/sileo). The package, public API (`pillo.*`), CSS custom properties (`--pillo-*`), and data attributes (`data-pillo-*`) were all renamed from `sileo`. No behavioural changes — this is a rename of the 0.2.0 line below.

## 0.2.0 — fork from upstream `sileo` 0.1.5

### Breaking changes

- **CSS import is no longer automatic.** Source files no longer `import "./styles.css"`. Consumers must add `import "pillo/styles.css"` once (in `app/layout.tsx` for Next.js).
- **`PilloButton.title` → `PilloButton.label`.** The field was the visible button label; renamed for clarity.
- **`PilloOptions.description: ReactNode | string` → `ReactNode`.** `ReactNode` already covers `string`.
- **`PilloOptions.icon: ReactNode | null` → `ReactNode`.** Same reason.
- **`autopilot: true` is no longer accepted.** It was indistinguishable from the default. Use `false` to disable, or `{ expand, collapse }` to configure timings.

### Added

- `pillo.update(id, input)` — update an existing toast in place.
- `pillo.custom((ctx) => ReactNode, opts?)` — render arbitrary JSX as a toast; receives `{ id, dismiss }`.
- `pillo.loading(input)` — explicit helper for indefinite loading toasts.
- **String shorthand:** every helper accepts a plain `string` as well as a `PilloOptions` object — `pillo.success("Saved")` is equivalent to `pillo.success({ title: "Saved" })`.
- Multi-`Toaster` and no-`Toaster` development-time warnings.
- Test suite (Vitest + React Testing Library) and GitHub Actions CI.

### Correctness fixes

- **Same-id replace race fixed.** Re-creating a toast with the same `id` while the previous instance is exiting no longer removes the replacement. Exit timers are now owned by the store and cancelled on re-show / `clear()`.
- **`clear()` cancels in-flight exit timers.** Previously they kept firing after the store had been emptied.
- **`useResolvedTheme` no longer causes hydration mismatches** for `theme="system"`. `data-theme` is omitted on the server and applied after mount.
- **`headerPadRef` is reset when the header key changes**, so cached padding can't be stale across state/title transitions.
- **`headerKey` separator** changed from `-` to a space to avoid collisions when titles contain hyphens.
- **Swipe direction is now position-aware:** top-positioned toasts dismiss on upward swipes, bottom-positioned on downward — no more "swipe-into-screen" dismissals.
- **`pointercancel` cleanup** for swipe — pointer state and listeners are released when the OS cancels the gesture.

### Accessibility

- Errors and warnings now render as `role="alert"` with `aria-live="assertive"`; others use `role="status"` with `aria-live="polite"`.
- Toast root is now a `<div>` (not a `<button>`), so the optional action button can be a real `<button>` instead of an `<a>` nested inside a `<button>` (invalid HTML before).
- Toasts are keyboard focusable and dismiss with **Escape**.
- Focus-within mirrors hover-to-expand and pauses auto-dismiss.
- `useReducedMotion()` is honoured in the JS animation transitions, not just CSS.
- Decorative SVG icons are `aria-hidden="true"` and have no `<title>` (no more hover tooltips like "Arrow Right").

### Packaging

- `"sideEffects": ["**/*.css", "./dist/styles.css"]` for proper tree-shaking with CSS preservation.
- `"use client"` directive on every hook-using file (`toast.tsx`, `pillo.tsx`), not just the entry.
- `engines: { node: ">=18" }`.
- `tsconfig.json` adds `noUncheckedIndexedAccess` and bumps `target` to `ES2020`.

### Code quality

- Swipe constants lifted out of the component body.
- Removed source-level `import "./styles.css"` from `index.ts` and `pillo.tsx`.
- Removed unused `// biome-ignore` comments and misleading suppression reasons.
- 13 MB `sileo.mov` removed from the repo root (the README still embeds the asset from GitHub user-attachments).
