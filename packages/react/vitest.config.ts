import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// Resolve the workspace core package to its source during tests so we
		// don't require a prior build.
		alias: {
			"@pillo/core": path.resolve(__dirname, "../core/src/index.ts"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		css: false,
	},
});
