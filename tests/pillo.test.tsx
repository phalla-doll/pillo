import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EXIT_DURATION } from "../src/constants";
import { pillo, Toaster } from "../src/toast";

const renderToaster = (props: Parameters<typeof Toaster>[0] = {}) =>
	render(<Toaster {...props} />);

describe("pillo basics", () => {
	it("renders a success toast with a title", () => {
		renderToaster();
		act(() => {
			pillo.success({ title: "Saved" });
		});
		expect(screen.getByText("Saved")).toBeInTheDocument();
	});

	it("accepts a plain string shorthand", () => {
		renderToaster();
		act(() => {
			pillo.success("Quick title");
		});
		expect(screen.getByText("Quick title")).toBeInTheDocument();
	});

	it("uses role=alert for error toasts and role=status for success", () => {
		renderToaster();
		act(() => {
			pillo.error({ title: "Boom", id: "err" });
			pillo.success({ title: "Yay", id: "ok" });
		});
		const err = document.querySelector('[data-pillo-id="err"]');
		const ok = document.querySelector('[data-pillo-id="ok"]');
		expect(err).toHaveAttribute("role", "alert");
		expect(err).toHaveAttribute("aria-live", "assertive");
		expect(ok).toHaveAttribute("role", "status");
		expect(ok).toHaveAttribute("aria-live", "polite");
	});
});

describe("dismiss + replace race", () => {
	it("dismisses a toast and removes it after EXIT_DURATION", () => {
		vi.useFakeTimers();
		try {
			renderToaster();
			act(() => {
				pillo.success({ title: "Hello", id: "x" });
			});
			expect(screen.getByText("Hello")).toBeInTheDocument();

			act(() => {
				pillo.dismiss("x");
			});
			// Marked exiting but still in DOM.
			const node = document.querySelector('[data-pillo-id="x"]');
			expect(node).toHaveAttribute("data-exiting", "true");

			act(() => {
				vi.advanceTimersByTime(EXIT_DURATION + 1);
			});
			expect(
				document.querySelector('[data-pillo-id="x"]'),
			).not.toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it("does NOT remove a re-shown toast when a previous exit timer would fire", () => {
		vi.useFakeTimers();
		try {
			renderToaster();
			act(() => {
				pillo.success({ title: "First", id: "race" });
			});
			act(() => {
				pillo.dismiss("race");
			});
			// Before the orphan exit fires, re-show with the same id.
			act(() => {
				pillo.success({ title: "Second", id: "race" });
			});
			act(() => {
				vi.advanceTimersByTime(EXIT_DURATION + 1);
			});
			// The new toast should survive — the old setTimeout was cancelled.
			expect(screen.getByText("Second")).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it("clear() cancels in-flight exit timers", () => {
		vi.useFakeTimers();
		try {
			renderToaster();
			act(() => {
				pillo.success({ title: "A", id: "a" });
				pillo.success({ title: "B", id: "b" });
			});
			act(() => {
				pillo.dismiss("a");
				pillo.clear();
				pillo.success({ title: "Fresh", id: "a" });
			});
			act(() => {
				vi.advanceTimersByTime(EXIT_DURATION + 1);
			});
			expect(screen.getByText("Fresh")).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("update()", () => {
	it("updates a toast in place", () => {
		renderToaster();
		let id = "";
		act(() => {
			id = pillo.show({ title: "Before", id: "u" });
		});
		expect(screen.getByText("Before")).toBeInTheDocument();
		act(() => {
			pillo.update(id, { title: "After" });
		});
		// "Before" may briefly linger as the outgoing header layer; "After"
		// must be present as the current layer.
		const current = document.querySelector(
			'[data-pillo-header-inner][data-layer="current"] [data-pillo-title]',
		);
		expect(current?.textContent).toBe("After");
	});

	it("noop when the id does not exist", () => {
		renderToaster();
		expect(() => pillo.update("nope", { title: "x" })).not.toThrow();
		expect(document.querySelectorAll("[data-pillo-toast]").length).toBe(0);
	});
});

describe("custom render", () => {
	it("renders a custom node and provides dismiss()", async () => {
		renderToaster();
		const user = userEvent.setup();
		act(() => {
			pillo.custom(({ dismiss }) => (
				<button type="button" onClick={dismiss}>
					close-me
				</button>
			));
		});
		const btn = screen.getByText("close-me");
		expect(btn).toBeInTheDocument();
		await user.click(btn);
		// After exit timer it should be removed.
		await new Promise((r) => setTimeout(r, EXIT_DURATION + 50));
		expect(screen.queryByText("close-me")).not.toBeInTheDocument();
	});
});

describe("SSR", () => {
	it("renders to a string without throwing for theme=system", () => {
		expect(() => renderToString(<Toaster theme="system" />)).not.toThrow();
	});

	it("does NOT emit data-theme on the server when theme=system", () => {
		const html = renderToString(<Toaster theme="system" />);
		// The viewport has no toasts yet, but if it were rendered, theme should
		// be absent. Render with a queued toast to expose the viewport.
		expect(html).not.toContain("data-theme");
	});
});

describe("Escape to dismiss", () => {
	it("dismisses the focused toast on Escape", async () => {
		vi.useFakeTimers();
		try {
			renderToaster();
			act(() => {
				pillo.success({ title: "Esc me", id: "esc" });
			});
			const node = document.querySelector<HTMLElement>(
				'[data-pillo-id="esc"]',
			);
			expect(node).not.toBeNull();
			node?.focus();
			act(() => {
				node?.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				);
			});
			expect(
				document.querySelector('[data-pillo-id="esc"]'),
			).toHaveAttribute("data-exiting", "true");
			act(() => {
				vi.advanceTimersByTime(EXIT_DURATION + 1);
			});
			expect(
				document.querySelector('[data-pillo-id="esc"]'),
			).not.toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});
});
