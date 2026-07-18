import {
	AUTO_COLLAPSE_DELAY,
	AUTO_EXPAND_DELAY,
	DEFAULT_TOAST_DURATION,
	EXIT_DURATION,
} from "./constants";
import { generateId } from "./id";
import type {
	PilloCustomRender,
	PilloOptions,
	PilloPosition,
	PilloState,
} from "./types";

/* ---------------------------------- Types --------------------------------- */

export interface PilloItem<Slot = unknown> extends PilloOptions<Slot> {
	id: string;
	instanceId: string;
	state?: PilloState;
	exiting?: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
}

export type PilloListener<Slot = unknown> = (toasts: PilloItem<Slot>[]) => void;

export const timeoutKey = (t: PilloItem) => `${t.id}:${t.instanceId}`;

/* ------------------------------ Global State ------------------------------ */

declare const process: { env: { NODE_ENV?: string } } | undefined;

const isDev = () => {
	try {
		return (
			typeof process !== "undefined" && process?.env?.NODE_ENV !== "production"
		);
	} catch {
		return false;
	}
};

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

	/* ---------------------- Renderer-facing store handle ------------------- */

	// Subscribe a renderer to store changes; returns an unsubscribe fn. The
	// `Slot` generic lets a renderer receive items typed to whatever it embeds
	// (React → ReactNode) while the store keeps them opaque internally.
	subscribe<Slot = unknown>(fn: PilloListener<Slot>): () => void {
		this.listeners.add(fn as PilloListener);
		return () => {
			this.listeners.delete(fn as PilloListener);
		};
	},

	// Initial read for a renderer mounting after toasts were already queued.
	getSnapshot<Slot = unknown>(): PilloItem<Slot>[] {
		return this.toasts as PilloItem<Slot>[];
	},

	// The mounted Toaster owns the active position/options.
	setConfig(cfg: {
		position?: PilloPosition;
		options?: Partial<PilloOptions>;
	}) {
		if (cfg.position !== undefined) this.position = cfg.position;
		this.options = cfg.options;
	},

	// Track how many Toasters are mounted (for the dev warning) and return a
	// deregister fn for unmount.
	registerToaster(): () => void {
		this.toasterCount += 1;
		if (isDev() && this.toasterCount > 1) {
			console.warn(
				"[pillo] More than one <Toaster /> is mounted. They share a single global store; only the most recently mounted instance's position/options/theme apply consistently.",
			);
		}
		return () => {
			this.toasterCount -= 1;
		};
	},
};

export type PilloStore = typeof store;
export { store };

const warnNoToaster = () => {
	if (isDev() && typeof window !== "undefined" && store.toasterCount === 0) {
		console.warn(
			"[pillo] Toast queued but no <Toaster /> is mounted. It will not render or auto-dismiss until one is mounted.",
		);
	}
};

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

const updateToast = (id: string, options: PilloOptions, state?: PilloState) => {
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
