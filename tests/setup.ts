import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { sileo } from "../src/toast";

afterEach(() => {
	sileo.clear();
	cleanup();
});

if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

if (typeof globalThis.ResizeObserver === "undefined") {
	class MockResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	// biome-ignore lint/suspicious/noExplicitAny: test shim
	(globalThis as any).ResizeObserver = MockResizeObserver;
}
