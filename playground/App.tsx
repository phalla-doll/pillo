import { useEffect, useState } from "react";
import { pillo, Toaster, type PilloPosition } from "pillo";

const POSITIONS: PilloPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

const REPO_URL = "https://github.com/phalla-doll/pillo";

/* --------------------------------- Icons --------------------------------- */

const iconProps = {
	width: 15,
	height: 15,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	"aria-hidden": true,
};

const SunIcon = () => (
	<svg {...iconProps}>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
	</svg>
);

const MoonIcon = () => (
	<svg {...iconProps}>
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
	</svg>
);

const MonitorIcon = () => (
	<svg {...iconProps}>
		<rect width="20" height="14" x="2" y="3" rx="2" />
		<path d="M8 21h8M12 17v4" />
	</svg>
);

const SparkleIcon = () => (
	<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M12 2l1.9 5.6a4 4 0 0 0 2.5 2.5L22 12l-5.6 1.9a4 4 0 0 0-2.5 2.5L12 22l-1.9-5.6a4 4 0 0 0-2.5-2.5L2 12l5.6-1.9a4 4 0 0 0 2.5-2.5L12 2z" />
	</svg>
);

/* ---------------------------- Theme management ---------------------------- */

type Theme = "light" | "dark" | "system";
const THEME_ORDER: Theme[] = ["system", "light", "dark"];

function useTheme() {
	const [theme, setTheme] = useState<Theme>("dark");

	useEffect(() => {
		const root = document.documentElement;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");

		const apply = () => {
			const resolved =
				theme === "system" ? (mq.matches ? "dark" : "light") : theme;
			root.setAttribute("data-theme", resolved);
		};

		apply();
		if (theme === "system") {
			mq.addEventListener("change", apply);
			return () => mq.removeEventListener("change", apply);
		}
	}, [theme]);

	return [theme, setTheme] as const;
}

/* --------------------------------- App ----------------------------------- */

export default function App() {
	const [position, setPosition] = useState<PilloPosition>("top-right");
	const [theme, setTheme] = useTheme();
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 4);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const cycleTheme = () =>
		setTheme((t) => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length]);

	const ThemeIcon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

	/* ------------------------------ Toast types ------------------------------ */

	const types: { label: string; run: () => void }[] = [
		{
			label: "Success",
			run: () =>
				pillo.success({
					title: "Saved successfully",
					description: "Your changes are now live across all devices.",
				}),
		},
		{
			label: "Error",
			run: () =>
				pillo.error({
					title: "Couldn't save",
					description: "We hit a network error. Check your connection and try again.",
				}),
		},
		{
			label: "Warning",
			run: () =>
				pillo.warning({
					title: "Disk is almost full",
					description: "Less than 1 GB remaining. Free up space to avoid disruptions.",
				}),
		},
		{
			label: "Info",
			run: () =>
				pillo.info({
					title: "New build available",
					description: "Reload the page to pick up the latest release notes and fixes.",
				}),
		},
		{
			label: "Action",
			run: () =>
				pillo.action({
					title: "File deleted",
					description: "You can still undo this.",
					button: { label: "Undo", onClick: () => pillo.success("Restored") },
				}),
		},
		{
			label: "Promise",
			run: () =>
				pillo.promise(
					new Promise((res, rej) =>
						setTimeout(() => (Math.random() > 0.5 ? res("ok") : rej("nope")), 1500),
					),
					{
						loading: { title: "Working…", description: "Crunching the numbers, hang tight." },
						success: { title: "Done!", description: "All tasks completed successfully." },
						error: (e) => ({ title: "Failed", description: `Something went wrong: ${String(e)}` }),
					},
				),
		},
		{
			label: "Icon",
			run: () =>
				pillo.show({
					title: "Custom icon",
					description: "Any ReactNode works as the toast icon.",
					icon: <SparkleIcon />,
				}),
		},
	];

	/* ---------------------------- Utility actions ---------------------------- */

	const utilities: { label: string; run: () => void }[] = [
		{
			label: "Loading → success",
			run: () => {
				const id = pillo.loading({
					title: "Uploading…",
					description: "Sending report.pdf to the server.",
				});
				setTimeout(
					() =>
						pillo.update(id, {
							type: "success",
							title: "Uploaded!",
							description: "report.pdf is now available in your shared drive.",
						}),
					1500,
				);
			},
		},
		{
			label: "Custom JSX",
			run: () =>
				pillo.custom(({ id, dismiss }) => (
					<div role="status" style={{ padding: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 6 }}>Custom JSX</div>
						<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>id: {id}</div>
						<button className="pill is-ghost" onClick={dismiss}>
							Close
						</button>
					</div>
				)),
		},
		{ label: "Queue 5", run: () => { for (let i = 0; i < 5; i++) pillo.info(`Toast #${i + 1}`); } },
		{ label: "Clear all", run: () => pillo.clear() },
	];

	return (
		<div className="page">
			<nav className="nav shell" data-scrolled={scrolled}>
				<a className="nav-brand" href={REPO_URL}>
					Pillo<span className="dot">.</span>
				</a>
				<div className="nav-links">
					<a className="nav-link" href={REPO_URL} target="_blank" rel="noreferrer">
						GitHub
					</a>
					<a className="nav-link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
						Docs
					</a>
					<a className="nav-link" href="#playground">
						Playground
					</a>
					<button
						type="button"
						className="theme-btn"
						onClick={cycleTheme}
						title={`Theme: ${theme}`}
						aria-label={`Theme: ${theme}. Click to change.`}
					>
						<ThemeIcon />
					</button>
				</div>
			</nav>

			<main className="hero shell" id="playground">
				<h1 className="wordmark">
					Playground<span className="dot">.</span>
				</h1>
				<p className="tagline">Pick a position, click any type to fire it live.</p>
			</main>

			<section className="controls shell">
				<div className="pill-row" role="radiogroup" aria-label="Toast position">
					{POSITIONS.map((p) => (
						<button
							key={p}
							type="button"
							role="radio"
							aria-checked={position === p}
							className="pill is-pos"
							data-active={position === p}
							onClick={() => setPosition(p)}
						>
							{p}
						</button>
					))}
				</div>

				<div className="divider" aria-hidden="true" />

				<div className="pill-row">
					{types.map((t) => (
						<button key={t.label} type="button" className="pill" onClick={t.run}>
							{t.label}
						</button>
					))}
				</div>

				<div className="pill-row">
					{utilities.map((u) => (
						<button key={u.label} type="button" className="pill is-ghost" onClick={u.run}>
							{u.label}
						</button>
					))}
				</div>
			</section>

			<footer className="foot shell">
				<span>Pillo — MIT License</span>
				<a href="#playground">Playground →</a>
			</footer>

			<Toaster position={position} theme={theme} />
		</div>
	);
}
