"use client";

import type {
	PilloCustomRender as CoreCustomRender,
	PilloOptions as CoreOptions,
} from "@pillo/core";
import type { ReactNode } from "react";

export { pillo } from "@pillo/core";
export type {
	PilloButton,
	PilloCustomRenderProps,
	PilloPosition,
	PilloPromiseOptions,
	PilloState,
	PilloStyles,
} from "@pillo/core";
export { Toaster } from "./Toaster";
export type { PilloToasterProps } from "./Toaster";

// React-specialized public aliases so consumers keep a clean ReactNode API.
export type PilloOptions = CoreOptions<ReactNode>;
export type PilloCustomRender = CoreCustomRender<ReactNode>;
