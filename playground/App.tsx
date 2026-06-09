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

export default function App() {
	const [position, setPosition] = useState<SileoPosition>("bottom-right");
	const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

	return (
		<div className="wrap">
			<h1>Sileo playground</h1>
			<p className="sub">Imports the library directly from <code>../src</code>. Edit and save — Vite HMR reloads.</p>

			<fieldset>
				<legend>Toaster</legend>
				<div>
					<strong style={{ marginRight: 12 }}>Position:</strong>
					{POSITIONS.map((p) => (
						<label key={p}>
							<input
								type="radio"
								name="position"
								checked={position === p}
								onChange={() => setPosition(p)}
							/>
							{p}
						</label>
					))}
				</div>
				<div style={{ marginTop: 10 }}>
					<strong style={{ marginRight: 12 }}>Theme:</strong>
					{(["light", "dark", "system"] as const).map((t) => (
						<label key={t}>
							<input
								type="radio"
								name="theme"
								checked={theme === t}
								onChange={() => setTheme(t)}
							/>
							{t}
						</label>
					))}
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
