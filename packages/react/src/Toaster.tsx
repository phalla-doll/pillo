"use client";

import {
	DEFAULT_TOAST_DURATION,
	type PilloItem as CorePilloItem,
	type PilloListener,
	type PilloOptions as CorePilloOptions,
	type PilloPosition,
	pillo,
	store,
	timeoutKey,
} from "@pillo/core";
import {
	type CSSProperties,
	type FocusEventHandler,
	type KeyboardEventHandler,
	type MouseEventHandler,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CustomPillo, Pillo } from "./pillo";

// The React renderer embeds ReactNode content, so specialize the core slots.
type PilloItem = CorePilloItem<ReactNode>;
type PilloOptions = CorePilloOptions<ReactNode>;

const pillAlign = (pos: PilloPosition) =>
	pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
const expandDir = (pos: PilloPosition) =>
	pos.startsWith("top") ? ("bottom" as const) : ("top" as const);

/* ---------------------------------- Types --------------------------------- */

type PilloOffsetValue = number | string;
type PilloOffsetConfig = Partial<
	Record<"top" | "right" | "bottom" | "left", PilloOffsetValue>
>;

export interface PilloToasterProps {
	children?: ReactNode;
	position?: PilloPosition;
	offset?: PilloOffsetValue | PilloOffsetConfig;
	options?: Partial<PilloOptions>;
	theme?: "light" | "dark" | "system";
}

/* ------------------------------ Toaster Component ------------------------- */

const THEME_FILLS = {
	light: "#1a1a1a",
	dark: "#f2f2f2",
} as const;

