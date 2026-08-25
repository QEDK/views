import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Ambient } from "./audio";
import { Field, type View } from "./field";
import { copyImage, downloadImage, type Frame, renderBlob } from "./snapshot";

type ViewsProps = {
	/** speed of the field's internal time */
	motion?: number;
	/** seconds of stillness before the chrome fades out */
	fadeDelay?: number;
	volume?: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** local wall-clock time; `sep` is dropped for filenames, where a colon is unsafe */
const clockStr = (sep = ":") => {
	const d = new Date();
	return `${pad(d.getHours())}${sep}${pad(d.getMinutes())}`;
};

const MAG_LIGHT = (x: string, y: number) =>
	`radial-gradient(120px 90px at ${x}% ${y}%, rgba(255,255,255,.28), rgba(255,255,255,.07) 55%, rgba(255,255,255,0) 75%),` +
	`radial-gradient(160px 120px at ${x}% ${y - 40}%, rgba(255,255,255,.12), rgba(255,255,255,0) 70%)`;

const SPEAKER = "M11 5.5 6.8 9H4v6h2.8L11 18.5z";

/**
 * Whether to hand off to the OS share sheet instead of the X web intent. Asked
 * synchronously, while the click still counts as user activation, and probed
 * with a throwaway file rather than the real render.
 *
 * Gated on a coarse pointer so desktop keeps the intent link: Chrome on Windows
 * and Safari on macOS both advertise file sharing, but there the sheet is a
 * detour and the intent goes straight to a compose box.
 */
const preferShareSheet = () => {
	if (typeof navigator === "undefined" || !navigator.canShare) return false;
	if (!window.matchMedia?.("(pointer: coarse)").matches) return false;
	try {
		return navigator.canShare({
			files: [new File([new Uint8Array(1)], "v.png", { type: "image/png" })],
		});
	} catch {
		return false;
	}
};

export function Views({ motion = 2, fadeDelay = 4, volume = 0.7 }: ViewsProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);
	const markRef = useRef<HTMLButtonElement>(null);
	const fieldRef = useRef<Field | null>(null);
	const audioRef = useRef<Ambient | null>(null);

	const [view, setView] = useState<View>({ seedId: "····", modeName: "" });
	const [clock, setClock] = useState("");
	const [navUp, setNavUp] = useState(false);
	const [menu, setMenu] = useState<"closed" | "open" | "closing">("closed");
	const [muted, setMuted] = useState(false);
	const [vol, setVol] = useState(volume);
	const [toast, setToast] = useState<string | null>(null);

	const menuRef = useRef(menu);
	const hoverRef = useRef(false);
	const prevVolRef = useRef(0);
	const magRef = useRef<HTMLElement | null>(null);
	const delayRef = useRef(fadeDelay);
	const navTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const menuTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const setMenuState = useCallback((next: "closed" | "open" | "closing") => {
		menuRef.current = next;
		setMenu(next);
	}, []);

	const hideNav = useCallback(() => {
		// hold the chrome open while it is being used
		if (hoverRef.current || menuRef.current !== "closed") {
			navTimer.current = setTimeout(hideNav, 1500);
			return;
		}
		setNavUp(false);
	}, []);

	const showNav = useCallback(() => {
		setNavUp(true);
		clearTimeout(navTimer.current);
		navTimer.current = setTimeout(hideNav, delayRef.current * 1000);
	}, [hideNav]);

	const hideNavNow = useCallback(() => {
		clearTimeout(navTimer.current);
		hoverRef.current = false;
		if (menuRef.current !== "closed") setMenuState("closed");
		setNavUp(false);
	}, [setMenuState]);

	const closeMenu = useCallback(() => {
		if (menuRef.current !== "open") return;
		clearTimeout(menuTimer.current);
		setMenuState("closing");
		menuTimer.current = setTimeout(() => setMenuState("closed"), 210);
	}, [setMenuState]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const spacer = spacerRef.current;
		if (!canvas || !spacer) return;

		const audio = new Ambient();
		audioRef.current = audio;
		const field = new Field(canvas, spacer, {
			onNavShow: showNav,
			onNavHide: hideNavNow,
			onGesture: audio.start,
		});
		fieldRef.current = field;
		setView(field.roll(true));

		const onMove = (e: MouseEvent) => {
			if (e.clientY < 80) showNav();
			const target =
				e.target instanceof Element ? e.target.closest("[data-mag]") : null;
			const el = target instanceof HTMLElement ? target : null;
			if (magRef.current && magRef.current !== el) {
				magRef.current.style.removeProperty("--vw-mag");
				magRef.current = null;
			}
			if (!el) return;
			magRef.current = el;
			const r = el.getBoundingClientRect();
			const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
			const y = ((e.clientY - r.top) / r.height) * 100;
			el.style.setProperty("--vw-mag", MAG_LIGHT(x, y));
		};

		const gestures = ["pointerdown", "keydown", "touchend"] as const;
		window.addEventListener("mousemove", onMove, { passive: true });
		for (const g of gestures) window.addEventListener(g, audio.start);

		setClock(clockStr());
		const clockIV = setInterval(() => setClock(clockStr()), 15000);
		const intro = requestAnimationFrame(showNav);

		return () => {
			field.destroy();
			audio.destroy();
			window.removeEventListener("mousemove", onMove);
			for (const g of gestures) window.removeEventListener(g, audio.start);
			clearInterval(clockIV);
			cancelAnimationFrame(intro);
			clearTimeout(navTimer.current);
			clearTimeout(menuTimer.current);
			clearTimeout(toastTimer.current);
		};
	}, [showNav, hideNavNow]);

	// live-tunable props, applied without rebuilding the engine
	useEffect(() => {
		delayRef.current = fadeDelay;
	}, [fadeDelay]);

	useEffect(() => {
		if (fieldRef.current) fieldRef.current.motion = motion;
	}, [motion]);

	useEffect(() => {
		audioRef.current?.setLevel(vol, muted);
	}, [vol, muted]);

	const showToast = (msg: string) => {
		clearTimeout(toastTimer.current);
		setToast(msg);
		toastTimer.current = setTimeout(() => setToast(null), 3600);
	};

	const label = (sep?: string) =>
		`view no. ${view.seedId} · ${view.modeName} · ${clockStr(sep)}`;

	const frame = (): Frame | null => {
		const canvas = canvasRef.current;
		const field = fieldRef.current;
		if (!canvas || !field) return null;
		return {
			canvas,
			redraw: () => field.redraw(),
			caption: () => label(),
			fileName: () => label(""),
		};
	};

	const toggleMute = () => {
		const audio = audioRef.current;
		const started = audio?.started ?? false;
		audio?.start();
		// the first press is really "turn the sound on", whatever the icon says
		if (!started) {
			setMuted(false);
			return;
		}
		if (muted) {
			setVol(prevVolRef.current > 0.02 ? prevVolRef.current : volume);
			setMuted(false);
		} else {
			prevVolRef.current = vol;
			setVol(0);
			setMuted(true);
		}
	};

	const toggleMenu = () => {
		clearTimeout(navTimer.current);
		if (menuRef.current === "closed") setMenuState("open");
		else closeMenu();
	};

	const newView = () => {
		const field = fieldRef.current;
		if (!field) return;
		setView(field.roll());
		setMenuState("closed");
		showNav();
	};

	/** At the top there is nothing to scroll back to, so the field exhales instead. */
	const toTop = () => {
		const mark = markRef.current;
		if (mark) {
			// restart rather than replay: re-clicking mid-animation should retrigger
			mark.style.animation = "none";
			void mark.offsetWidth;
			mark.style.animation = "vwBreath 1.1s cubic-bezier(.22,.61,.36,1)";
		}
		if (window.scrollY > 1) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			fieldRef.current?.nudge();
			if (audioRef.current?.started && !muted) audioRef.current.bell();
		}
		showNav();
	};

	const saveImage = async () => {
		closeMenu();
		const f = frame();
		if (f) await downloadImage(f);
	};

	const copy = async () => {
		const f = frame();
		if (!f) return false;
		try {
			await copyImage(f);
			return true;
		} catch {
			await downloadImage(f);
			return false;
		}
	};

	const onCopy = async () => {
		closeMenu();
		showToast(
			(await copy())
				? "image copied — paste it anywhere (ctrl / ⌘ + V)"
				: "clipboard blocked in this frame — image downloaded instead",
		);
	};

	const onShare = async () => {
		closeMenu();
		const f = frame();
		if (!f) return;
		const caption = `${label()} · views.qedk.sh`;

		// Phones: hand the image to the OS sheet, which lists the X app itself.
		// A web intent would only ever land in the browser, and there is nothing
		// to paste from on a touch keyboard.
		if (preferShareSheet()) {
			try {
				const blob = await renderBlob(f);
				const file = new File([blob], `${f.fileName()}.png`, {
					type: "image/png",
				});
				await navigator.share({ files: [file], text: caption });
				return;
			} catch (e) {
				if ((e as DOMException)?.name === "AbortError") return;
			}
		}

		// Desktop: claim the tab now. Opening it after the await below would be
		// past the user gesture, and the popup blocker eats it.
		const tab = window.open("", "_blank");
		const copied = await copy();
		showToast(
			copied
				? "image copied — paste it into your post (ctrl / ⌘ + V)"
				: "image downloaded — attach it to your post",
		);
		const text = `${caption}\n\n[paste your image here — ctrl / ⌘ + V]`;
		const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
		if (tab) {
			tab.opener = null;
			tab.location.replace(url);
		} else {
			window.open(url, "_blank", "noopener");
		}
	};

	const pinNav = () => {
		hoverRef.current = true;
		clearTimeout(navTimer.current);
	};

	const unpinNav = () => {
		hoverRef.current = false;
		clearTimeout(navTimer.current);
		navTimer.current = setTimeout(hideNav, delayRef.current * 1000);
	};

	const up = navUp ? " is-up" : "";

	return (
		<>
			<canvas ref={canvasRef} className="vw-canvas" />
			<div ref={spacerRef} className="vw-spacer" />

			<div className={`vw-nav${up}`}>
				<nav className="vw-dock" onMouseEnter={pinNav} onMouseLeave={unpinNav}>
					<div className="vw-pill vw-glass" data-mag>
						<button
							type="button"
							data-mag
							className="vw-icon-btn"
							aria-label="toggle sound"
							onClick={toggleMute}
						>
							<Icon key={muted ? "muted" : "on"}>
								<path d={SPEAKER} />
								{muted ? (
									<>
										<path d="M16 9.5l5 5" />
										<path d="M21 9.5l-5 5" />
									</>
								) : (
									<>
										<path d="M15 9a4.4 4.4 0 0 1 0 6" />
										<path d="M17.8 6.6a8.4 8.4 0 0 1 0 10.8" />
									</>
								)}
							</Icon>
						</button>
						<button
							type="button"
							data-mag
							className="vw-icon-btn"
							aria-label="menu"
							aria-expanded={menu === "open"}
							onClick={toggleMenu}
						>
							{menu === "open" ? (
								<Icon key="x">
									<path d="M6.5 6.5l11 11" />
									<path d="M17.5 6.5l-11 11" />
								</Icon>
							) : (
								<Icon key="bars">
									<path d="M4.5 9h15" />
									<path d="M4.5 15h15" />
								</Icon>
							)}
						</button>
					</div>

					{menu !== "closed" && (
						<div
							className={`vw-menu vw-glass${menu === "closing" ? " is-closing" : ""}`}
						>
							<div className="vw-menu-meta">
								view no. {view.seedId} · {view.modeName} · {clock}
							</div>
							<button type="button" className="vw-menu-item" onClick={newView}>
								new view
							</button>
							<button
								type="button"
								className="vw-menu-item"
								onClick={saveImage}
							>
								save image
							</button>
							<button type="button" className="vw-menu-item" onClick={onCopy}>
								copy image
							</button>
							<button type="button" className="vw-menu-item" onClick={onShare}>
								share image
							</button>

							<div className="vw-rule" />
							<div className="vw-vol-row">
								<button
									type="button"
									className="vw-mute"
									aria-label="mute"
									onClick={toggleMute}
								>
									<Icon key={muted ? "muted" : "on"} size={14}>
										<path d={SPEAKER} />
										{muted ? (
											<>
												<path d="M16 9.5l5 5" />
												<path d="M21 9.5l-5 5" />
											</>
										) : (
											<path d="M15 9a4.4 4.4 0 0 1 0 6" />
										)}
									</Icon>
								</button>
								<input
									id="vw-vol"
									type="range"
									min="0"
									max="1"
									step="0.01"
									value={vol}
									aria-label="volume"
									style={
										{
											"--vw-fill": `${(vol * 100).toFixed(0)}%`,
										} as CSSProperties
									}
									onChange={(e) => {
										audioRef.current?.start();
										const v = Number.parseFloat(e.target.value);
										setVol(v);
										setMuted(v <= 0);
									}}
								/>
							</div>

							<div className="vw-rule" />
							<a
								className="vw-menu-link"
								href="https://x.com/qedk_"
								target="_blank"
								rel="noopener"
							>
								<span>@qedk_</span>
								<span className="vw-menu-link-tag">
									x
									<Arrow />
								</span>
							</a>
							<a
								className="vw-menu-link"
								href="https://qedk.xyz"
								target="_blank"
								rel="noopener"
							>
								<span>qedk.xyz</span>
								<span className="vw-menu-link-tag">
									site
									<Arrow />
								</span>
							</a>

							<div className="vw-rule" />
							<p className="vw-menu-note">
								endless abstract views, generated live in your browser. every
								visit is one of a kind — scroll to drift.
							</p>
							<p className="vw-menu-note is-dim">
								sound: generative ambient, nothing owned, nothing shared.
							</p>
						</div>
					)}
				</nav>
			</div>

			<button
				type="button"
				ref={markRef}
				className={`vw-mark vw-glass${up}`}
				data-mag
				aria-label="views. — back to top"
				onClick={toTop}
				onMouseEnter={pinNav}
				onMouseLeave={unpinNav}
			>
				views.
			</button>

			{toast && <div className="vw-toast vw-glass">{toast}</div>}
		</>
	);
}

function Icon({
	children,
	size = 17,
	...rest
}: {
	children: React.ReactNode;
	size?: number;
}) {
	return (
		<svg
			{...rest}
			className="vw-icon-in"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

function Arrow() {
	return (
		<svg
			width="11"
			height="11"
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.3"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M3.2 8.8 8.8 3.2" />
			<path d="M4.6 3.2h4.2v4.2" />
		</svg>
	);
}
