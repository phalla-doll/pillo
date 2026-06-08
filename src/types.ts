import type { ReactNode } from "react";

export type SileoState =
	| "success"
	| "loading"
	| "error"
	| "warning"
	| "info"
	| "action"
	| "custom";

export interface SileoStyles {
	title?: string;
	description?: string;
	badge?: string;
	button?: string;
}

export interface SileoButton {
	label: string;
	onClick: () => void;
}

export const SILEO_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const;

export type SileoPosition = (typeof SILEO_POSITIONS)[number];

export interface SileoCustomRenderProps {
	id: string;
	dismiss: () => void;
}

export type SileoCustomRender = (props: SileoCustomRenderProps) => ReactNode;

export interface SileoOptions {
	id?: string;
	title?: string;
	description?: ReactNode;
	type?: SileoState;
	position?: SileoPosition;
	duration?: number | null;
	icon?: ReactNode;
	styles?: SileoStyles;
	fill?: string;
	roundness?: number;
	autopilot?: false | { expand?: number; collapse?: number };
	button?: SileoButton;
	custom?: SileoCustomRender;
}
