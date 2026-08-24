/** Five-voice chords, each held ~12s and overlapping the next by a couple of seconds. */
const PROGRESSION = [
	[45, 57, 64, 71, 76],
	[41, 53, 60, 69, 76],
	[48, 55, 64, 67, 74],
	[43, 55, 62, 67, 74],
	[45, 57, 64, 72, 76],
	[38, 50, 57, 65, 74],
];

const BELL_NOTES = [69, 72, 74, 76, 79, 81];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Generative ambient pad: a slow chord loop through a lowpass into a noise
 * reverb, with an occasional bell on top. Nothing is sampled or streamed.
 * Browsers block audio until a gesture, so `resume` is safe to call repeatedly
 * and only lights the engine once the context is actually running.
 */
export class Ambient {
	started = false;

	private ac: AudioContext | null = null;
	private master: GainNode | null = null;
	private dry: GainNode | null = null;
	private verb: ConvolverNode | null = null;
	private chordI = 0;
	private chordTO: ReturnType<typeof setTimeout> | undefined;
	private bellTO: ReturnType<typeof setTimeout> | undefined;
	private level = -1;
	private dead = false;

	constructor(private onStart: () => void) {
		const Ctor =
			window.AudioContext ??
			(window as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!Ctor) return;
		const ac = new Ctor();
		this.ac = ac;
		const master = ac.createGain();
		master.gain.value = 0;
		master.connect(ac.destination);
		this.master = master;
		const dry = ac.createGain();
		dry.gain.value = 0.5;
		dry.connect(master);
		this.dry = dry;
		const verb = ac.createConvolver();
		verb.buffer = this.impulse(3.6, 2.4);
		const wet = ac.createGain();
		wet.gain.value = 0.6;
		verb.connect(wet);
		wet.connect(master);
		this.verb = verb;
		this.resume();
	}

	destroy() {
		this.dead = true;
		clearTimeout(this.chordTO);
		clearTimeout(this.bellTO);
		try {
			this.ac?.close();
		} catch {}
	}

	resume = () => {
		const ac = this.ac;
		if (!ac || this.dead) return;
		if (ac.state === "suspended") ac.resume().then(this.engineOn, () => {});
		else this.engineOn();
	};

	setLevel(vol: number, muted: boolean) {
		const ac = this.ac;
		if (!ac || !this.master) return;
		const want = muted ? 0 : Math.max(0, Math.min(1, vol)) * 0.8;
		if (Math.abs(this.level - want) < 0.001) return;
		this.level = want;
		this.master.gain.setTargetAtTime(want, ac.currentTime, 0.4);
	}

	bell() {
		const ac = this.ac;
		if (!ac || !this.verb) return;
		const t = ac.currentTime;
		const o = ac.createOscillator();
		o.type = "sine";
		o.frequency.value = hz(BELL_NOTES[(Math.random() * BELL_NOTES.length) | 0]);
		const g = ac.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(0.026, t + 0.09);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 4.6);
		o.connect(g);
		g.connect(this.verb);
		o.start(t);
		o.stop(t + 4.8);
	}

	private engineOn = () => {
		if (this.started || this.dead || this.ac?.state !== "running") return;
		this.started = true;
		this.onStart();
		this.chordI = 0;
		this.nextChord();
		this.nextBell();
	};

	private impulse(sec: number, decay: number) {
		const ac = this.ac;
		if (!ac) return null;
		const len = (ac.sampleRate * sec) | 0;
		const buf = ac.createBuffer(2, len, ac.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = buf.getChannelData(ch);
			let last = 0;
			for (let i = 0; i < len; i++) {
				last = last * 0.82 + (Math.random() * 2 - 1) * 0.18;
				d[i] = last * (1 - i / len) ** decay * 0.5;
			}
		}
		return buf;
	}

	private nextChord = () => {
		const ac = this.ac;
		if (!this.started || this.dead || !ac) return;
		const dur = 12 + Math.random() * 4;
		this.playChord(
			PROGRESSION[this.chordI % PROGRESSION.length],
			ac.currentTime + 0.05,
			dur,
		);
		this.chordI++;
		this.chordTO = setTimeout(this.nextChord, (dur - 2.2) * 1000);
	};

	private playChord(midis: number[], t0: number, dur: number) {
		const ac = this.ac;
		if (!ac || !this.dry || !this.verb) return;
		const lp = ac.createBiquadFilter();
		lp.type = "lowpass";
		lp.frequency.value = 520 + Math.random() * 220;
		lp.Q.value = 0.2;
		const g = ac.createGain();
		g.gain.setValueAtTime(0, t0);
		g.gain.linearRampToValueAtTime(1, t0 + dur * 0.42);
		g.gain.setValueAtTime(1, t0 + dur * 0.78);
		g.gain.linearRampToValueAtTime(0, t0 + dur + 2.6);
		lp.connect(g);
		g.connect(this.dry);
		g.connect(this.verb);
		for (const [i, midi] of midis.entries()) {
			const f = hz(midi);
			for (const [type, cents, gain] of [
				["sine", 0, 0.075],
				["triangle", 3, 0.017],
			] as const) {
				const o = ac.createOscillator();
				o.type = type;
				o.frequency.value = f;
				o.detune.value = cents + (Math.random() * 2 - 1);
				const og = ac.createGain();
				og.gain.value = gain * (i === 0 ? 1.2 : 0.85);
				o.connect(og);
				og.connect(lp);
				o.start(t0);
				o.stop(t0 + dur + 3);
			}
		}
	}

	private nextBell = () => {
		if (!this.started || this.dead) return;
		this.bellTO = setTimeout(
			() => {
				this.bell();
				this.nextBell();
			},
			(9 + Math.random() * 14) * 1000,
		);
	};
}
