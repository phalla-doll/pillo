// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The store is a singleton that only works if exactly ONE copy of @pillo/core
// loads. bunchee will happily inline core's source into this bundle if the
// build tsconfig's `paths` map points at it — silently creating a second store.
// These assertions run against the built artifact to lock that door.
//
// They only run after `bun run build`; a plain `vitest run` on unbuilt sources
// skips them (nothing to inspect yet).
const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const esm = `${distDir}index.mjs`;
const cjs = `${distDir}index.js`;
const built = existsSync(esm) && existsSync(cjs);

const read = (p: string) => readFileSync(p, "latin1");

describe.skipIf(!built)("published bundle keeps @pillo/core external", () => {
	it("imports the store from @pillo/core (ESM) rather than inlining it", () => {
		const code = read(esm);
		expect(code).toMatch(/from ?["']@pillo\/core["']/);
	});

	it("requires @pillo/core (CJS) rather than inlining it", () => {
		const code = read(cjs);
		expect(code).toMatch(/require\(["']@pillo\/core["']\)/);
	});

	it("does not contain core's store internals", () => {
		// These identifiers live only inside core's store module. If they appear
		// here, core was bundled in — a second singleton.
		for (const marker of ["createToast", "mergeOptions", "buildPilloItem"]) {
			expect(read(esm)).not.toContain(marker);
			expect(read(cjs)).not.toContain(marker);
		}
	});
});
