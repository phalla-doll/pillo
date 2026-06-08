# Sileo Code Review

A review of the original `hiaaryan/sileo` source (1,790 LOC across `src/`). Findings are grouped by category and tagged with severity. No code changes yet — this doc is the to-discuss list before implementation.

**Severity legend:** critical · high · medium · low · nit

---

## 1. Correctness & State Management

### [critical] Module-level singleton store leaks across Toaster instances and SSR
- **Location:** `src/toast.tsx:57-71`
- **Issue:** `store` is created at import time and mutated globally. Mounting two `Toaster`s makes them fight over `store.position` / `store.options` (last-mount wins). Toasts queued before a `Toaster` mounts buffer forever — nothing schedules their auto-dismiss.
- **Fix sketch:** Lazy/per-Toaster scoping via `useSyncExternalStore`; warn in dev when >1 Toaster mounts.

### [critical] `dismissToast` schedules an unmanaged `setTimeout` that can mutate a stale store
- **Location:** `src/toast.tsx:89-92`
- **Issue:** Fire-and-forget `setTimeout(..., EXIT_DURATION)` to remove the toast. If the Toaster unmounts or `clear()` runs in between, the timer still fires and emits.
- **Fix sketch:** Track exit timers in the store keyed by id; cancel in `clear()` and on re-show.

### [high] Re-creating a toast with the same `id` during its exit silently removes the new one
- **Location:** `src/toast.tsx:81-93, 131-145`
- **Issue:** `createToast` filters the exiting twin out, but the orphaned `setTimeout` from the prior `dismissToast` still fires `EXIT_DURATION` later and removes the *new* toast.
- **Repro:** `sileo.dismiss('x'); sileo.success({ id: 'x', ... })` within ~600 ms.
- **Fix sketch:** Cancel pending exit timer when an id is re-created.

### [high] `clear()` does not cancel in-flight dismiss timers
- **Location:** `src/toast.tsx:209-213`
- **Issue:** Same root cause as above — `clear()` empties `store.toasts` but module-level dismiss timers still mutate it post-clear.
- **Fix sketch:** Centralize timer ownership in the store; clear them in `clear()`.

### [high] `useResolvedTheme` causes hydration mismatch for dark-preference users
- **Location:** `src/toast.tsx:222-247`
- **Issue:** Initial state is `"light"` during SSR; client immediately recomputes from `matchMedia`, so `data-theme` differs between server and client render.
- **Fix sketch:** Render with theme `undefined` until mounted, then upgrade.

### [high] Id generation uses `Date.now()` + `Math.random()` — SSR-hostile
- **Location:** `src/toast.tsx:73-75`
- **Issue:** If a toast is created during SSR and its id is used as a React key, hydration mismatches will occur. (Most users call from event handlers, so impact is limited, but it should be documented as client-only.)
- **Fix sketch:** Document client-only usage; consider deterministic counter w/ `useId` where possible.

### [high] `ResizeObserver` cache uses stale `headerPadRef`
- **Location:** `src/sileo.tsx:187-234`
- **Issue:** `headerPadRef.current` is set once on first run (line 191) and never reset when `headerLayer.current.key` changes. Different content with different padding produces stale measurements.
- **Fix sketch:** Reset `headerPadRef.current = null` when `headerLayer.current.key` changes, or measure fresh each tick.

### [medium] Swipe gesture leaks listeners on `pointercancel`
- **Location:** `src/sileo.tsx:506-535`
- **Issue:** `setPointerCapture` is acquired on `pointerdown` but no `pointercancel`/`pointerleave` cleanup. If the OS cancels the pointer, `onUp` never fires.
- **Fix sketch:** Add `pointercancel` listener that runs `onUp`'s cleanup (without dismissal).

### [medium] Swipe direction ignores toast position
- **Location:** `src/sileo.tsx:497-535`
- **Issue:** Always reads `clientY` regardless of `position` — a top-positioned toast dismisses on a *downward* swipe (toward screen center), which is counterintuitive.
- **Fix sketch:** Pick axis/sign based on `position`.

### [medium] `touch-action: none` on the toast root can trap touch users
- **Location:** `src/styles.css:58`
- **Issue:** Disabling all touch actions on a possibly-large hover-expanded card blocks page scroll if the touch starts on the toast.
- **Fix sketch:** Use `touch-action: pan-x` / `pan-y` along the non-swipe axis.

