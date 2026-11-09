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
  // Coulées qui nourrissent les lettres JDED
  { d: 'M207 96 C208 118 205 140 207 168', w: 2.8, delay: 0, D: 26, hold: 30, D2: 30, start: 2 },
  { d: 'M203 97 C196 116 188 130 180 148 C176 158 175 164 175 169', w: 2.4, delay: 2, D: 28, hold: 28, D2: 30, start: 0 },
  { d: 'M212 97 C222 116 228 132 234 148 C238 158 240 164 241 169', w: 2.4, delay: 3, D: 28, hold: 28, D2: 30, start: 0 },
  // Grandes coulées sur les flancs
  { d: 'M198 98 C186 112 168 124 152 142 C140 156 130 176 124 202', w: 2.5, delay: 6, D: 40, hold: 20, D2: 28, start: 0 },
  { d: 'M224 98 C238 112 250 126 258 142 C268 160 276 178 282 202', w: 2.3, delay: 9, D: 40, hold: 20, D2: 28, start: 0 },
  { d: 'M262 150 C272 162 286 170 292 186', w: 1.5, delay: 18, D: 22, hold: 18, D2: 20, start: 0 },
  // Les lettres fondent : des gouttes de lave coulent dessous
  { d: 'M172 192 C172 202 175 208 173 224', w: 1.5, delay: 9, D: 22, hold: 20, D2: 20, start: 0 },
  { d: 'M195 192 C194 203 197 212 195 234', w: 1.7, delay: 11, D: 24, hold: 20, D2: 20, start: 0 },
  { d: 'M219 192 C220 202 217 210 219 228', w: 1.5, delay: 13, D: 22, hold: 20, D2: 20, start: 0 },
  { d: 'M241 192 C241 204 244 212 242 238', w: 1.7, delay: 15, D: 24, hold: 20, D2: 20, start: 0 },
];

/**
 * « JDED » écrit en lave sur la pente. Chaque lettre est un seul trait continu (dessiné comme avec un stylo
 * de lave) dans une boîte de 19 de haut ; x = position de la lettre, y0 = haut de la ligne.
 */
export const LETTERS: { d: string; x: number }[] = [
  { d: 'M3.2 17 C3.6 20.6 6.4 21.8 8.8 21.8 C11.4 21.8 12.4 19.6 12.4 16.6 L12.4 2.5', x: 163.75 },
  { d: 'M2.5 2.5 L2.5 21.5 L8 21.5 C14.5 21.5 15.5 17 15.5 12 C15.5 7 14.5 2.5 8 2.5 L2.5 2.5', x: 186.25 },
  { d: 'M14 2.5 L2.5 2.5 L2.5 12 L11 12 L2.5 12 L2.5 21.5 L14 21.5', x: 210.75 },
  { d: 'M2.5 2.5 L2.5 21.5 L8 21.5 C14.5 21.5 15.5 17 15.5 12 C15.5 7 14.5 2.5 8 2.5 L2.5 2.5', x: 232.75 },
];
export const LETTERS_Y0 = 170;

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
