export type Frame = {
	canvas: HTMLCanvasElement;
	/** the field only draws on rAF, so force a fresh buffer before reading it */
	redraw: () => void;
	caption: () => string;
	fileName: () => string;
};

/** Draw the current field with a frosted caption plate in the bottom-right corner. */
function compose({ canvas, redraw, caption }: Frame) {
	redraw();
	const W = canvas.width;
	const H = canvas.height;
	const s = W / 1920;
	const out = document.createElement("canvas");
	out.width = W;
	out.height = H;
	const x = out.getContext("2d");
	if (!x) throw new Error("no 2d context");
	x.drawImage(canvas, 0, 0);

	const pw = 560 * s;
	const ph = 168 * s;
	const px = W - pw - 56 * s;
	const py = H - ph - 56 * s;
	const plate = () => {
		x.beginPath();
		x.roundRect(px, py, pw, ph, 46 * s);
	};

	x.save();
	plate();
	x.clip();
	x.filter = `blur(${26 * s}px)`;
	x.drawImage(canvas, -10, -10, W + 20, H + 20);
	x.filter = "none";
	const gr = x.createLinearGradient(px, py, px + pw, py + ph);
	gr.addColorStop(0, "rgba(255,255,255,.2)");
	gr.addColorStop(0.55, "rgba(255,255,255,.06)");
	gr.addColorStop(1, "rgba(255,255,255,.14)");
	x.fillStyle = gr;
	x.fillRect(px, py, pw, ph);
	x.restore();

	plate();
	x.strokeStyle = "rgba(255,255,255,.4)";
	x.lineWidth = 2 * s;
	x.stroke();

	x.textAlign = "left";
	x.fillStyle = "rgba(255,255,255,.96)";
	x.shadowColor = "rgba(10,14,24,.4)";
	x.shadowBlur = 20 * s;
	x.font = `300 ${58 * s}px 'Space Grotesk',sans-serif`;
	x.fillText("views.", px + 40 * s, py + 76 * s);
	x.shadowBlur = 12 * s;
	x.fillStyle = "rgba(255,255,255,.8)";
	x.font = `300 ${23 * s}px 'Space Grotesk',sans-serif`;
	x.fillText(`${caption()} · views.qedk.sh`, px + 40 * s, py + 124 * s);
	return out;
}

async function loadFont(px: number) {
	try {
		await document.fonts.load(`300 ${px}px 'Space Grotesk'`);
	} catch {}
}

async function renderBlob(frame: Frame) {
	await loadFont(86);
	const out = compose(frame);
	const blob = await new Promise<Blob | null>((res) =>
		out.toBlob(res, "image/png"),
	);
	if (!blob) throw new Error("encode failed");
	return blob;
}

/** Last resort when the clipboard is unavailable: paste an <img> and let execCommand take it. */
function legacyCopy(blob: Blob) {
	return new Promise<boolean>((res) => {
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const host = document.createElement("div");
			host.contentEditable = "true";
			host.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
			host.appendChild(img);
			document.body.appendChild(host);
			const range = document.createRange();
			range.selectNode(img);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
			let ok = false;
			try {
				ok = document.execCommand("copy");
			} catch {}
			sel?.removeAllRanges();
			host.remove();
			URL.revokeObjectURL(url);
			res(ok);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			res(false);
		};
		img.src = url;
	});
}

/**
 * Clipboard writes must begin inside the user gesture, so hand ClipboardItem a
 * *promise* of the blob rather than awaiting the render first. Sandboxed frames
 * without clipboard-write still reject, hence the two fallbacks.
 */
export async function copyImage(frame: Frame) {
	if (!navigator.clipboard || !window.ClipboardItem)
		throw new Error("unsupported");
	try {
		window.focus();
	} catch {}
	try {
		await navigator.clipboard.write([
			new ClipboardItem({ "image/png": renderBlob(frame) }),
		]);
		return;
	} catch {}
	const blob = await renderBlob(frame);
	try {
		await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
		return;
	} catch {}
	if (!(await legacyCopy(blob))) throw new Error("blocked");
}

export async function downloadImage(frame: Frame) {
	try {
		await loadFont(58);
		const a = document.createElement("a");
		a.download = `${frame.fileName()}.png`;
		a.href = compose(frame).toDataURL("image/png");
		a.click();
	} catch {}
}
