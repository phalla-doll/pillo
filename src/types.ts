import type { ReactNode } from "react";

export type PilloState =
	| "success"
	| "loading"
	| "error"
	| "warning"
	| "info"
	| "action"
	| "custom";

export interface PilloStyles {
	title?: string;
	description?: string;
	badge?: string;
	button?: string;
}

export interface PilloButton {
	label: string;
	onClick: () => void;
}

export const PILLO_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const;

export type PilloPosition = (typeof PILLO_POSITIONS)[number];

export interface PilloCustomRenderProps {
	id: string;
	dismiss: () => void;
}

export type PilloCustomRender = (props: PilloCustomRenderProps) => ReactNode;

export interface PilloOptions {
	id?: string;
	title?: string;
	description?: ReactNode;
	type?: PilloState;
	position?: PilloPosition;
	duration?: number | null;
	icon?: ReactNode;
	styles?: PilloStyles;
	fill?: string;
	roundness?: number;
	autopilot?: false | { expand?: number; collapse?: number };
	button?: PilloButton;
	custom?: PilloCustomRender;
}
