import { useState } from "react";
import { sileo, Toaster, type SileoPosition } from "sileo";

const POSITIONS: SileoPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

const SunIcon = () => (
	<svg
		width="15"
		height="15"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
	</svg>
);

const MoonIcon = () => (
	<svg
		width="15"
		height="15"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
	</svg>
);

const MonitorIcon = () => (
	<svg
		width="15"
		height="15"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<rect width="20" height="14" x="2" y="3" rx="2" />
		<path d="M8 21h8M12 17v4" />
	</svg>
);

export default function App() {
	const [position, setPosition] = useState<SileoPosition>("bottom-right");
	const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

	return (
		<div className="wrap">
			<h1>Sileo playground</h1>
			<p className="sub">Imports the library directly from <code>../src</code>. Edit and save — Vite HMR reloads.</p>

			<fieldset className="toaster-config">
				<legend>Toaster</legend>

				<div className="control-row">
					<span className="control-label">Position</span>
					<div
						className="picker-grid"
						role="radiogroup"
						aria-label="Toast position"
					>
						{POSITIONS.map((p) => (
							<button
								key={p}
								type="button"
								role="radio"
								aria-checked={position === p}
								className="picker-cell"
								data-active={position === p}
								data-pos={p}
								onClick={() => setPosition(p)}
								title={p}
							>
								<span className="picker-dot" />
							</button>
						))}
					</div>
					<span className="picker-readout">
						Toasts appear: <strong>{position}</strong>
					</span>
				</div>

				<div className="control-row">
					<span className="control-label">Theme</span>
					<div className="theme-toggle" role="radiogroup" aria-label="Theme">
						{(["light", "dark", "system"] as const).map((t) => (
							<button
								key={t}
								type="button"
								role="radio"
								aria-checked={theme === t}
								className="theme-seg"
								data-active={theme === t}
								onClick={() => setTheme(t)}
							>
								{t === "light" ? (
									<SunIcon />
								) : t === "dark" ? (
									<MoonIcon />
								) : (
									<MonitorIcon />
								)}
								<span>{t}</span>
							</button>
						))}
					</div>
				</div>
			</fieldset>

			<fieldset>
				<legend>Basics</legend>
				<div className="grid">
					<button
						onClick={() =>
							sileo.success({
								title: "Saved successfully",
								description: "Your changes are now live across all devices.",
							})
						}
					>
						success
					</button>
					<button
						onClick={() =>
							sileo.error({
								title: "Couldn't save",
								description: "We hit a network error. Please check your connection and try again.",
							})
						}
					>
						error
					</button>
					<button
						onClick={() =>
							sileo.warning({
								title: "Disk is almost full",
								description: "You have less than 1 GB remaining. Free up space to avoid disruptions.",
							})
						}
					>
						warning
					</button>
					<button
						onClick={() =>
							sileo.info({
								title: "Heads up — new build available",
								description: "Reload the page to pick up the latest release notes and fixes.",
							})
						}
					>
						info
					</button>
					<button
						onClick={() =>
							sileo.loading({
								title: "Uploading…",
								description: "Transferring 12 files to the server. This may take a moment.",
							})
						}
					>
						loading
					</button>
					<button
						onClick={() =>
							sileo.show({
								title: "Generic toast",
								description: "This one uses sileo.show with no explicit type.",
							})
						}
					>
						show
					</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>Action + update</legend>
				<div className="grid">
					<button
						onClick={() =>
							sileo.action({
								title: "File deleted",
								description: "You can still undo this.",
								button: { label: "Undo", onClick: () => sileo.success("Restored") },
							})
						}
					>
						action
					</button>
					<button
						onClick={() => {
							const id = sileo.loading({
								title: "Uploading…",
								description: "Sending report.pdf to the server.",
							});
							setTimeout(
								() =>
									sileo.update(id, {
										type: "success",
										title: "Uploaded!",
										description: "report.pdf is now available in your shared drive.",
									}),
								1500,
							);
						}}
					>
						loading → success
					</button>
					<button
						onClick={() =>
							sileo.promise(
								new Promise((res, rej) => setTimeout(() => (Math.random() > 0.5 ? res("ok") : rej("nope")), 1500)),
								{
									loading: { title: "Working…", description: "Crunching the numbers, hang tight." },
									success: { title: "Done!", description: "All tasks completed successfully." },
									error: (e) => ({
										title: "Failed",
										description: `Something went wrong: ${String(e)}`,
									}),
								},
							)
						}
					>
						promise (random)
					</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>Custom + dismiss</legend>
				<div className="grid">
					<button
						onClick={() =>
							sileo.custom(({ id, dismiss }) => (
								<div role="status" style={{ padding: 12 }}>
									<div style={{ fontWeight: 600, marginBottom: 6 }}>Custom JSX</div>
									<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>id: {id}</div>
									<button onClick={dismiss}>Close</button>
								</div>
							))
						}
					>
						custom
					</button>
					<button onClick={() => sileo.clear()}>clear all</button>
					<button onClick={() => sileo.clear(position)}>clear at position</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>Stress</legend>
				<div className="grid">
					<button
						onClick={() => {
							for (let i = 0; i < 5; i++) sileo.info(`Toast #${i + 1}`);
						}}
					>
						queue 5
					</button>
				</div>
			</fieldset>

			<Toaster position={position} theme={theme} />
		</div>
	);
}