function useResolvedTheme(
	theme: "light" | "dark" | "system" | undefined,
): "light" | "dark" | null {
	// null means "don't render data-theme yet" — keeps SSR and the first client
	// render identical when theme="system".
	const [resolved, setResolved] = useState<"light" | "dark" | null>(() => {
		if (theme === "light" || theme === "dark") return theme;
		return null;
	});

	useEffect(() => {
		if (theme === "light" || theme === "dark") {
			setResolved(theme);
			return;
		}
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) =>
			setResolved(e.matches ? "dark" : "light");
		setResolved(mq.matches ? "dark" : "light");
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	return resolved;
}

export function Toaster({
	children,
	position = "top-right",
	offset,
	options,
	theme,
}: PilloToasterProps) {
	const resolvedTheme = useResolvedTheme(theme);
	const [toasts, setToasts] = useState<PilloItem[]>(() =>
		store.getSnapshot<ReactNode>(),
	);
	const [activeId, setActiveId] = useState<string>();

	const hoverRef = useRef(false);
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const listRef = useRef(toasts);
	const latestRef = useRef<string | undefined>(undefined);

	type ToastHandlers = {
		enter: MouseEventHandler<HTMLDivElement>;
		leave: MouseEventHandler<HTMLDivElement>;
		focus: FocusEventHandler<HTMLDivElement>;
		blur: FocusEventHandler<HTMLDivElement>;
		dismiss: () => void;
	};

	const handlersCache = useRef(new Map<string, ToastHandlers>());

	useEffect(() => {
		store.setConfig({ position, options });
	}, [position, options]);

	useEffect(() => store.registerToaster(), []);

	const clearAllTimers = useCallback(() => {
		for (const t of timersRef.current.values()) clearTimeout(t);
		timersRef.current.clear();
	}, []);

	const schedule = useCallback((items: PilloItem[]) => {
		if (hoverRef.current) return;

		for (const item of items) {
			if (item.exiting) continue;
			const key = timeoutKey(item);
			if (timersRef.current.has(key)) continue;

			if (item.duration === null) continue;
			const dur = item.duration ?? DEFAULT_TOAST_DURATION;
			if (dur <= 0) continue;

			timersRef.current.set(
				key,
				setTimeout(() => pillo.dismiss(item.id), dur),
			);
		}
	}, []);

	useEffect(() => {
		const listener: PilloListener<ReactNode> = (next) => setToasts(next);
		const unsubscribe = store.subscribe<ReactNode>(listener);
		// Pull current snapshot in case toasts were queued before mount.
		setToasts(store.getSnapshot<ReactNode>());
		return () => {
			unsubscribe();
			clearAllTimers();
		};
	}, [clearAllTimers]);

	useEffect(() => {
		listRef.current = toasts;

		const toastKeys = new Set(toasts.map(timeoutKey));
		const toastIds = new Set(toasts.map((t) => t.id));
		for (const [key, timer] of timersRef.current) {
			if (!toastKeys.has(key)) {
				clearTimeout(timer);
				timersRef.current.delete(key);
			}
		}
		for (const id of handlersCache.current.keys()) {
			if (!toastIds.has(id)) handlersCache.current.delete(id);
		}

		schedule(toasts);
	}, [toasts, schedule]);

	const pause = useCallback(() => {
		if (hoverRef.current) return;
		hoverRef.current = true;
		clearAllTimers();
	}, [clearAllTimers]);

	const resume = useCallback(() => {
		if (!hoverRef.current) return;
		hoverRef.current = false;
		schedule(listRef.current);
	}, [schedule]);

	// Keep callbacks stable across renders for the handlers cache by going
	// through refs instead of dep arrays.
	const pauseRef = useRef(pause);
	const resumeRef = useRef(resume);
	pauseRef.current = pause;
	resumeRef.current = resume;

	const latest = useMemo(() => {
		for (let i = toasts.length - 1; i >= 0; i--) {
			const t = toasts[i];
			if (t && !t.exiting) return t.id;
		}
		return undefined;
	}, [toasts]);

	useEffect(() => {
		latestRef.current = latest;
		setActiveId(latest);
	}, [latest]);

	const getHandlers = useCallback((toastId: string) => {
		let cached = handlersCache.current.get(toastId);
		if (cached) return cached;

		cached = {
			enter: () => {
				setActiveId(toastId);
				pauseRef.current();
			},
			leave: () => {
				setActiveId(latestRef.current);
				resumeRef.current();
			},
			focus: (e) => {
				// Ignore focus events bubbling in from descendants — only the
				// outermost focus should change the active toast.
				if (e.currentTarget !== e.target) {
					setActiveId(toastId);
					pauseRef.current();
					return;
				}
				setActiveId(toastId);
				pauseRef.current();
			},
			blur: (e) => {
				const next = e.relatedTarget as Node | null;
				if (next && e.currentTarget.contains(next)) return;
				setActiveId(latestRef.current);
				resumeRef.current();
			},
			dismiss: () => pillo.dismiss(toastId),
		};

		handlersCache.current.set(toastId, cached);
		return cached;
	}, []);

	const handleViewportKeyDown: KeyboardEventHandler<HTMLDivElement> =
		useCallback((e) => {
			if (e.key !== "Escape") return;
			const target = e.target as HTMLElement;
			const toast = target.closest<HTMLElement>("[data-pillo-toast]");
			const id = toast?.dataset.pilloId;
			if (id) {
				e.stopPropagation();
				pillo.dismiss(id);
			}
		}, []);

	const getViewportStyle = useCallback(
		(pos: PilloPosition): CSSProperties | undefined => {
			if (offset === undefined) return undefined;

			const o =
				typeof offset === "object"
					? offset
					: { top: offset, right: offset, bottom: offset, left: offset };

			const s: CSSProperties = {};
			const px = (v: PilloOffsetValue) =>
				typeof v === "number" ? `${v}px` : v;

			if (pos.startsWith("top") && o.top != null) s.top = px(o.top);
			if (pos.startsWith("bottom") && o.bottom != null) s.bottom = px(o.bottom);
			if (pos.endsWith("left") && o.left != null) s.left = px(o.left);
			if (pos.endsWith("right") && o.right != null) s.right = px(o.right);

			return s;
		},
		[offset],
	);

	const activePositions = useMemo(() => {
		const map = new Map<PilloPosition, PilloItem[]>();
		for (const t of toasts) {
			const pos = t.position ?? position;
			const arr = map.get(pos);
			if (arr) {
				arr.push(t);
			} else {
				map.set(pos, [t]);
			}
		}
		return map;
	}, [toasts, position]);

	return (
		<>
			{children}
			{Array.from(activePositions, ([pos, items]) => {
				const pill = pillAlign(pos);
				const expand = expandDir(pos);

				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: keyboard handler is for Esc-to-dismiss the focused toast
					<section
						key={pos}
						data-pillo-viewport
						data-position={pos}
						data-theme={resolvedTheme ?? undefined}
						style={getViewportStyle(pos)}
						onKeyDown={handleViewportKeyDown}
					>
						{items.map((item) => {
							const h = getHandlers(item.id);
							if (item.custom) {
								return (
									<CustomPillo
										key={item.id}
										id={item.id}
										position={pill}
										expand={expand}
										exiting={item.exiting}
										render={item.custom}
										onDismiss={h.dismiss}
									/>
								);
							}
							const fill =
								item.fill ??
								(resolvedTheme ? THEME_FILLS[resolvedTheme] : undefined);
							return (
								<Pillo
									key={item.id}
									id={item.id}
									state={item.state}
									title={item.title}
									description={item.description}
									position={pill}
									expand={expand}
									icon={item.icon}
									fill={fill}
									styles={item.styles}
									button={item.button}
									roundness={item.roundness}
									exiting={item.exiting}
									autoExpandDelayMs={item.autoExpandDelayMs}
									autoCollapseDelayMs={item.autoCollapseDelayMs}
									refreshKey={item.instanceId}
									canExpand={activeId === undefined || activeId === item.id}
									onMouseEnter={h.enter}
									onMouseLeave={h.leave}
									onFocus={h.focus}
									onBlur={h.blur}
									onDismiss={h.dismiss}
								/>
							);
						})}
					</section>
				);
			})}
		</>
	);
}
