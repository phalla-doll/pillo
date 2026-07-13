import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{ find: "pillo/styles.css", replacement: path.resolve(__dirname, "../src/styles.css") },
			{ find: /^pillo$/, replacement: path.resolve(__dirname, "../src/index.ts") },
		],
	},
	server: { port: 5173, open: true },
});
