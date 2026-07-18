import { afterEach, describe, expect, it, vi } from "vitest";
import { EXIT_DURATION } from "../src/constants";
import { type PilloItem, pillo, store } from "../src/store";

afterEach(() => {
	pillo.clear();
	// The store is a process-wide singleton; reset config so position/options
	// set by one test don't bleed into the next.
	store.setConfig({ position: "top-right", options: undefined });
});

describe("pillo imperative API (framework-free)", () => {
	it("queues a success toast into the store", () => {
		pillo.success({ title: "Saved", id: "s" });
		const item = store.getSnapshot().find((t) => t.id === "s");
		expect(item).toBeDefined();
		expect(item?.title).toBe("Saved");
		expect(item?.state).toBe("success");
	});

	it("accepts a plain string shorthand", () => {
		pillo.info("Heads up");
		const item = store.getSnapshot().at(-1);
		expect(item?.title).toBe("Heads up");
		expect(item?.state).toBe("info");
	});

	it("assigns each toast a distinct instanceId", () => {
		pillo.success({ title: "A", id: "a" });
		pillo.success({ title: "B", id: "b" });
		const [a, b] = store.getSnapshot();
		expect(a?.instanceId).not.toBe(b?.instanceId);
	});

	it("replaces a toast that reuses an id", () => {
		pillo.success({ title: "First", id: "dup" });
		pillo.error({ title: "Second", id: "dup" });
		const matching = store.getSnapshot().filter((t) => t.id === "dup");
		expect(matching).toHaveLength(1);
		expect(matching[0]?.title).toBe("Second");
		expect(matching[0]?.state).toBe("error");
	});

	it("update() mutates an existing toast in place", () => {
		const id = pillo.show({ title: "Before", id: "u" });
		pillo.update(id, { title: "After" });
		const item = store.getSnapshot().find((t) => t.id === "u");
		expect(item?.title).toBe("After");
	});

	it("update() is a no-op for an unknown id", () => {
		expect(() => pillo.update("nope", { title: "x" })).not.toThrow();
		expect(store.getSnapshot()).toHaveLength(0);
	});

	it("loading toasts default to a null (persistent) duration", () => {
		pillo.loading({ title: "Working", id: "l" });
		const item = store.getSnapshot().find((t) => t.id === "l");
		expect(item?.duration).toBeNull();
	});
});

describe("store subscription", () => {
	it("notifies subscribers and stops after unsubscribe", () => {
		const seen: PilloItem[][] = [];
		const unsubscribe = store.subscribe((toasts) => seen.push(toasts));

		pillo.success({ title: "One", id: "1" });
		expect(seen.length).toBeGreaterThan(0);

		const countAfterFirst = seen.length;
		unsubscribe();
		pillo.success({ title: "Two", id: "2" });
		expect(seen.length).toBe(countAfterFirst);
	});
});

describe("renderer-facing store handle", () => {
	it("setConfig() supplies the fallback position for new toasts", () => {
		store.setConfig({ position: "bottom-left" });
		pillo.success({ title: "Placed", id: "cfg" });
		const item = store.getSnapshot().find((t) => t.id === "cfg");
		expect(item?.position).toBe("bottom-left");
	});

	it("setConfig() options are merged into every toast", () => {
		store.setConfig({ options: { duration: 1234, roundness: 4 } });
		pillo.show({ title: "Merged", id: "m" });
		const item = store.getSnapshot().find((t) => t.id === "m");
		expect(item?.duration).toBe(1234);
		expect(item?.roundness).toBe(4);
	});

	it("an explicit toast option overrides the store default", () => {
		store.setConfig({ position: "bottom-left" });
		pillo.success({ title: "Own", id: "own", position: "top-center" });
		const item = store.getSnapshot().find((t) => t.id === "own");
		expect(item?.position).toBe("top-center");
	});

	it("registerToaster() tracks mount count and returns a deregister fn", () => {
		const before = store.toasterCount;
		const deregister = store.registerToaster();
		expect(store.toasterCount).toBe(before + 1);
		deregister();
		expect(store.toasterCount).toBe(before);
	});
});

describe("dismiss + exit timers", () => {
	it("marks a toast exiting then removes it after EXIT_DURATION", () => {
		vi.useFakeTimers();
		try {
			pillo.success({ title: "Bye", id: "x" });
			pillo.dismiss("x");
			expect(store.getSnapshot().find((t) => t.id === "x")?.exiting).toBe(true);

			vi.advanceTimersByTime(EXIT_DURATION + 1);
			expect(store.getSnapshot().find((t) => t.id === "x")).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("re-showing an id cancels the orphan exit timer", () => {
		vi.useFakeTimers();
		try {
			pillo.success({ title: "First", id: "race" });
			pillo.dismiss("race");
			pillo.success({ title: "Second", id: "race" });
			vi.advanceTimersByTime(EXIT_DURATION + 1);
			const item = store.getSnapshot().find((t) => t.id === "race");
			expect(item?.title).toBe("Second");
			expect(item?.exiting).toBeFalsy();
		} finally {
			vi.useRealTimers();
		}
	});

	it("clear() cancels in-flight exit timers", () => {
		vi.useFakeTimers();
		try {
			pillo.success({ title: "A", id: "a" });
			pillo.dismiss("a");
			pillo.clear();
			pillo.success({ title: "Fresh", id: "a" });
			vi.advanceTimersByTime(EXIT_DURATION + 1);
			expect(store.getSnapshot().find((t) => t.id === "a")?.title).toBe("Fresh");
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("pillo.promise", () => {
	it("transitions loading → success on resolve", async () => {
		await pillo.promise(Promise.resolve("data"), {
			loading: { title: "Loading", id: "p" },
			success: (data) => ({ title: `Got ${data}` }),
			error: "Failed",
		});
		const item = store.getSnapshot().find((t) => t.id === "p");
		expect(item?.state).toBe("success");
		expect(item?.title).toBe("Got data");
	});

	it("transitions loading → error on reject", async () => {
		await expect(
			pillo.promise(Promise.reject(new Error("nope")), {
				loading: { title: "Loading", id: "pe" },
				success: "Done",
				error: (err) => ({ title: (err as Error).message }),
			}),
		).rejects.toThrow("nope");
		const item = store.getSnapshot().find((t) => t.id === "pe");
		expect(item?.state).toBe("error");
		expect(item?.title).toBe("nope");
	});
});
