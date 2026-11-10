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
export type FlowDef = {
  d: string;
  w: number;
  delay: number;
  D: number;
  hold: number;
  D2: number;
  start: number;
  /** Vitesse du front en unités par seconde : si elle est donnée, elle remplace D. */
  speed?: number;
  /** Avance à vitesse constante (sinon elle ralentit en descendant). */
  lin?: boolean;
  /** Intensité (1 par défaut) : plus petit = plus discret. */
  dim?: number;
  /** Bords lisses et peu de fissures (pour que les lettres restent lisibles). */
  clean?: boolean;
};
/** Décale tous les points (paires x y) d'un tracé écrit avec des coordonnées absolues. */
const shift = (d: string, dx: number, dy: number): string => {
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (m) => String(+(parseFloat(m) + (i++ % 2 === 0 ? dx : dy)).toFixed(2)));
};

/** La lave part du cratère, descend droit vers le haut d'une lettre, puis trace la lettre en coulant. */
const approach = (tx: number, ty: number): string => {
  const sx = 207 + (tx - 207) * 0.08;
  return `M${sx.toFixed(1)} 96 C${(sx + (tx - sx) * 0.15).toFixed(1)} ${(96 + (ty - 96) * 0.4).toFixed(1)} ${tx} ${(ty - (ty - 96) * 0.4).toFixed(1)} ${tx} ${ty}`;
};

/** « JDED » : chaque lettre est un trait continu de 19 de haut (y de 2,5 à 21,5), tracé par une coulée. */
export const LETTER_Y0 = 170;
const LX = { J: 163.75, D1: 186.25, E: 210.75, D2: 232.75 };
const letterFlow = (x: number, startX: number, start: string, rest: string): string => {
  const tx = x + startX;
  return approach(tx, LETTER_Y0 + (start === 'top' ? 2.5 : -0.5)) + ' ' + shift(rest, x, LETTER_Y0);
};
const J = letterFlow(LX.J, 12.4, 'top', 'L12.4 16.6 C12.4 19.6 11.4 21.8 8.8 21.8 C6.4 21.8 3.6 20.6 3.2 17');
const D = (x: number) => letterFlow(x, 2.5, 'top', 'L2.5 19.5 Q2.5 21.5 4.5 21.5 L8 21.5 C14.5 21.5 15.5 17 15.5 12 C15.5 7 14.5 2.5 8 2.5 L4.5 2.5');
const E = letterFlow(LX.E, 14, 'above', 'Q14 2.5 11 2.5 L4.5 2.5 Q2.5 2.5 2.5 4.5 L2.5 19.5 Q2.5 21.5 4.5 21.5 L14 21.5');
const E_MID = shift('M2.5 12 L11.5 12', LX.E, LETTER_Y0);

/**
 * Lettres JDED en traits fixes (utilisées par l'animation « voyage » : VolcanoJourney).
 * Le fond animé, lui, les dessine avec des coulées de lave (voir FLOWS).
 */
export const LETTERS_Y0 = LETTER_Y0;
export const LETTERS: { d: string; x: number }[] = [
  { d: 'M3.2 17 C3.6 20.6 6.4 21.8 8.8 21.8 C11.4 21.8 12.4 19.6 12.4 16.6 L12.4 2.5', x: LX.J },
  { d: 'M2.5 2.5 L2.5 21.5 L8 21.5 C14.5 21.5 15.5 17 15.5 12 C15.5 7 14.5 2.5 8 2.5 L2.5 2.5', x: LX.D1 },
  { d: 'M14 2.5 L2.5 2.5 L2.5 12 L11 12 L2.5 12 L2.5 21.5 L14 21.5', x: LX.E },
  { d: 'M2.5 2.5 L2.5 21.5 L8 21.5 C14.5 21.5 15.5 17 15.5 12 C15.5 7 14.5 2.5 8 2.5 L2.5 2.5', x: LX.D2 },
];

// Les coulées de lettres sont fines et un peu plus sombres (dim) : le nom se devine, il ne crie pas.
const LET = { w: 1.55, hold: 130, D2: 40, start: 0, speed: 30, lin: true, dim: 0.8, clean: true };
export const FLOWS: FlowDef[] = [
  { d: J, delay: 0, D: 0, ...LET },
  { d: D(LX.D1), delay: 1.1, D: 0, ...LET },
  { d: E, delay: 2.2, D: 0, ...LET },
  // La barre du milieu du E : une branche qui part du montant, une fois la coulée passée
  { d: E_MID, delay: 6, D: 0, ...LET, speed: 12, hold: 127 },
  { d: D(LX.D2), delay: 3.3, D: 0, ...LET },
  // Deux grandes coulées sur les flancs, loin des lettres
  { d: 'M198 98 C186 112 168 124 152 142 C140 156 130 176 124 202', w: 2.2, delay: 3, D: 14, hold: 40, D2: 30, start: 0, dim: 0.85 },
  { d: 'M224 98 C238 112 250 126 258 142 C268 160 276 178 282 202', w: 2.0, delay: 5, D: 14, hold: 40, D2: 30, start: 0, dim: 0.85 },
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
