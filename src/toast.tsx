"use client";

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
import {
	AUTO_COLLAPSE_DELAY,
	AUTO_EXPAND_DELAY,
	DEFAULT_TOAST_DURATION,
	EXIT_DURATION,
} from "./constants";
import { CustomPillo, Pillo } from "./pillo";
import type {
	PilloCustomRender,
	PilloOptions,
	PilloPosition,
	PilloState,
} from "./types";

const pillAlign = (pos: PilloPosition) =>
	pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
const expandDir = (pos: PilloPosition) =>
	pos.startsWith("top") ? ("bottom" as const) : ("top" as const);

/* ---------------------------------- Types --------------------------------- */

interface PilloItem extends PilloOptions {
	id: string;
	instanceId: string;
	state?: PilloState;
	exiting?: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
}

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

/* ------------------------------ Global State ------------------------------ */

type PilloListener = (toasts: PilloItem[]) => void;

const store = {
	toasts: [] as PilloItem[],
	listeners: new Set<PilloListener>(),
	position: "top-right" as PilloPosition,
	options: undefined as Partial<PilloOptions> | undefined,
	exitTimers: new Map<string, ReturnType<typeof setTimeout>>(),
	toasterCount: 0,

	emit() {
		for (const fn of this.listeners) fn(this.toasts);
	},

	update(fn: (prev: PilloItem[]) => PilloItem[]) {
		this.toasts = fn(this.toasts);
		this.emit();
	},

	cancelExitTimer(id: string) {
		const t = this.exitTimers.get(id);
		if (t !== undefined) {
			clearTimeout(t);
			this.exitTimers.delete(id);
		}
	},

	scheduleExit(id: string) {
		this.cancelExitTimer(id);
		const t = setTimeout(() => {
			this.exitTimers.delete(id);
			this.update((prev) => prev.filter((toast) => toast.id !== id));
		}, EXIT_DURATION);
		this.exitTimers.set(id, t);
	},

	cancelExitTimers(predicate: (id: string) => boolean) {
		for (const [id, t] of this.exitTimers) {
			if (predicate(id)) {
				clearTimeout(t);
				this.exitTimers.delete(id);
			}
		}
	},
};

