/**
 * Sons de l'app (Web Audio) : clics, feux d'artifice, confirmation, la radio de Showtime et le grondement
 * du volcan (uniquement quand il entre en éruption). Les navigateurs interdisent le son avant un premier toucher :
 * le moteur s'active donc au premier geste de la personne, puis tout joue normalement.
 */
export type Sfx = 'clic_1' | 'clic_2' | 'clic_3' | 'fire_1' | 'fire_2' | 'fire_3' | 'confirme' | 'radio' | 'volcan';
type Name = Sfx;

const KEY = 'jded_sound';
let pendingOnce: { name: Sfx; volume: number } | null = null;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const raw = new Map<Name, Promise<ArrayBuffer | null>>();
const bufs = new Map<Name, Promise<AudioBuffer | null>>();
const listeners = new Set<() => void>();

try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'off';
} catch {
  /* stockage indisponible : le son reste actif */
}

/** Télécharge un son à l'avance (sans avoir besoin du feu vert du navigateur). */
export function prefetch(names: Name[]) {
  for (const n of names) {
    if (raw.has(n)) continue;
    raw.set(
      n,
      fetch(`/sounds/${n}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null),
    );
  }
}

function buffer(name: Name): Promise<AudioBuffer | null> {
  const known = bufs.get(name);
  if (known) return known;
  prefetch([name]);
  const p = (async () => {
    const data = await raw.get(name);
    if (!data || !ctx) return null;
    try {
      return await ctx.decodeAudioData(data.slice(0));
    } catch {
      return null;
    }
  })();
  bufs.set(name, p);
  return p;
}

/** À appeler au premier geste : crée le moteur audio et le réveille. */
export function unlock() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (pendingOnce) {
    const p = pendingOnce;
    pendingOnce = null;
    play(p.name, p.volume);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

export function isUnlocked() {
  return !!ctx;
}

export function play(name: Sfx, volume = 1, rate = 1) {
  if (!ctx || !master || muted || isQuiet()) return;
  const c = ctx;
  const m = master;
  void buffer(name).then((b) => {
    if (!b) return;
    const src = c.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = volume;
    src.connect(g).connect(m);
    src.start();
  });
}

/** Joue un son une seule fois dès que le navigateur le permet (si le son n'est pas encore réveillé, on attend le premier toucher). */
export function playWhenReady(name: Sfx, volume = 1) {
  if (ctx) play(name, volume);
  else pendingOnce = { name, volume };
}

export const clic = () => play(`clic_${1 + Math.floor(Math.random() * 3)}` as Sfx, 0.55, 0.96 + Math.random() * 0.1);

let lastFire = 0;
/** Un feu d'artifice qui explose : un des trois sons au hasard (jamais deux à la fois). */
export function fire(big = false) {
  const now = performance.now();
  if (now - lastFire < 160) return;
  lastFire = now;
  play(`fire_${1 + Math.floor(Math.random() * 3)}` as Sfx, big ? 0.85 : 0.6, 0.95 + Math.random() * 0.1);
}

/** Petits sons holographiques synthétisés (montée à l'apparition, descente à la disparition). Ils passent même quand le reste est en silence. */
export function holoSound(kind: 'start' | 'end') {
  if (!ctx || !master || muted) return;
  const c = ctx;
  const t = c.currentTime;
  const up = kind === 'start';
  const dur = up ? 0.8 : 0.62;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
  out.gain.setValueAtTime(0.5, t + dur * 0.55);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // Léger tremblement, comme une projection instable
  const wob = c.createGain();
  wob.gain.value = 0.7;
  const lfo = c.createOscillator();
  lfo.frequency.value = 26;
  const depth = c.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth).connect(wob.gain);
  wob.connect(out).connect(master);
  const [f0, f1] = up ? [150, 1250] : [1100, 110];
  const tone = (type: OscillatorType, mul: number, vol: number) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0 * mul, t);
    o.frequency.exponentialRampToValueAtTime(f1 * mul, t + dur * 0.9);
    const g = c.createGain();
    g.gain.value = vol;
    o.connect(g).connect(wob);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  tone('triangle', 1, 0.5);
  tone('sine', 2.01, 0.25);
  // Un souffle de parasites numériques
  const n = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const ch = n.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const ns = c.createBufferSource();
  ns.buffer = n;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3500;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(up ? 0.22 : 0.16, t + (up ? 0.12 : 0.04));
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
  ns.connect(hp).connect(ng).connect(wob);
  ns.start(t);
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
}

let quietUntil = 0;
/** Silence total (hologramme de réservation) pendant `ms` millisecondes ; 0 pour rendre le son. */
export function quietFor(ms: number) {
  quietUntil = ms > 0 ? performance.now() + ms : 0;
  if (ms > 0 && eruptNode) {
    try {
      eruptNode.src.stop();
    } catch {
      /* déjà arrêté */
    }
    eruptNode = null;
    eruptUntil = 0;
  }
}
export const isQuiet = () => performance.now() < quietUntil;

let eruptUntil = 0;
let eruptNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

/**
 * Grondement du volcan : seulement quand il entre en éruption (réservation ou secousse).
 * `seconds` = durée totale avant extinction ; si un grondement est déjà en cours, on ne le relance pas.
 */
export function eruption(volume = 0.5, seconds = 6) {
  if (!ctx || !master || muted || isQuiet()) return;
  const c = ctx;
  const m = master;
  const nowMs = performance.now();
  if (nowMs < eruptUntil) return;
  eruptUntil = nowMs + seconds * 1000;
  void buffer('volcan').then((b) => {
    if (!b) {
      eruptUntil = 0;
      return;
    }
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = b;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.25);
    g.gain.setValueAtTime(volume, t + Math.max(0.3, seconds - 1.6));
    g.gain.linearRampToValueAtTime(0, t + seconds);
    src.connect(g).connect(m);
    src.start(t);
    src.stop(t + seconds + 0.1);
    eruptNode = { src, gain: g };
    src.onended = () => {
      if (eruptNode?.src === src) eruptNode = null;
    };
  });
}

export function setSuspended(s: boolean) {
  if (!ctx) return;
  if (s && ctx.state === 'running') void ctx.suspend().catch(() => {});
  else if (!s && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(KEY, m ? 'off' : 'on');
  } catch {
    /* pas grave */
  }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.08);
  listeners.forEach((f) => f());
}

export function subscribe(f: () => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
