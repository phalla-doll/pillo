import { act, render, screen } from "@testing-library/react";
// Import the imperative API straight from core, and the renderer from this
// package's public entry. The whole point of the split is that these two talk
// to ONE shared store singleton.
import { pillo as corePillo, store } from "@pillo/core";
import { describe, expect, it } from "vitest";
import { pillo as reactPillo, Toaster } from "../src";

describe("core ⇄ react share one store singleton", () => {
	it("re-exports the exact same pillo object from core", () => {
		// If react ever re-implemented (or a second core copy were bundled) this
		// identity would break — the regression the build keeps @pillo/core
		// external to prevent.
		expect(reactPillo).toBe(corePillo);
	});

	it("renders a toast fired through core's pillo into react's Toaster", () => {
		render(<Toaster />);
		act(() => {
			corePillo.success({ title: "From core", id: "x" });
		});
		expect(screen.getByText("From core")).toBeInTheDocument();
	});

	it("drains toasts queued before the Toaster mounts (getSnapshot seam)", () => {
		// Fire while nothing is subscribed — it sits in the store...
		act(() => {
			corePillo.info({ title: "Queued early", id: "q" });
		});
		expect(store.getSnapshot().some((t) => t.id === "q")).toBe(true);
		// ...then mounting pulls the current snapshot and renders it.
		render(<Toaster />);
		expect(screen.getByText("Queued early")).toBeInTheDocument();
	});

	it("applies the mounted Toaster's position to store-config'd toasts", () => {
		render(<Toaster position="bottom-center" />);
		act(() => {
			// No explicit position on the toast → it inherits store.position, which
			// the Toaster set via store.setConfig().
			corePillo.success({ title: "Placed", id: "p" });
		});
		const viewport = document.querySelector("[data-pillo-viewport]");
		expect(viewport).toHaveAttribute("data-position", "bottom-center");
	});
});
