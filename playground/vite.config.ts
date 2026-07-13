import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ command }) => ({
	// Served from https://phalla-doll.github.io/pillo/ on GitHub Pages, but from
	// root during local dev.
	base: command === "build" ? "/pillo/" : "/",
	plugins: [react()],
	resolve: {
		// The playground aliases `pillo` to the library source, so React must be
		// deduped to a single copy or hooks break at build time.
		dedupe: ["react", "react-dom"],
		alias: [
			{ find: "pillo/styles.css", replacement: path.resolve(__dirname, "../src/styles.css") },
			{ find: /^pillo$/, replacement: path.resolve(__dirname, "../src/index.ts") },
		],
	},
	server: { port: 5173, open: true },
}));
