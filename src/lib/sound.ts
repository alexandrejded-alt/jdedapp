/**
 * Sons de l'app (Web Audio) : clics, feux d'artifice, avion, confirmation, et deux ambiances en boucle
 * (le volcan, la radio de Showtime). Les navigateurs interdisent le son avant un premier toucher :
 * le moteur s'active donc au premier geste de la personne, puis tout joue normalement.
 */
export type Sfx = 'clic_1' | 'clic_2' | 'clic_3' | 'fire_1' | 'fire_2' | 'fire_3' | 'confirme' | 'avion';
export type Loop = 'volcan' | 'radio';
type Name = Sfx | Loop;

const KEY = 'jded_sound';
const LOOP_VOLUME: Record<Loop, number> = { volcan: 0.2, radio: 0.26 };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let wantedLoop: Loop | null = null;
const raw = new Map<Name, Promise<ArrayBuffer | null>>();
const bufs = new Map<Name, Promise<AudioBuffer | null>>();
const loops = new Map<Loop, { src: AudioBufferSourceNode; gain: GainNode }>();
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
    applyLoop();
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

export function isUnlocked() {
  return !!ctx;
}

export function play(name: Sfx, volume = 1, rate = 1) {
  if (!ctx || !master || muted) return;
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

export const clic = () => play(`clic_${1 + Math.floor(Math.random() * 3)}` as Sfx, 0.55, 0.96 + Math.random() * 0.1);

let lastFire = 0;
/** Un feu d'artifice qui explose : un des trois sons au hasard (jamais deux à la fois). */
export function fire(big = false) {
  const now = performance.now();
  if (now - lastFire < 160) return;
  lastFire = now;
  play(`fire_${1 + Math.floor(Math.random() * 3)}` as Sfx, big ? 0.85 : 0.6, 0.95 + Math.random() * 0.1);
}

function applyLoop() {
  if (!ctx || !master) return;
  const c = ctx;
  const now = c.currentTime;
  for (const [name, l] of loops) {
    if (name === wantedLoop) continue;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setTargetAtTime(0, now, 0.35);
    window.setTimeout(() => {
      try {
        l.src.stop();
      } catch {
        /* déjà arrêté */
      }
    }, 1800);
    loops.delete(name);
  }
  if (!wantedLoop || loops.has(wantedLoop)) return;
  const name = wantedLoop;
  void buffer(name).then((b) => {
    if (!b || !ctx || !master || wantedLoop !== name || loops.has(name)) return;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(master);
    src.start();
    gain.gain.setTargetAtTime(LOOP_VOLUME[name], ctx.currentTime, 0.5);
    loops.set(name, { src, gain });
  });
}

/** Ambiance de fond du moment (null = silence). */
export function setLoop(name: Loop | null) {
  wantedLoop = name;
  applyLoop();
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
