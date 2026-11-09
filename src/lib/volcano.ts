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

/** Coulées de lave sur les pentes. */
export const VEINS = [
  'M207 97 C201 128 214 150 206 186 L204 232',
  'M222 98 C230 122 222 142 234 170 L240 226',
  'M198 97 C190 118 176 132 168 160 L158 206',
];

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