### [low] `pillRafRef = useRef(0)` then `cancelAnimationFrame(0)` — invalid handle (browsers ignore, lint flags)
- **Location:** `src/sileo.tsx:183`

### [low] `headerKey = \`${view.state}-${view.title}\`` collides when titles contain `-`
- **Location:** `src/sileo.tsx:158`
- **Fix sketch:** Use a tuple or a separator that can't appear in a title.

### [low] Misleading `// biome-ignore` reasons
- **Location:** `src/sileo.tsx:186, 340`
- **Issue:** Comments don't match what the code actually does, and there's no `biome.json` in the repo so the suppressions are dead.

---

## 2. Accessibility

### [high] Live region uses `aria-live="polite"` for all states, including errors
- **Location:** `src/toast.tsx:436`
- **Issue:** Errors should be `assertive`/`role="alert"`. Polite errors get missed by screen readers.
- **Fix sketch:** Per-toast `aria-live` derived from `state`.

### [high] Nested interactive elements: `<a>` inside `<button>`
- **Location:** `src/sileo.tsx:670-681`
- **Issue:** Invalid HTML; inconsistent SR behavior; `href="#"` scrolls the page when activated via keyboard.
- **Fix sketch:** Make the toast root a `div role="status"` and the action a real `<button>`.

### [high] No keyboard dismissal or focus-driven expansion
- **Issue:** No `Escape` to dismiss. Hover-expand has no `:focus-visible` equivalent, so the description is never reachable by keyboard users. Nested-button structure means the action button can't be focused independently.
- **Fix sketch:** Add Esc handler; mirror hover-expand on `:focus-within`; flatten interactive structure.

### [medium] `prefers-reduced-motion` is only honored in CSS, not by motion library
- **Location:** `src/styles.css:458-467`, `src/sileo.tsx:17-22`
- **Issue:** Motion springs on `pillAnimate`/`bodyAnimate` keep running at full duration.
- **Fix sketch:** Use `useReducedMotion()` from `motion/react` to swap to `{ duration: 0 }`.

### [low] SVG `<title>Sileo Notification</title>` announced per toast; icon `<title>`s show as tooltips
- **Location:** `src/sileo.tsx:585`, `src/icons.tsx:3-23`
- **Fix sketch:** `aria-hidden="true"` on decorative SVGs; surface labels at the toast level instead.

---

## 3. Public API / DX

### [high] No string-shorthand: helpers require an object
- **Location:** `src/toast.tsx:163-171`
- **Issue:** `sileo.success("Saved")` is the expected ergonomic form across the ecosystem (sonner, react-hot-toast). Today you must pass `{ title: "Saved" }`.
- **Fix sketch:** Overload helpers to accept `string | SileoOptions`.

### [high] No public `update(id, opts)`
- **Issue:** Only `promise()` updates toasts internally. Users with their own async flows can't transition a "loading" toast to "success".
- **Fix sketch:** Export `sileo.update(id, partialOpts)`.

### [high] No `custom` / render-prop toast
- **Issue:** Common feature in this category — `sileo.custom((id) => <MyJSX/>)`.
- **Fix sketch:** Add a `custom` variant rendered in place of the standard layout.

### [medium] `Toaster` accepts and renders `children` but it's undocumented
- **Location:** `src/toast.tsx:425`

### [medium] No way to configure inter-toast gap (hardcoded `0.75rem`)
- **Location:** `src/styles.css`

### [medium] `autopilot: true` is accepted but indistinguishable from default
- **Location:** `src/types.ts:44`, `src/toast.tsx:99`
- **Issue:** Only `false` is checked; `true` falls through to default behavior.

### [low] `description: ReactNode | string` is redundant — `ReactNode` already includes `string`
- **Location:** `src/types.ts:36`

### [low] `SileoOptions.icon: ReactNode | null` — `null` already in `ReactNode`
- **Location:** `src/types.ts:40`

### [low] `SileoButton.title` is misleading (it's the visible label, not a tooltip)
- **Location:** `src/types.ts:18-21`

### [low] `roundness` accepts a number but the unit (px) is undocumented
- **Location:** `src/types.ts:43`

---

## 4. Performance

### [low] SVG gooey filter (`feGaussianBlur` + `feColorMatrix`) runs per toast on every paint
- **Location:** `src/sileo.tsx:93-112`
- **Issue:** Intentional for the visual, but worth memoizing the filter at viewport level if multiple toasts coexist.

