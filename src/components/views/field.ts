const VERT = "attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }";

const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform float uMotion;
uniform vec2 uSeed; uniform float uZone; uniform float uWarp; uniform float uScale;
uniform float uModeA; uniform float uModeB; uniform float uBlend;
uniform vec3 uA0; uniform vec3 uA1; uniform vec3 uA2; uniform vec3 uA3;
uniform vec3 uB0; uniform vec3 uB1; uniform vec3 uB2; uniform vec3 uB3;
float hash(vec2 p){ p=fract(p*vec2(234.34,435.345)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
 return mix(mix(hash(mod(i,288.0)),hash(mod(i+vec2(1.0,0.0),288.0)),u.x),mix(hash(mod(i+vec2(0.0,1.0),288.0)),hash(mod(i+vec2(1.0,1.0),288.0)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0; float a=0.5; mat2 m=mat2(0.8,0.6,-0.6,0.8);
 for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p*2.02; a*=0.5; } return v; }
vec3 scene(float mode, vec2 p, float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3){
 if(mode<0.5){
  vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t*0.7));
  vec2 r=vec2(fbm(p+uWarp*q+vec2(1.7,9.2)+t*0.55),fbm(p+uWarp*q+vec2(8.3,2.8)-t*0.4));
  float f=fbm(p+uWarp*0.9*r);
  vec3 col=mix(c0,c1,clamp(f*f*3.4,0.0,1.0));
  col=mix(col,c2,clamp(length(q)*0.92,0.0,1.0));
  col=mix(col,c3,clamp(pow(clamp(r.y,0.0,1.0),1.6)*1.25,0.0,1.0));
  col+=vec3(0.92,0.96,1.0)*pow(clamp(f,0.0,1.0),4.0)*0.22;
  return col*(0.9+0.18*f);
 } else if(mode<1.5){
  float n=fbm(p*0.9+t*0.6);
  float b1=sin(p.y*3.0+n*uWarp*1.7+t*1.1)*0.5+0.5;
  float b2=sin(p.y*6.5-n*3.2-t*0.7+p.x*1.3)*0.5+0.5;
  vec3 col=mix(c0,c1,smoothstep(0.12,0.88,b1));
  col=mix(col,c2,smoothstep(0.45,0.95,b2)*0.65);
  col=mix(col,c3,pow(b1*b2,3.0));
  return col+vec3(1.0)*pow(b2,8.0)*0.1;
 } else if(mode<2.5){
  vec2 g=p*0.85; vec2 id=floor(g); float m=0.0;
  for(int y=-1;y<=1;y++){ for(int x=-1;x<=1;x++){
   vec2 o=vec2(float(x),float(y));
   vec2 mid=mod(id+o,288.0);
   vec2 h=vec2(hash(mid),hash(mid+7.3));
   vec2 cc=id+o+0.5+0.34*vec2(sin(t*1.4+h.x*6.28),cos(t*1.1+h.y*6.28));
   float dd=dot(g-cc,g-cc);
   float w=max(0.0,1.0-dd*0.83);
   m+=w*w*(0.55+0.65*h.y);
  }}
  vec3 col=mix(c0,c1,smoothstep(0.12,0.7,m));
  col=mix(col,c2,smoothstep(0.6,1.1,m));
  col=mix(col,c3,smoothstep(1.05,1.6,m));
  return col+vec3(0.95,0.97,1.0)*smoothstep(1.45,2.0,m)*0.22;
 } else if(mode<3.5){
  vec2 g=p*1.05; vec2 id=floor(g); float d1=8.0; float d2=8.0;
  for(int y=-1;y<=1;y++){ for(int x=-1;x<=1;x++){
   vec2 o=vec2(float(x),float(y));
   vec2 mid=mod(id+o,288.0);
   vec2 h=vec2(hash(mid),hash(mid+3.1));
   vec2 cc=id+o+0.5+0.34*vec2(sin(t*1.2+h.x*6.28),cos(t*1.5+h.y*6.28));
   float d=length(g-cc);
   if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; }
  }}
  float edge=d2-d1;
  vec3 col=mix(c0,c1,smoothstep(0.0,0.95,d1));
  col=mix(col,c2,smoothstep(0.45,1.05,d1*d1));
  col=mix(col,c3,1.0-smoothstep(0.0,0.18,edge));
  return col+vec3(1.0)*(1.0-smoothstep(0.0,0.05,edge))*0.08;
 } else if(mode<4.5){
  float wx=p.x*0.9+fbm(vec2(p.x*0.5,p.y*0.22)+t*0.8)*2.4;
  float cu1=sin(wx*2.2+t*1.3)*0.5+0.5;
  float cu2=sin(wx*3.7-t*0.9+1.7)*0.5+0.5;
  float fade=0.55+0.45*sin(p.y*0.7+t*0.6+uSeed.y);
  float g1=pow(cu1,2.2)*fade; float g2=pow(cu2,3.0)*fade;
  vec3 col=mix(c0,c1,clamp(g1,0.0,1.0));
  col=mix(col,c2,clamp(g2*0.75,0.0,1.0));
  col=mix(col,c3,clamp(pow(g1*g2,2.0)*1.4,0.0,1.0));
  return col+vec3(0.9,1.0,0.95)*pow(clamp(g2,0.0,1.0),6.0)*0.14;
 } else if(mode<5.5){
  vec2 q=vec2(fbm(p*1.1+t*0.7),fbm(p*1.1+vec2(3.7,8.1)-t*0.5));
  float v=fbm(p+q*uWarp);
  float rg=clamp(1.0-abs(2.0*v-1.0),0.0,1.0);
  vec3 col=mix(c0,c1,smoothstep(0.18,0.82,v));
  col=mix(col,c2,pow(rg,5.0));
  col=mix(col,c3,pow(rg,13.0));
  return col+vec3(1.0)*pow(rg,24.0)*0.16;
 } else if(mode<6.5){
  float n=fbm(p*1.2+t*0.4)-0.5;
  float r1=length(p-uSeed-vec2(3.5,1.0));
  float r2=length(p-uSeed-vec2(-2.2,-4.0));
  float r3=length(p-uSeed-vec2(0.6,5.5));
  float w=clamp((sin(r1*6.0-t*2.2)+sin(r2*8.5+t*1.7)+sin(r3*4.5-t*1.2))/3.0*0.5+0.5+n*0.22,0.0,1.0);
  vec3 col=mix(c0,c1,smoothstep(0.12,0.88,w));
  col=mix(col,c2,smoothstep(0.5,0.95,w)*0.8);
  col=mix(col,c3,pow(w,7.0));
  return col+vec3(1.0)*pow(w,14.0)*0.12;
 } else if(mode<7.5){
  float f=fbm(p*0.85+t*0.35);
  float fr=fract(f*6.0);
  float ln=1.0-smoothstep(0.0,0.05,fr)*smoothstep(0.0,0.05,1.0-fr);
  vec3 col=mix(c0,c1,smoothstep(0.2,0.8,f));
  col=mix(col,c2,smoothstep(0.55,0.95,f));
  col=mix(col,c3,ln*0.85);
  return col+vec3(1.0)*ln*0.07;
 } else if(mode<8.5){
  float n1=fbm(p*0.8+t*0.5);
  float n2=fbm(p*1.7-t*0.4+vec2(7.7,3.3));
  float cl=smoothstep(0.22,0.95,n1*0.65+n2*0.45);
  vec3 col=mix(c0,c1,cl);
  col=mix(col,c2,pow(clamp(n2,0.0,1.0),3.0));
  col=mix(col,c3,pow(cl,4.0));
  vec2 sg=p*5.0; vec2 sid=floor(sg); vec3 sacc=vec3(0.0);
  for(int sy=-1;sy<=1;sy++){ for(int sx=-1;sx<=1;sx++){
   vec2 so=vec2(float(sx),float(sy));
   vec2 ms=mod(sid+so,288.0);
   float hs=hash(ms);
   float on=smoothstep(0.9,0.945,hs);
   vec2 sp=sid+so+vec2(hash(ms+3.3),hash(ms+9.1))*0.7+0.15;
   vec2 dv=sg-sp; float sd2=dot(dv,dv);
   float core=exp(-sd2*230.0);
   float halo=exp(-sd2*26.0)*0.4;
   float ray=exp(-dv.x*dv.x*760.0-dv.y*dv.y*22.0)*0.3+exp(-dv.y*dv.y*760.0-dv.x*dv.x*22.0)*0.3;
   float tw=0.45+0.55*sin(t*11.0+hs*62.0)*sin(t*4.3+hs*23.0);
   float s1=on*(core+halo+ray)*(0.35+0.85*tw*tw);
   sacc+=mix(vec3(1.0,0.97,0.9),vec3(0.86,0.93,1.0),hash(ms+21.7))*s1;
  }}
  float dim=1.0-smoothstep(0.25,0.75,cl)*0.75;
  return col+sacc*dim;
 } else if(mode<9.5){
  float n=fbm(p*0.7+t*0.5);
  float wa=sin(p.x*3.1+n*2.6+t*1.1)*0.5+0.5;
  float wb=sin(p.y*3.1-n*2.2-t*0.9)*0.5+0.5;
  float cr=wa*wb;
  vec3 col=mix(c0,c1,smoothstep(0.08,0.92,wa));
  col=mix(col,c2,smoothstep(0.25,0.95,wb)*0.6);
  col=mix(col,c3,pow(cr,3.0));
  return col+vec3(1.0)*pow(cr,9.0)*0.1;
 } else if(mode<10.5){
  vec2 d=p-uSeed-vec2(2.0,3.0);
  float ang=atan(d.y,d.x); float rad=length(d);
  float sw=sin(ang*3.0+log(rad+1.0)*5.5-t*2.0)*0.5+0.5;
  float sw2=sin(ang*2.0-log(rad+1.0)*3.5+t*1.4)*0.5+0.5;
  float fall=1.0/(1.0+rad*0.42);
  vec3 col=mix(c0,c1,smoothstep(0.1,0.9,sw*fall*1.6));
  col=mix(col,c2,smoothstep(0.3,0.95,sw2*0.8+fall*0.4));
  col=mix(col,c3,pow(sw*fall,2.2)*1.5);
  return col+vec3(1.0)*pow(fall,3.5)*0.2;
 } else if(mode<11.5){
  vec2 q=p; float acc=0.0;
  for(int i=0;i<4;i++){ q=abs(q)/dot(q,q)-vec2(0.72+0.12*sin(t*0.7),0.58); acc+=length(q); }
  float v=fract(acc*0.16);
  float bandv=1.0-abs(2.0*v-1.0);
  vec3 col=mix(c0,c1,smoothstep(0.1,0.9,v));
  col=mix(col,c2,pow(bandv,2.5));
  col=mix(col,c3,pow(bandv,9.0));
  return col+vec3(1.0)*pow(bandv,22.0)*0.16;
 } else if(mode<12.5){
  float sc=0.0;
  for(int i=1;i<7;i++){ float fi=float(i); sc+=sin(p.x*fi*1.4+t*fi*0.5+uSeed.x)*sin(p.y*fi*1.1-t*fi*0.35)/fi; }
  float v=sc*0.5+0.5;
  float ln=1.0-abs(2.0*fract(v*3.0)-1.0);
  vec3 col=mix(c0,c1,smoothstep(0.2,0.8,v));
  col=mix(col,c2,smoothstep(0.45,0.98,v));
  col=mix(col,c3,pow(ln,4.0)*0.8);
  return col+vec3(1.0)*pow(ln,16.0)*0.12;
 } else if(mode<13.5){
  float n=fbm(p*0.6+t*0.35);
  float sh=fbm(p*0.6+vec2(0.9,0.7)+t*0.35);
  float dune=sin(p.y*2.4+n*3.4)*0.5+0.5;
  float lit=clamp((sh-n)*3.2+0.5,0.0,1.0);
  vec3 col=mix(c0,c1,smoothstep(0.05,0.95,dune));
  col=mix(col,c2,lit*0.7);
  col=mix(col,c3,pow(clamp(dune*lit,0.0,1.0),3.0));
  return col+vec3(1.0,0.98,0.94)*pow(lit,7.0)*0.13;
 } else {
  vec2 g=p*0.9; vec2 id=floor(g); float m=0.0; float e=0.0;
  for(int y=-1;y<=1;y++){ for(int x=-1;x<=1;x++){
   vec2 o=vec2(float(x),float(y));
   vec2 mid=mod(id+o,288.0);
   vec2 h=vec2(hash(mid),hash(mid+13.7));
   float ph=t*1.1+h.x*6.28;
   vec2 cc=id+o+0.5+0.3*vec2(sin(ph),cos(ph*0.8));
   float d=length(g-cc);
   float rr=0.34+0.2*h.y;
   m+=smoothstep(rr,rr*0.35,d)*(0.6+0.4*h.x);
   e+=max(0.0,1.0-abs(d-rr)*13.0);
  }}
  vec3 col=mix(c0,c1,smoothstep(0.05,0.85,m));
  col=mix(col,c2,smoothstep(0.5,1.3,m)*0.75);
  col=mix(col,c3,clamp(e*0.85,0.0,1.0));
  return col+vec3(1.0)*clamp(e,0.0,1.0)*0.14;
 }
}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes.y;
 float wy=uv.y-uScroll;
 vec2 p=vec2(uv.x,wy)*uScale+uSeed;
 float t=uTime*0.045*uMotion;
 float zone=0.5+0.5*sin(wy*uZone*6.28318+uSeed.x);
 vec3 c0=mix(uA0,uB0,zone); vec3 c1=mix(uA1,uB1,zone); vec3 c2=mix(uA2,uB2,zone); vec3 c3=mix(uA3,uB3,zone);
 vec3 col=scene(uModeA,p,t,c0,c1,c2,c3);
 if(uBlend>0.002){ col=mix(col,scene(uModeB,p,t,c0,c1,c2,c3),uBlend); }
 float gn=hash(gl_FragCoord.xy+fract(uTime)*17.0);
 col+=(gn-0.5)*0.022;
 gl_FragColor=vec4(col,1.0);
}`;

export const MODES = [
	"drift",
	"silk",
	"orbs",
	"cells",
	"aurora",
	"ink",
	"rings",
	"contour",
	"nebula",
	"weave",
	"spiral",
	"kaleido",
	"lattice",
	"dunes",
	"bubbles",
];

const PALETTES = [
	["#141a3a", "#e8a1b0", "#f6d3a7", "#cfe0ea"],
	["#0a2e33", "#3e8e8c", "#a8d5c6", "#efe6d4"],
	["#241f45", "#7a6aa8", "#c5b3d6", "#f0e8f2"],
	["#12291f", "#3a6b52", "#9fc4a8", "#e8f0e0"],
	["#2a1c22", "#7a4a52", "#c98d7a", "#f2ddc8"],
	["#14161d", "#4a5568", "#9aa8b8", "#eef1f4"],
	["#081426", "#1f4e6b", "#4fa3a5", "#bfe3d0"],
	["#1c1430", "#5b4b8a", "#a08cc0", "#ffd9c2"],
];

const UNIFORMS = [
	"uRes",
	"uTime",
	"uScroll",
	"uMotion",
	"uSeed",
	"uZone",
	"uWarp",
	"uScale",
	"uModeA",
	"uModeB",
	"uBlend",
	"uA0",
	"uA1",
	"uA2",
	"uA3",
	"uB0",
	"uB1",
	"uB2",
	"uB3",
];

/** seed.xy, zone, warp, scale, then 4+4 palette colours as rgb triples. */
const SLOTS = 29;

export type View = { seedId: string; modeName: string };

export type FieldEvents = {
	onNavShow: () => void;
	onNavHide: () => void;
	onGesture: () => void;
};

const rgb = (h: string): [number, number, number] => [
	Number.parseInt(h.slice(1, 3), 16) / 255,
	Number.parseInt(h.slice(3, 5), 16) / 255,
	Number.parseInt(h.slice(5, 7), 16) / 255,
];

/**
 * The scrolling colour field: a single full-screen fragment shader whose
 * parameters ease toward a target set, so a new view melts into the old one
 * instead of cutting. Scroll is virtual — a tall spacer that regrows as you
 * approach its end, plus a `worldOff` that lets the field keep travelling
 * upward past the real top of the document.
 */
export class Field {
	/** live-tunable: the render loop reads it every frame */
	motion = 2;

	private gl: WebGLRenderingContext | null = null;
	private uni: Record<string, WebGLUniformLocation | null> = {};
	private cur = new Float32Array(SLOTS);
	private tgt = new Float32Array(SLOTS);
	private modeA = 0;
	private modeB = 0;
	private blend = 0;
	private blendTarget = 0;
	private worldOff = 0;
	private lastY: number;
	private scrollTarget: number;
	private scrollSmooth: number;
	private spacerH: number;
	private raf = 0;
	private lastT = 0;
	private t0 = 0;
	private frame = 0;
	private bright = false;
	private pixel = new Uint8Array(4);
	private dead = false;

	constructor(
		private canvas: HTMLCanvasElement,
		private spacer: HTMLElement,
		private events: FieldEvents,
	) {
		this.lastY = Math.max(0, window.scrollY);
		this.scrollTarget = this.lastY;
		this.scrollSmooth = this.lastY;
		this.spacerH = window.innerHeight * 14;
		this.spacer.style.height = `${this.spacerH}px`;
		this.initGL();
		this.bind();
		this.t0 = performance.now();
		this.raf = requestAnimationFrame(this.tick);
	}

	destroy() {
		this.dead = true;
		cancelAnimationFrame(this.raf);
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("wheel", this.onWheel);
		window.removeEventListener("resize", this.resize);
		document.documentElement.removeAttribute("data-vw-bright");
	}

	private initGL() {
		const gl = this.canvas.getContext("webgl", {
			antialias: false,
			// readPixels for the glass tone, and toDataURL for the shareable frame,
			// both read the buffer outside the draw that produced it.
			preserveDrawingBuffer: true,
		});
		if (!gl) {
			document.body.style.background = "linear-gradient(#141a3a,#0a2e33)";
			return;
		}
		this.gl = gl;
		const compile = (type: number, src: string) => {
			const s = gl.createShader(type);
			if (!s) return null;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
				console.error(gl.getShaderInfoLog(s));
			return s;
		};
		const prog = gl.createProgram();
		const vs = compile(gl.VERTEX_SHADER, VERT);
		const fs = compile(gl.FRAGMENT_SHADER, FRAG);
		if (!prog || !vs || !fs) return;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is WebGL, not a React hook
		gl.useProgram(prog);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 3, -1, -1, 3]),
			gl.STATIC_DRAW,
		);
		const loc = gl.getAttribLocation(prog, "a");
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		for (const n of UNIFORMS) this.uni[n] = gl.getUniformLocation(prog, n);
		this.resize();
		window.addEventListener("resize", this.resize);
	}

	private resize = () => {
		const gl = this.gl;
		if (!gl) return;
		const dpr = Math.min(1.75, window.devicePixelRatio || 1);
		this.canvas.width = (window.innerWidth * dpr) | 0;
		this.canvas.height = (window.innerHeight * dpr) | 0;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	};

	/** Pick a fresh seed, palette pair and mode. The first roll snaps; later ones cross-fade. */
	roll(first = false): View {
		const t = this.tgt;
		const a = (Math.random() * PALETTES.length) | 0;
		let b = (Math.random() * PALETTES.length) | 0;
		if (b === a) b = (b + 1) % PALETTES.length;

		t[0] = Math.random() * 80;
		t[1] = Math.random() * 80;
		t[2] = 0.22 + Math.random() * 0.3;
		t[3] = 2.1 + Math.random() * 1.1;
		t[4] = 1.35 + Math.random() * 0.5;
		const put = (off: number, hexes: string[]) => {
			hexes.forEach((h, i) => {
				const c = rgb(h);
				t[off + i * 3] = c[0];
				t[off + i * 3 + 1] = c[1];
				t[off + i * 3 + 2] = c[2];
			});
		};
		put(5, PALETTES[a]);
		put(17, PALETTES[b]);

		let next: number;
		if (first) {
			next = (Math.random() * MODES.length) | 0;
			this.modeA = next;
			this.modeB = next;
			this.blend = 0;
			this.blendTarget = 0;
			this.cur.set(t);
		} else {
			this.modeA = this.blendTarget === 1 ? this.modeB : this.modeA;
			this.blend = 0;
			next =
				(this.modeA + 1 + ((Math.random() * (MODES.length - 1)) | 0)) %
				MODES.length;
			this.modeB = next;
			this.blendTarget = 1;
		}
		return {
			seedId: String(1000 + ((Math.random() * 9000) | 0)),
			modeName: MODES[next],
		};
	}

	/** At the very top there is nothing to scroll back to, so glide the field forward instead. */
	nudge() {
		this.worldOff += window.innerHeight * 0.55;
		this.scrollTarget = this.worldOff;
	}

	private tick = (ts: number) => {
		if (this.dead) return;
		this.raf = requestAnimationFrame(this.tick);
		const dt = Math.min(0.05, (ts - (this.lastT || ts)) / 1000);
		this.lastT = ts;
		this.scrollSmooth +=
			(this.scrollTarget - this.scrollSmooth) * Math.min(1, dt * 7);
		// the seed pair drifts slower than the palette so colour lands before geometry
		const kSeed = Math.min(1, dt * 0.9);
		const k = Math.min(1, dt * 1.6);
		for (let i = 0; i < SLOTS; i++) {
			this.cur[i] += (this.tgt[i] - this.cur[i]) * (i < 2 ? kSeed : k);
		}
		this.blend += (this.blendTarget - this.blend) * Math.min(1, dt * 0.55);
		if (this.blendTarget === 1 && this.blend > 0.993) {
			this.modeA = this.modeB;
			this.blend = 0;
			this.blendTarget = 0;
		}
		if (this.gl && !document.hidden) this.draw(ts);
		this.frame++;
		if (this.frame % 18 === 0) this.sampleBright();
	};

	redraw() {
		this.draw(performance.now());
	}

	private draw(ts: number) {
		const gl = this.gl;
		if (!gl) return;
		const u = this.uni;
		const c = this.cur;
		gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
		gl.uniform1f(u.uTime, (ts - this.t0) / 1000);
		gl.uniform1f(
			u.uScroll,
			(this.scrollSmooth / Math.max(1, window.innerHeight)) * 0.85,
		);
		gl.uniform1f(u.uMotion, this.motion);
		gl.uniform2f(u.uSeed, c[0], c[1]);
		gl.uniform1f(u.uZone, c[2]);
		gl.uniform1f(u.uWarp, c[3]);
		gl.uniform1f(u.uScale, c[4]);
		for (let i = 0; i < 4; i++) {
			gl.uniform3f(u[`uA${i}`], c[5 + i * 3], c[6 + i * 3], c[7 + i * 3]);
			gl.uniform3f(u[`uB${i}`], c[17 + i * 3], c[18 + i * 3], c[19 + i * 3]);
		}
		gl.uniform1f(u.uModeA, this.modeA);
		gl.uniform1f(u.uModeB, this.modeB);
		gl.uniform1f(u.uBlend, this.blend);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	/** Read a row of pixels behind the chrome and flip the glass tone to suit. */
	private sampleBright() {
		const gl = this.gl;
		if (!gl || document.hidden) return;
		const c = this.canvas;
		const dpr = c.width / Math.max(1, window.innerWidth);
		const y = Math.max(
			0,
			Math.min(c.height - 1, c.height - Math.round(46 * dpr)),
		);
		let lum = 0;
		for (let i = 0; i < 9; i++) {
			const x = Math.min(c.width - 1, Math.round((c.width * (i + 0.5)) / 9));
			gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
			lum +=
				(0.299 * this.pixel[0] +
					0.587 * this.pixel[1] +
					0.114 * this.pixel[2]) /
				255;
		}
		lum /= 9;
		this.bright = this.bright ? lum > 0.5 : lum > 0.6;
		document.documentElement.toggleAttribute("data-vw-bright", this.bright);
	}

	private bind() {
		window.addEventListener("scroll", this.onScroll, { passive: true });
		window.addEventListener("wheel", this.onWheel, { passive: true });
	}

	private onScroll = () => {
		const y = Math.max(0, window.scrollY);
		const dy = y - this.lastY;
		this.lastY = y;
		this.scrollTarget = y + this.worldOff;
		if (dy > 8) this.events.onNavHide();
		else if (dy < -8) this.events.onNavShow();
		if (y + window.innerHeight * 6 > this.spacerH) {
			this.spacerH = y + window.innerHeight * 12;
			this.spacer.style.height = `${this.spacerH}px`;
		}
	};

	private onWheel = (e: WheelEvent) => {
		if (e.deltaY < -2) this.events.onNavShow();
		// past the top of the document the field keeps going, into negative world space
		if (e.deltaY < 0 && window.scrollY <= 1) {
			this.worldOff += e.deltaY;
			this.scrollTarget = this.worldOff;
		}
		this.events.onGesture();
	};
}