let idCounter = 0;
const generateId = () => {
	idCounter += 1;
	if (typeof window === "undefined") return `pillo-${idCounter}`;
	return `pillo-${idCounter}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
};

const timeoutKey = (t: PilloItem) => `${t.id}:${t.instanceId}`;

/* ------------------------------- Toast API -------------------------------- */

const dismissToast = (id: string) => {
	const item = store.toasts.find((t) => t.id === id);
	if (!item || item.exiting) return;

	store.update((prev) =>
		prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
	);

	store.scheduleExit(id);
};

const resolveAutopilot = (
	opts: PilloOptions,
	duration: number | null,
): { expandDelayMs?: number; collapseDelayMs?: number } => {
	if (opts.autopilot === false || !duration || duration <= 0) return {};
	const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
	const clamp = (v: number) => Math.min(duration, Math.max(0, v));
	return {
		expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
		collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
	};
};

const mergeOptions = (options: PilloOptions): PilloOptions => ({
	...store.options,
	...options,
	styles: { ...store.options?.styles, ...options.styles },
});

const buildPilloItem = (
	merged: PilloOptions,
	id: string,
	state: PilloState | undefined,
	fallbackPosition?: PilloPosition,
): PilloItem => {
	const duration = merged.duration ?? DEFAULT_TOAST_DURATION;
	const auto = resolveAutopilot(merged, duration);
	return {
		...merged,
		id,
		instanceId: generateId(),
		state: state ?? merged.type,
		position: merged.position ?? fallbackPosition ?? store.position,
		autoExpandDelayMs: auto.expandDelayMs,
		autoCollapseDelayMs: auto.collapseDelayMs,
	};
};

declare const process: { env: { NODE_ENV?: string } } | undefined;

const isDev = () => {
	try {
		return (
			typeof process !== "undefined" &&
			process?.env?.NODE_ENV !== "production"
		);
	} catch {
		return false;
	}
};

const warnNoToaster = () => {
	if (
		isDev() &&
		typeof window !== "undefined" &&
		store.toasterCount === 0
	) {
		console.warn(
			"[pillo] Toast queued but no <Toaster /> is mounted. It will not render or auto-dismiss until one is mounted.",
		);
	}
};

const createToast = (options: PilloOptions, state?: PilloState) => {
	const live = store.toasts.filter((t) => !t.exiting);
	const merged = mergeOptions(options);

	const id = options.id ?? "pillo-default";

	// Cancel any orphan exit timer from a previous dismiss of this id —
	// otherwise it would fire EXIT_DURATION later and remove the new toast.
	store.cancelExitTimer(id);

	const prev = live.find((t) => t.id === id);
	const item = buildPilloItem(merged, id, state);

	if (prev) {
		store.update((p) => p.map((t) => (t.id === id ? item : t)));
	} else {
		store.update((p) => [...p.filter((t) => t.id !== id), item]);
	}

	warnNoToaster();

	return { id, duration: merged.duration ?? DEFAULT_TOAST_DURATION };
};

const updateToast = (
	id: string,
	options: PilloOptions,
	state?: PilloState,
) => {
	const existing = store.toasts.find((t) => t.id === id);
	if (!existing) return;

	store.cancelExitTimer(id);
	const item = buildPilloItem(
		mergeOptions(options),
		id,
		state ?? existing.state,
		existing.position,
	);
	store.update((prev) => prev.map((t) => (t.id === id ? item : t)));
};

export interface PilloPromiseOptions<T = unknown> {
	loading: PilloOptions | string;
	success: PilloOptions | string | ((data: T) => PilloOptions | string);
	error: PilloOptions | string | ((err: unknown) => PilloOptions | string);
	action?: PilloOptions | ((data: T) => PilloOptions);
	position?: PilloPosition;
}

type PilloInput = string | PilloOptions;

const toOptions = (input: PilloInput): PilloOptions =>
	typeof input === "string" ? { title: input } : input;

export const pillo = {
	show: (input: PilloInput) => {
		const opts = toOptions(input);
		return createToast(opts, opts.type).id;
	},
	success: (input: PilloInput) => createToast(toOptions(input), "success").id,
	error: (input: PilloInput) => createToast(toOptions(input), "error").id,
	warning: (input: PilloInput) => createToast(toOptions(input), "warning").id,
	info: (input: PilloInput) => createToast(toOptions(input), "info").id,
	action: (input: PilloInput) => createToast(toOptions(input), "action").id,
	loading: (input: PilloInput) =>
		createToast({ duration: null, ...toOptions(input) }, "loading").id,

	custom: (render: PilloCustomRender, opts?: PilloOptions) =>
		createToast({ ...opts, custom: render }, "custom").id,

	update: (id: string, input: PilloInput) => {
		const opts = toOptions(input);
		updateToast(id, opts, opts.type);
		return id;
	},

	promise: <T,>(
		promise: Promise<T> | (() => Promise<T>),
		opts: PilloPromiseOptions<T>,
	): Promise<T> => {
		const loadingOpts = toOptions(opts.loading);
		const { id } = createToast(
			{
				...loadingOpts,
				duration: null,
				position: opts.position ?? loadingOpts.position,
			},
			"loading",
		);

		const p = typeof promise === "function" ? promise() : promise;

		p.then((data) => {
			if (opts.action) {
				const actionOpts =
					typeof opts.action === "function" ? opts.action(data) : opts.action;
				updateToast(id, { ...actionOpts, id }, "action");
			} else {
				const out =
					typeof opts.success === "function"
						? opts.success(data)
						: opts.success;
				updateToast(id, { ...toOptions(out), id }, "success");
			}
		}).catch((err) => {
			const out =
				typeof opts.error === "function" ? opts.error(err) : opts.error;
			updateToast(id, { ...toOptions(out), id }, "error");
		});

		return p;
	},

	dismiss: dismissToast,

	clear: (position?: PilloPosition) => {
		const idsToClear = new Set(
			store.toasts
				.filter((t) => !position || t.position === position)
				.map((t) => t.id),
		);
		store.cancelExitTimers((id) => idsToClear.has(id));
		store.update((prev) =>
			position ? prev.filter((t) => t.position !== position) : [],
		);
	},
};

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
	const [toasts, setToasts] = useState<PilloItem[]>(() => store.toasts);
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
		store.position = position;
		store.options = options;
	}, [position, options]);

	useEffect(() => {
		store.toasterCount += 1;
		if (isDev() && store.toasterCount > 1) {
			console.warn(
				"[pillo] More than one <Toaster /> is mounted. They share a single global store; only the most recently mounted instance's position/options/theme apply consistently.",
			);
		}
		return () => {
			store.toasterCount -= 1;
		};
	}, []);

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
				setTimeout(() => dismissToast(item.id), dur),
			);
		}
	}, []);

	useEffect(() => {
		const listener: PilloListener = (next) => setToasts(next);
		store.listeners.add(listener);
		// Pull current snapshot in case toasts were queued before mount.
		setToasts(store.toasts);
		return () => {
			store.listeners.delete(listener);
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
			dismiss: () => dismissToast(toastId),
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
				dismissToast(id);
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