### [low] Two animation systems (CSS `linear()` spring + motion springs) duplicate intent and can drift
- **Location:** `src/styles.css`, `src/sileo.tsx:17-22`
- **Issue:** Tuning requires editing both; visible mismatch possible during fast transitions.

### [low] Swipe magic numbers (`SWIPE_DISMISS = 30`, `SWIPE_MAX = 20`) declared inside render
- **Location:** `src/sileo.tsx:499-500`
- **Fix sketch:** Lift to module constants.

---

## 5. Code Quality / Maintainability

- **[medium]** `View` and `SileoItem` duplicate fields with no shared base type (`src/sileo.tsx:39-47`, `src/toast.tsx:32-38`).
- **[medium]** Mixed external (`type`) vs internal (`state`) naming for the same concept (`src/toast.tsx:27-30`).
- **[low]** `Math.max(0, roundness ?? DEFAULT_ROUNDNESS)` allows blur = 0 → degenerate filter output (`src/sileo.tsx:160-161`).
- **[low]** `idCounter` is module-mutable; not reset between tests (`src/toast.tsx:73`).

---

## 6. Build / Packaging

### [high] `package.json` is missing `"sideEffects"`
- **Issue:** With CSS imports in source, bundlers either over-tree-shake (drop CSS) or stop tree-shaking entirely.
- **Fix sketch:** `"sideEffects": ["**/*.css", "./dist/styles.css"]`.

### [high] Source files do `import "./styles.css"` — forces CSS auto-injection
- **Location:** `src/index.ts:3`, `src/sileo.tsx`
- **Issue:** Breaks under Next.js App Router's "Global CSS cannot be imported from within node_modules" rule. The `exports` map already advertises `./styles.css` for manual import.
- **Fix sketch:** Remove the source-level imports; document `import "sileo/styles.css"`. (Breaking — bump minor.)

### [high] `"use client"` directive only on `src/index.ts`
- **Issue:** Bunchee may or may not propagate it to chunks; the files that actually use hooks should carry it.
- **Fix sketch:** Add `"use client"` at the top of `toast.tsx` and `sileo.tsx`.

### [medium] No `@types/react` in `devDependencies`
- **Issue:** Bunchee/IDE type-checking is fragile without it.

### [medium] `motion` is a hard runtime dep (~30 KB)
- **Issue:** Given the CSS spring already exists, motion could be optional or replaced for non-essential animations.

### [medium] Missing `engines`, `publishConfig`, no `CHANGELOG.md`

### [low] `tsconfig.json` missing `noUncheckedIndexedAccess` — `toasts[i]` accesses (e.g., `sileo.tsx:354`) lose safety

### [low] `build` script uses `cp` — Unix-only

---

## 7. Testing / CI

### [high] No tests at all
- **Issue:** 1,800 LOC of state machines and timers is published with zero test coverage.
- **Fix sketch:** Vitest + React Testing Library; cover dismiss, replace-by-id, `promise`, `clear`, SSR.

### [medium] No lint config
- **Issue:** `// biome-ignore` comments are scattered through the code but there's no `biome.json` and no biome devDep — the suppressions are dead.

### [medium] No CI (`.github/workflows` was the only workflow and we removed it to push)
- **Fix sketch:** Add a build + test + typecheck workflow on PR.

---

## 8. Documentation

- **[high]** README has no API documentation — no mention of `success`/`error`/`promise`/`dismiss`/`clear`, theming, SSR, or Next.js usage.
- **[high]** `import "sileo/styles.css"` is undocumented despite being in the `exports` map.
- **[medium]** No `CHANGELOG.md`, no peer-dep / React version / RSC compatibility notes.
- **[low]** `sileo.mov` (~13 MB) is committed at repo root, bloating clones. Move to a release asset or Git LFS.

---

## Top Priorities (suggested order)

1. **State & timer ownership** — fix the singleton store + unmanaged exit timers + same-id replace race (sections 1.1–1.4). These are user-visible bugs.
2. **Accessibility** — `role="alert"` for errors, flatten the nested `<a>` inside `<button>`, Esc-to-dismiss, honor reduced-motion in JS too.
3. **Packaging hygiene** — `sideEffects`, `"use client"` on each hook-using file, drop source-level CSS imports, document `sileo/styles.css`.
4. **SSR safety** — fix `useResolvedTheme` hydration mismatch; document client-only id generation.
5. **API gaps** — `sileo.update(id, opts)`, string shorthand, `custom` toast.
6. **Tests + CI** — even a minimal Vitest suite plus a GitHub Actions workflow.
