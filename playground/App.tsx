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

/* Framework logos — icons only, sourced from svgl.app (https://svgl.app/docs/api).
   Stacked as overlapping "coin" chips to hint that Pillo is framework-agnostic. */
const FRAMEWORKS: { name: string; src: string }[] = [
	{ name: "React", src: "https://svgl.app/library/react_dark.svg" },
	{ name: "Next.js", src: "https://svgl.app/library/nextjs_icon_dark.svg" },
	{ name: "Vue", src: "https://svgl.app/library/vue.svg" },
	{ name: "Angular", src: "https://svgl.app/library/angular.svg" },
	{ name: "Svelte", src: "https://svgl.app/library/svelte.svg" },
	{ name: "Solid", src: "https://svgl.app/library/solidjs.svg" },
];

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
					title: "Payment received",
					description: "$1,290.00 from Northwind Traders cleared. Receipt sent to billing@northwind.co.",
				}),
		},
		{
			label: "Error",
			run: () =>
				pillo.error({
					title: "Deploy failed",
					description: "Build #482 exited with code 1 — 3 type errors in checkout.ts. Check the logs to retry.",
				}),
		},
		{
			label: "Warning",
			run: () =>
				pillo.warning({
					title: "Storage almost full",
					description: "You've used 19.2 GB of 20 GB. New uploads will pause once you reach the limit.",
				}),
		},
		{
			label: "Info",
			run: () =>
				pillo.info({
					title: "Version 2.4.0 is available",
					description: "Reload to pick up faster search, dark-mode fixes, and 11 other improvements.",
				}),
		},
		{
			label: "Action",
			run: () =>
				pillo.action({
					title: "File moved to Trash",
					description: "Q3-forecast.xlsx will be permanently deleted in 30 days.",
					button: {
						label: "Undo",
						onClick: () => pillo.success("Restored Q3-forecast.xlsx"),
					},
					styles: { button: "pg-action-btn" },
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
						loading: {
							title: "Publishing post…",
							description: "Pushing “Designing in the open” to your blog.",
						},
						success: {
							title: "Post published",
							description: "“Designing in the open” is now live at yoursite.com/blog.",
						},
						error: () => ({
							title: "Publish failed",
							description: "Couldn't reach the CMS. Your draft is saved — try again in a moment.",
						}),
					},
				),
		},
		{
			label: "Icon",
			run: () =>
				pillo.show({
					title: "Weekly summary ready",
					description: "Your digest of 27 unread threads across 4 channels is ready to read.",
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
					title: "Uploading report.pdf…",
					description: "3.4 MB · sending to the Q3 Reports drive.",
				});
				setTimeout(
					() =>
						pillo.update(id, {
							type: "success",
							title: "Upload complete",
							description: "report.pdf is now in Q3 Reports and shared with 4 people.",
						}),
					1500,
				);
			},
		},
		{
			label: "Custom JSX",
			run: () =>
				pillo.custom(({ dismiss }) => (
					<div role="status" style={{ padding: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 4 }}>Maya sent you a file</div>
						<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
							brand-guidelines-v3.pdf · 8.1 MB
						</div>
						<button className="pill is-ghost" onClick={dismiss}>
							Dismiss
						</button>
					</div>
				)),
		},
		{
			label: "Queue 5",
			run: () => {
				const feed = [
					"Maya approved your pull request",
					"CI passed on main · 2m 14s",
					"Deploy to production succeeded",
					"New sign-up: dana@acme.co",
					"Nightly backup complete · 4.2 GB",
				];
				feed.forEach((title, i) => pillo.info({ id: `feed-${i}`, title }));
			},
		},
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
				<div
					className="framework-hint"
					aria-label={`Works with any framework — ${FRAMEWORKS.map((f) => f.name).join(", ")}, and more`}
				>
					<ul className="fw-stack" aria-hidden="true">
						{FRAMEWORKS.map((f) => (
							<li key={f.name} className="fw-chip" title={f.name}>
								<img src={f.src} alt="" width={20} height={20} loading="lazy" />
							</li>
						))}
					</ul>
					<span className="fw-hint-text">Works with any framework</span>
				</div>
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
			</footer>

			<Toaster position={position} theme={theme} />
		</div>
	);
}
