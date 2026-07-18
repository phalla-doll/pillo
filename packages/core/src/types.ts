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

// `Slot` is whatever a given renderer accepts as embeddable content. React
// specializes it to ReactNode; Angular to string | TemplateRef | Type. Core
// treats it as opaque and only ever passes it through.
export type PilloCustomRender<Slot = unknown> = (
	props: PilloCustomRenderProps,
) => Slot;

export interface PilloOptions<Slot = unknown> {
	id?: string;
	title?: string;
	description?: Slot;
	type?: PilloState;
	position?: PilloPosition;
	duration?: number | null;
	icon?: Slot;
	styles?: PilloStyles;
	fill?: string;
	roundness?: number;
	autopilot?: false | { expand?: number; collapse?: number };
	button?: PilloButton;
	custom?: PilloCustomRender<Slot>;
}
