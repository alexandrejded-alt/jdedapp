/**
 * Géométrie du volcan du fond. Tout est dessiné dans un repère de 400 x 260
 * (comme une illustration), puis mis à l'échelle selon l'écran. Le fond animé
 * et les feux d'artifice partent du même cratère grâce à ces fonctions.
 */
export type Pt = [number, number];

/** Cratère : là d'où partent les braises et l'éruption. */
export const CRATER: Pt = [207, 90];

/** Montagnes du fond (plus claires, plus loin). */
export const BACK: Pt[] = [
  [-600, 260], [-600, 186], [-470, 164], [-340, 192], [-240, 154], [-130, 186], [-40, 160], [60, 190],
  [150, 176], [260, 184], [330, 154], [420, 176], [520, 146], [640, 180], [760, 156], [900, 188], [900, 260],
];

/** Le volcan. */
export const MAIN: Pt[] = [
  [-600, 260], [-600, 216], [-420, 206], [-260, 214], [-130, 206], [-50, 194], [52, 180], [100, 196],
  [146, 146], [186, 100], [200, 92], [214, 96], [228, 93], [256, 124], [292, 164], [336, 156], [384, 190],
  [470, 200], [640, 208], [900, 216], [900, 260],
];

/** Bord du cratère (ligne qui s'illumine). */
export const RIM = 'M186 100 L200 92 L214 96 L228 93';

/**
 * Coulées de lave : chacune part du cratère et descend lentement la pente.
 * w = épaisseur à la source (elle s'amincit en descendant), delay/D/hold/D2 = rythme en secondes
 * (attente, avancée du front, pause, refroidissement). Les durées sont longues : la lave coule doucement.
 */
export type FlowDef = { d: string; w: number; delay: number; D: number; hold: number; D2: number; start: number };
export const FLOWS: FlowDef[] = [
  { d: 'M205 97 C199 122 212 144 203 172 C197 192 205 212 200 238', w: 3.2, delay: 0, D: 34, hold: 12, D2: 26, start: 3 },
  { d: 'M219 97 C228 118 220 138 232 160 C240 176 236 200 244 232', w: 2.8, delay: 3, D: 40, hold: 10, D2: 28, start: 0 },
  { d: 'M197 98 C188 114 176 130 170 152 C165 170 168 190 158 214', w: 2.5, delay: 8, D: 38, hold: 14, D2: 24, start: 0 },
  { d: 'M209 150 C216 164 222 176 218 196 C216 210 224 222 222 240', w: 1.7, delay: 11, D: 30, hold: 12, D2: 22, start: 0 },
  { d: 'M226 100 C238 112 246 124 256 136 C266 148 262 166 272 186', w: 2.1, delay: 6, D: 36, hold: 16, D2: 26, start: 0 },
];

/** Ravines et arêtes dessinées sur le cône (relief). */
export const RIDGES: { d: string; dark: boolean }[] = [
  { d: 'M200 92 C190 120 170 150 138 204', dark: true },
  { d: 'M203 94 C198 126 186 160 172 214', dark: false },
  { d: 'M208 96 C209 130 202 164 196 220', dark: true },
  { d: 'M214 96 C224 122 244 150 266 190', dark: true },
  { d: 'M220 95 C236 118 256 140 292 176', dark: false },
  { d: 'M186 102 C170 126 150 156 124 196', dark: false },
  { d: 'M228 94 C238 110 252 128 268 146', dark: true },
];

/** Le lac de lave dans la gorge du sommet. */
export const POOL = { cx: 207, cy: 94.5, rx: 9.5, ry: 2.2 };

export type Frame = { u: number; ox: number; oy: number; x: (vx: number) => number; y: (vy: number) => number };

/** Échelle et position du volcan pour un écran de w x h pixels. */
export function volcanoFrame(w: number, h: number): Frame {
  const u = Math.min(Math.max(w / 400, 1.9), (h * 0.64) / 260, 3.2);
  const ox = w / 2 - 206 * u;
  const oy = h - 260 * u;
  return { u, ox, oy, x: (vx) => ox + vx * u, y: (vy) => oy + vy * u };
}

export function craterPoint(w: number, h: number): { x: number; y: number } {
  const f = volcanoFrame(w, h);
  return { x: f.x(CRATER[0]), y: f.y(CRATER[1]) };
}
