import { BACK, MAIN, RIDGES, LETTERS, LETTERS_Y0, craterPoint } from './volcano';

export const JOURNEY_EVENT = 'jded:volcano-journey';
export const CUT_AT = 8.3;
export const IMPACT_AT = 9.65;
export const FIREWORKS_AT = IMPACT_AT + .38;
export const RETURN_AT = 13.1;
export const JOURNEY_DURATION = RETURN_AT + 1.6;
export type JourneyGuest = { name: string; avatarUrl?: string | null };
export type JourneyPortraits = { barber: HTMLImageElement | null; guest: HTMLImageElement | null; name: string };
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };
const noise = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function loadPortrait(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(null), 1800);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); resolve(null); };
    image.src = url;
  });
}

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string | CanvasGradient) {
  g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
}
function line(g: CanvasRenderingContext2D, points: number[][], color: string, width: number) {
  g.strokeStyle = color; g.lineWidth = width; g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
}
function polygon(g: CanvasRenderingContext2D, points: number[][], color: string | CanvasGradient) {
  g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
}

/** A floating portrait medallion; no anatomical detail is drawn. */
function portrait(g: CanvasRenderingContext2D, color: string, name: string, photo: HTMLImageElement | null, label = true) {
  g.shadowColor = color; g.shadowBlur = 13;
  ellipse(g, 0, 0, 26, 26, '#151219'); g.shadowBlur = 0;
  if (photo?.complete && photo.naturalWidth > 0) {
    const size = Math.min(photo.naturalWidth, photo.naturalHeight);
    g.save(); g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.clip();
    g.drawImage(photo, (photo.naturalWidth - size) / 2, (photo.naturalHeight - size) / 2, size, size, -25, -25, 50, 50); g.restore();
  } else {
    g.fillStyle = color; g.font = '700 15px sans-serif'; g.textAlign = 'center';
    g.fillText(name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2), 0, 6);
  }
  g.strokeStyle = color; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.stroke();
  if (label) {
    g.fillStyle = '#fff5e5'; g.font = '700 12px sans-serif'; g.textAlign = 'center';
    g.fillText(name.toLocaleUpperCase('fr').slice(0, 20), 0, -43);
  }
}

function fighter(
  g: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number,
  pose: number,
  color: string,
  name: string,
  photo: HTMLImageElement | null,
  rotation = 0,
  kick = 0,
  showHead = true,
  guard = 0,
  jerk = 0,
  dickSize = 0,
  holdHead = false
) {
  g.save();
  g.translate(x, y);
  g.rotate(rotation);

  if (showHead) {
    g.save();
    g.translate(0, -100);
    portrait(g, color, name, photo);
    g.restore();
  }

  g.scale(facing, 1);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Branlette beaucoup plus marquée
  const stroke = Math.sin(pose * 2.8) * 26 * jerk;
  const hip = Math.sin(pose * 2.8) * 6 * jerk;
  const punch = Math.sin(pose) * 18 * (1 - jerk);

  const limbs = [
    [[0, -72], [0, -36 + hip]],
    [[0, -36], [-18 - kick * 8, -kick * 12]],
    [[0, -36], [22 + kick * 58, -3 - kick * 66]],
    [[0, -62], [18, -51 - guard * 17], [38 + punch, -66 - guard * 24]],
    [[0, -61], [-16, -42], [-6 + stroke * 0.4, -22], [8 + stroke, -8]]
  ];

  for (const points of limbs) line(g, points, '#090b12', 10);
  g.shadowColor = color;
  g.shadowBlur = 7;
  for (const points of limbs) line(g, points, color, 5);

  // Zizi qui pousse
  if (dickSize > 0.05 && facing === 1) {
    const len = 8 + dickSize * 28;
    const thick = 3.5 + dickSize * 3;
    const angle = -0.55 + Math.sin(pose * 2.8) * 0.18 * jerk;

    g.save();
    g.translate(3, -26 + hip);
    g.rotate(angle);

    line(g, [[0, 0], [len, 0]], '#090b12', thick + 3);
    line(g, [[0, 0], [len, 0]], color, thick);
    ellipse(g, len + 1, 0, 5.5 + dickSize * 1.5, 4.2 + dickSize, color);
    line(g, [[3, -1.8], [len - 4, -1.8]], '#090b12', 1.3);
    g.restore();
  }

  // Tête tenue dans la main
  if (holdHead && photo) {
    g.save();
    g.translate(32, -18);
    g.scale(0.72, 0.72);
    portrait(g, '#ffbf85', name, photo, false);
    g.restore();
  }

  g.restore();
}

function impact(g: CanvasRenderingContext2D, x: number, y: number, age: number, big = false) {
  if (age < 0 || age > .25) return;
  const p = age / .25;
  g.save();
  g.globalAlpha *= 1 - p;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, r = 12 + p * (big ? 95 : 50);
    line(g, [[x + Math.cos(a) * r * .35, y + Math.sin(a) * r * .35], [x + Math.cos(a) * r, y + Math.sin(a) * r]], i % 2 ? '#a5eaff' : '#fff2b3', big ? 4 : 2);
  }
  g.strokeStyle = '#fff1be';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y, 14 + p * 65, 8 + p * 32, 0, 0, TAU);
  g.stroke();
  g.restore();
}

/** Gros jet style porno */
function cumshot(g: CanvasRenderingContext2D, x: number, y: number, age: number, dir = 1) {
  if (age < 0 || age > 2.1) return;

  g.save();
  g.shadowColor = '#fff8e0';
  g.shadowBlur = 12;

  for (let s = 0; s < 5; s++) {
    const delay = s * 0.07;
    const a = age - delay;
    if (a < 0) continue;

    const p = clamp(a / 0.85);
    const fade = 1 - ease((a - 0.7) / 1.2);
    g.globalAlpha = fade * 0.95;

    const spread = (s - 2) * 0.19;
    const speed = 130 + s * 18;
    const endX = x + Math.cos(spread) * speed * p * dir;
    const endY = y + Math.sin(spread) * speed * p * 0.65 - 55 * p * p;

    g.strokeStyle = s % 2 === 0 ? '#fffef6' : '#f7e9c4';
    g.lineWidth = 5.5 - s * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + (endX - x) * 0.4,
      y - 30 - s * 8,
      endX,
      endY
    );
    g.stroke();

    for (let d = 0; d < 4; d++) {
      const t = 0.3 + d * 0.18;
      const dx = x + (endX - x) * t + (noise(s * 10 + d) - 0.5) * 18;
      const dy = y + (endY - y) * t + Math.sin(t * Math.PI) * -20;
      const size = 3.5 + noise(s + d) * 3;
      ellipse(g, dx, dy, size, size * 0.75, '#fffef2');
    }
  }

  if (age > 0.25 && age < 0.9) {
    const p = (age - 0.25) / 0.65;
    g.globalAlpha = (1 - p) * 0.8;
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * TAU;
      const r = 12 + p * 55;
      ellipse(g,
        x + Math.cos(ang) * r * 0.7,
        y + Math.sin(ang) * r * 0.45 - 10,
        4, 3, '#fff8e8'
      );
    }
  }

  g.restore();
}

function giantScissors(g: CanvasRenderingContext2D, t: number) {
  const reveal = ease((t - 7.25) / .5);
  const close = ease((t - (CUT_AT - .3)) / .3);
  const away = ease((t - (CUT_AT + .55)) / .5);
  if (reveal === 0 || away === 1) return;

  g.save();
  g.translate(-12, -132);
  g.rotate((1 - reveal) * -1.4 - away * .9);
  const scale = reveal * (1 - away * .4) * 0.72;
  g.scale(scale, scale);
  g.globalAlpha *= 1 - away;
  g.shadowColor = '#b9edff';
  g.shadowBlur = 17;

  for (const side of [-1, 1]) {
    g.save();
    g.rotate(side * (.08 + (1 - close) * .48));
    const steel = g.createLinearGradient(0, -10, 0, 10);
    steel.addColorStop(0, '#668999');
    steel.addColorStop(.45, '#f3fcff');
    steel.addColorStop(1, '#7c9ba6');
    polygon(g, [[-34, -8], [10, -11], [163, 0], [10, 6], [-34, 8]], steel);
    g.strokeStyle = '#182832';
    g.lineWidth = 2;
    g.stroke();
    line(g, [[-45, 0], [-25, 0]], '#f0bb50', 8);
    g.strokeStyle = '#efb749';
    g.lineWidth = 7;
    g.beginPath();
    g.ellipse(-63, 0, 22, 15, 0, 0, TAU);
    g.stroke();
    g.restore();
  }
  ellipse(g, 0, 0, 6, 6, '#ffda79');
  ellipse(g, 0, 0, 2, 2, '#644528');
  g.restore();

  if (t < CUT_AT) {
    g.save();
    g.fillStyle = '#ffe5a8';
    g.font = '700 11px sans-serif';
    g.textAlign = 'center';
    g.fillText('LA COUPE FINALE', 0, -234);
    g.restore();
  }
}

function duel(g: CanvasRenderingContext2D, t: number, portraits: JourneyPortraits) {
  const jump = ease((t - 2.8) / .9);
  let lx = -260 + jump * 192;
  let rx = 260 - jump * 192;
  let ly = -35 - jump * 23 - Math.sin(jump * Math.PI) * 150;
  let ry = ly;
  let lr = 0, rr = 0, lk = 0, rk = 0, guard = 0;
  let jerk = 0;
  let dickSize = 0;
  let holdHead = false;
  let headOnGround = false;
  let headX = 102, headY = -40;
  let throwHead = false;

  const fighting = t >= 3.7 && t < 7.1;

  if (t >= 3.7 && t < 4.65) {
    const beat = Math.sin((t - 3.7) * 25);
    lx += Math.max(0, beat) * 22;
    rx += Math.max(0, beat) * 14;
    rr = Math.max(0, beat) * .16;
    guard = 1;
  } else if (t >= 4.65 && t < 5.5) {
    const p = (t - 4.65) / .85;
    ly += Math.sin(p * Math.PI) * 28;
    lr = -Math.sin(p * Math.PI) * .65;
    lk = Math.sin(p * Math.PI);
    rk = Math.max(0, Math.sin(p * Math.PI * 2));
    rx += Math.sin(p * Math.PI) * 35;
    rr = Math.sin(p * Math.PI) * .4;
  } else if (t >= 5.5 && t < 6.5) {
    const p = (t - 5.5) / 1.0;
    ly -= Math.sin(p * Math.PI) * 130;
    ry -= Math.sin(p * Math.PI) * 115;
    lr = -Math.sin(p * Math.PI) * TAU;
    rr = Math.sin(p * Math.PI) * TAU;
    lx += Math.sin(p * Math.PI) * 18;
    rx -= Math.sin(p * Math.PI) * 18;
    lk = Math.sin(p * Math.PI);
    rk = lk;
  } else if (t >= 6.5 && t < 7.1) {
    const p = (t - 6.5) / .6;
    lx += Math.sin(p * 16) * 10;
    guard = 0.4;
  }

  if (t >= 7.1) {
    lx = -70;
    ly = -58;
    rx = 105;
    ry = -58;
  }

  giantScissors(g, t);

  // Tête tombe par terre
  if (t >= CUT_AT) {
    headOnGround = true;
    const fall = ease(clamp((t - CUT_AT) / 0.55));
    headX = 102 + fall * 18;
    headY = -58 + fall * 95;
  }

  // Zizi qui pousse + branlette
  if (t >= 8.55) {
    dickSize = ease(clamp((t - 8.55) / 0.45));
  }
  if (t >= 8.7 && t < 10.2) {
    jerk = ease(clamp((t - 8.7) / 0.35));
  }

  // Gros jet
  if (t >= 9.25 && t < 11.0) {
    cumshot(g, lx + 38, ly - 18, t - 9.25, 1);
  }

  // Marche + ramasse la tête
  if (t >= 10.15 && t < 11.5) {
    const walk = ease(clamp((t - 10.15) / 0.7));
    lx = -70 + walk * 95;
    holdHead = t >= 10.85;
    if (holdHead) headOnGround = false;
  }

  // Jette la tête dans la lave
  if (t >= 11.45) {
    holdHead = false;
    throwHead = true;
    const throwP = clamp((t - 11.45) / 0.55);
    headX = 130 + throwP * 40;
    headY = -40 - Math.sin(throwP * Math.PI) * 90 + throwP * throwP * 160;
  }

  if (fighting) {
    for (let i = 3; i > 0; i--) {
      g.save();
      g.globalAlpha *= .06 * (4 - i);
      line(g, [[lx - 20 - i * 16, ly - 65], [lx - i * 16, ly - 60]], '#a0e8ff', 5);
      line(g, [[rx + 20 + i * 16, ry - 70], [rx + i * 16, ry - 65]], '#ffbf85', 5);
      g.restore();
    }
  }

  // Corps de l'adversaire (sans tête après la coupe)
  if (t < CUT_AT) {
    fighter(g, rx, ry, -1, fighting ? t * 30 + Math.PI : 0, '#ffbf85', portraits.name, portraits.guest, rr, rk, true, guard);
  } else {
    const dissolve = ease(clamp((t - CUT_AT) / 0.8));
    if (dissolve < 1) {
      g.save();
      g.globalAlpha *= 1 - dissolve;
      fighter(g, rx + 12 * dissolve, ry + 8 * dissolve, -1, 0, '#ffbf85', portraits.name, null, 0.1, 0, false);
      g.restore();
    }
  }

  // JDED
  fighter(
    g, lx, ly, 1,
    t * 22,
    '#a0e8ff', 'JDED', portraits.barber,
    lr, lk, true, guard,
    jerk, dickSize, holdHead
  );

  // Tête au sol ou en l’air
  if (headOnGround || throwHead) {
    g.save();
    g.translate(headX, headY);
    g.rotate(throwHead ? (t - 11.45) * 6 : 0.4);
    portrait(g, '#ffbf85', portraits.name, portraits.guest, false);

    // Lait qui coule sur la tête
    if (t > 9.4 && t < 11.0 && headOnGround) {
      const milk = t - 9.4;
      for (let i = 0; i < 6; i++) {
        ellipse(g, (noise(i) - 0.5) * 16, 12 + milk * 28 + i * 3, 2.8, 3.5, '#fff8e0');
      }
    }
    g.restore();
  }

  for (const [at, x, y] of [[3.94, 0, -123], [4.19, 7, -120], [4.44, 0, -120], [5.04, 40, -108], [5.94, 0, -220], [6.59, 25, -120]]) {
    impact(g, x, y, t - at);
  }
  impact(g, 102, -110, t - CUT_AT, true);

  if (t >= CUT_AT && t < CUT_AT + 0.55) {
    g.save();
    g.globalAlpha *= 1 - ease((t - CUT_AT) / 0.55);
    g.fillStyle = '#fff1c2';
    g.font = '900 26px sans-serif';
    g.textAlign = 'center';
    g.fillText('SNIP !', 100, -200 - (t - CUT_AT) * 25);
    g.restore();
  }
}

function familiarMountain(g: CanvasRenderingContext2D) {
  g.save(); g.translate(-207 * 3.2, -90 * 3.2); g.scale(3.2, 3.2);
  polygon(g, BACK, '#241a20');
  const rock = g.createLinearGradient(0, 90, 0, 260);
  rock.addColorStop(0, '#66372b'); rock.addColorStop(.6, '#25171a'); rock.addColorStop(1, '#0d0b10');
  polygon(g, MAIN, rock);
  for (const ridge of RIDGES) { g.strokeStyle = ridge.dark ? '#140f13' : '#985036'; g.lineWidth = ridge.dark ? 2 : .6; g.stroke(new Path2D(ridge.d)); }
  g.strokeStyle = '#ff702c'; g.shadowColor = '#ff681e'; g.shadowBlur = 6; g.lineWidth = 1;
  for (const letter of LETTERS) { g.save(); g.translate(letter.x, LETTERS_Y0); g.stroke(new Path2D(letter.d)); g.restore(); }
  g.restore();
}

function crater(g: CanvasRenderingContext2D, t: number) {
  familiarMountain(g);
  const slope = g.createLinearGradient(0, -60, 0, 550);
  slope.addColorStop(0, '#6a3a2b'); slope.addColorStop(.32, '#302027'); slope.addColorStop(1, '#0c0b11');
  polygon(g, [[-290, -30], [-355, 45], [-430, 195], [-620, 430], [-760, 620], [760, 620], [620, 430], [430, 195], [355, 45], [290, -30]], slope);
  for (let i = 0; i < 23; i++) {
    const side = i % 2 ? -1 : 1, x = side * (180 + noise(i) * 110);
    const y = 40 + noise(i + 40) * 80;
    line(g, [[x, y], [x * 1.25, y + 120], [x * 1.55 + side * 20, y + 280], [x * 1.9, y + 460]], '#100d13', 4 + noise(i) * 8);
    if (i % 3 === 0) line(g, [[x, y], [x * 1.25, y + 120], [x * 1.55 + side * 20, y + 280]], '#fc6721', 1.5);
  }
  ellipse(g, 0, 16, 325, 120, '#75412e');
  ellipse(g, 0, 23, 302, 104, '#2a171a');
  const wall = g.createLinearGradient(0, -65, 0, 140);
  wall.addColorStop(0, '#100e15'); wall.addColorStop(.55, '#47201b'); wall.addColorStop(1, '#ff6b1e');
  ellipse(g, 0, 38, 279, 90, wall);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI + i / 25 * Math.PI, x = Math.cos(a) * 280, y = 34 + Math.sin(a) * 91;
    line(g, [[x, y], [x * .91, y + 45], [x * .82, 90]], i % 4 ? '#703725' : '#ff8c32', i % 4 ? 2 : 3);
  }
  g.save(); g.shadowColor = '#ff5a14'; g.shadowBlur = 45;
  const pool = g.createRadialGradient(20, 80, 0, 0, 80, 270);
  pool.addColorStop(0, '#ffd369'); pool.addColorStop(.45, '#ff8a23'); pool.addColorStop(1, '#cf330d');
  g.fillStyle = pool; g.beginPath(); g.ellipse(0, 83, 257, 66, 0, 0, TAU); g.fill(); g.restore();
  g.save(); g.beginPath(); g.ellipse(0, 83, 255, 65, 0, 0, TAU); g.clip();
  for (let i = 0; i < 65; i++) {
    const x = (noise(i + 120) - .5) * 550 + Math.sin(t * .35 + i) * 8;
    const y = 20 + noise(i + 220) * 135;
    const r = 8 + noise(i + 360) * 35;
    ellipse(g, x, y, r, r * .21, i % 3 ? '#742316' : '#ffdd75');
    line(g, [[x - r, y], [x, y - 2], [x + r, y + 2]], '#ffb544', 1.2);
  }
  for (let i = 0; i < 9; i++) {
    const p = (t * .45 + noise(i)) % 1;
    g.strokeStyle = `rgba(255,230,149,${(1 - p) * .6})`; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse((noise(i + 99) - .5) * 420, 58 + noise(i + 88) * 50, 4 + p * 23, 2 + p * 5, 0, 0, TAU); g.stroke();
  }
  g.restore();
  polygon(g, [[-320, -10], [-275, -43], [-230, -55], [-170, -67], [-120, -62], [-65, -70], [-20, -63], [25, -68], [75, -60], [125, -67], [190, -52], [245, -46], [302, -20], [280, -6], [220, -24], [160, -36], [80, -38], [0, -42], [-100, -40], [-190, -30], [-260, -18]], '#49302c');
  line(g, [[-304, -14], [-230, -48], [-170, -57], [-100, -52], [0, -54], [95, -50], [180, -43], [260, -29], [300, -12]], '#bd7047', 2);
}

function foregroundRim(g: CanvasRenderingContext2D) {
  g.beginPath(); g.ellipse(0, 20, 325, 120, 0, 0, Math.PI);
  g.ellipse(0, 43, 278, 91, 0, Math.PI, 0, true); g.closePath();
  const rim = g.createLinearGradient(0, 100, 0, 155); rim.addColorStop(0, '#a35633'); rim.addColorStop(.5, '#482a25'); rim.addColorStop(1, '#23191e');
  g.fillStyle = rim; g.fill();
  for (let i = 0; i < 24; i++) {
    const a = .12 + (i / 24) * (Math.PI - .24);
    const x = Math.cos(a) * 305, y = 20 + Math.sin(a) * 115;
    line(g, [[x, y - 7], [x * 1.04, y + 12]], '#1c141a', 3 + noise(i) * 3);
  }
}

function splash(g: CanvasRenderingContext2D, age: number) {
  if (age < 0 || age > 1.8) return;
  const p = clamp(age / .7), fade = 1 - ease((age - .65) / 1.1);
  g.save(); g.globalAlpha *= fade; g.shadowColor = '#ff751c'; g.shadowBlur = 16;
  const crown: number[][] = [[110 - 65 * p, 95]];
  for (let i = 0; i <= 14; i++) {
    const x = 110 + (i / 14 - .5) * 130 * p;
    const y = 95 - Math.sin(i / 14 * Math.PI) * (i % 2 ? 74 : 38) * Math.sin(Math.PI * clamp(age / 1.1));
    crown.push([x, y]);
  }
  crown.push([110 + 65 * p, 95]); polygon(g, crown, '#ffd365');
  for (let i = 0; i < 32; i++) {
    const vx = (noise(i + 15) - .5) * 270, vy = -100 - noise(i + 90) * 220;
    const y = 95 + vy * age + 210 * age * age;
    if (y < 111) ellipse(g, 110 + vx * age, y, 2 + noise(i) * 4, 3 + noise(i) * 5, i % 3 ? '#ffbe41' : '#fff3b3');
  }
  for (let i = 0; i < 3; i++) {
    const r = Math.max(0, age - i * .13) * 110;
    g.strokeStyle = '#ffe58e'; g.lineWidth = 3 - i * .6; g.beginPath(); g.ellipse(110, 95, 8 + r, 3 + r * .22, 0, 0, TAU); g.stroke();
  }
  g.shadowBlur = 0;
  if (age < .85) { g.fillStyle = '#fff4cb'; g.font = '900 28px sans-serif'; g.textAlign = 'center'; g.fillText('PLOUF !', 110, -8 - age * 25); }
  g.restore();
}

function fireworks(g: CanvasRenderingContext2D, age: number) {
  if (age < 0) return;
  const colors = ['#ffe3a0', '#9ceaff', '#ffa26a', '#ffcc4c'];
  for (let n = 0; n < 7; n++) {
    const a = age - n * .34;
    if (a < 0 || a > 2.1) continue;
    const bx = (noise(n + 60) - .5) * 560, by = -210 - noise(n + 70) * 180;
    if (a < .5) {
      const p = a / .5;
      line(g, [[110 + (bx - 110) * Math.max(0, p - .12), 95 + (by - 95) * Math.max(0, p - .12)], [110 + (bx - 110) * p, 95 + (by - 95) * p]], '#ffe5b3', 2);
    } else {
      const p = a - .5;
      g.save(); g.globalAlpha *= 1 - clamp(p / 1.6); g.shadowColor = colors[n % 4]; g.shadowBlur = 7;
      for (let i = 0; i < 44; i++) {
        const angle = i / 44 * TAU, velocity = 70 + noise(i + n * 44) * 100;
        const r = velocity * p;
        const x = bx + Math.cos(angle) * r, y = by + Math.sin(angle) * r + p * p * 48;
        line(g, [[x - Math.cos(angle) * 8, y - Math.sin(angle) * 8 - 3], [x, y]], colors[(n + i) % 4], 1.8);
      }
      g.restore();
    }
  }
}

function eruption(g: CanvasRenderingContext2D, age: number) {
  if (age < 0) return;
  if (age < .85) {
    const p = clamp(age / .85);
    g.save(); g.globalAlpha *= (1 - p) * .8;
    const blast = g.createRadialGradient(110, 95, 0, 110, 95, 30 + p * 400);
    blast.addColorStop(0, '#ffe9a3'); blast.addColorStop(.25, '#ffae3eaa'); blast.addColorStop(1, '#ff681000');
    g.fillStyle = blast; g.fillRect(-400, -420, 1000, 1000);
    g.strokeStyle = '#ffd172'; g.lineWidth = 4 * (1 - p); g.beginPath(); g.ellipse(110, 95, 10 + p * 290, 5 + p * 120, 0, 0, TAU); g.stroke(); g.restore();
  }
  const intensity = ease(age / .6) * (1 - ease((age - 2.3) / 1.3));
  g.save(); g.globalAlpha *= intensity;
  const glow = g.createRadialGradient(60, 55, 0, 60, 55, 300);
  glow.addColorStop(0, '#ffb13466'); glow.addColorStop(1, '#ff5a0000'); g.fillStyle = glow; g.fillRect(-300, -300, 700, 700);
  for (let i = 0; i < 60; i++) {
    const p = (age * .65 + noise(i)) % 1, vx = (noise(i + 300) - .5) * 330;
    const x = 40 + vx * p, y = 75 - (220 + noise(i + 400) * 240) * p + 200 * p * p;
    line(g, [[x - vx * .025, y + 9], [x, y]], i % 3 ? '#ff9630' : '#ffe5a5', 1 + noise(i) * 3);
  }
  g.restore();
}

export function drawJourney(g: CanvasRenderingContext2D, w: number, h: number, t: number, portraits: JourneyPortraits, snapshot: HTMLCanvasElement | null) {
  g.clearRect(0, 0, w, h);
  const closeIn = ease((t - 1.1) / 1.25), exit = ease((t - RETURN_AT) / 1.6);
  if (t < 2.35 || t > RETURN_AT) {
    const zoom = t < 2.35 ? Math.exp(ease(t / 2.35) * 2.6) : Math.exp((1 - exit) * 2.6);
    const c = craterPoint(w, h);
    g.save(); g.globalAlpha = t < 2.35 ? 1 - closeIn : exit;
    g.fillStyle = '#0a0705'; g.fillRect(0, 0, w, h);
    g.translate(w / 2 + (c.x - w / 2) / zoom, h * .48 + (c.y - h * .48) / zoom); g.scale(zoom, zoom); g.translate(-c.x, -c.y);
    if (snapshot) g.drawImage(snapshot, 0, 0, w, h);
    g.restore();
  }
  const opacity = closeIn * (1 - ease((t - RETURN_AT) / 1.25));
  if (opacity > 0) {
    g.save(); g.globalAlpha = opacity;
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#050910'); sky.addColorStop(.55, '#28151b'); sky.addColorStop(1, '#5a251b'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) ellipse(g, noise(i) * w, noise(i + 100) * h * .45, .5 + noise(i + 200), .5 + noise(i + 200), '#b8cadb66');
    const scale = Math.min(w / 800, h / 720) * (1 + closeIn * .09);
    const cutShake = (1 - ease((t - CUT_AT) / .22)) * (t >= CUT_AT ? 1 : 0);
    const splashShake = (1 - ease((t - IMPACT_AT) / .55)) * (t >= IMPACT_AT ? 1 : 0);
    const shake = cutShake * 3 + splashShake * 6;
    g.translate(w / 2 + Math.sin(t * 83) * shake, h * .57 + Math.cos(t * 69) * shake * .5); g.scale(scale, scale);
    const heat = g.createRadialGradient(0, 35, 0, 0, 35, 440); heat.addColorStop(0, '#ff65133b'); heat.addColorStop(1, '#ff651300'); g.fillStyle = heat; g.fillRect(-600, -500, 1200, 1100);
    for (let i = 0; i < 10; i++) { const p = (t * .08 + noise(i)) % 1; ellipse(g, 35 + Math.sin(i * 4) * 45 + p * 50, -20 - p * 350, 20 + p * 65, 15 + p * 50, `rgba(98,70,65,${(1 - p) * .09})`); }
    crater(g, t);
    duel(g, t, portraits);
    splash(g, t - IMPACT_AT);
    eruption(g, t - FIREWORKS_AT - .25);
    foregroundRim(g);
    fireworks(g, t - FIREWORKS_AT);
    g.save(); g.translate(-207 * 2, 160 - LETTERS_Y0 * 2); g.scale(2, 2); g.strokeStyle = '#ff9b43'; g.lineWidth = 1.4; g.shadowColor = '#ff681e'; g.shadowBlur = 10;
    for (const letter of LETTERS) { g.save(); g.translate(letter.x, LETTERS_Y0); g.stroke(new Path2D(letter.d)); g.restore(); } g.restore();
    g.restore();
  }
  const flight = t < 2.2 ? clamp(t / 2.2) : t > RETURN_AT ? 1 - clamp((t - RETURN_AT) / 1.6) : 0;
  const streakAlpha = Math.sin(flight * Math.PI);
  if (streakAlpha > 0) {
    const c = craterPoint(w, h), cx = c.x + (w / 2 - c.x) * flight, cy = c.y + (h * .48 - c.y) * flight;
    g.save(); g.globalAlpha = streakAlpha * .8;
    for (let i = 0; i < 130; i++) {
      const a = i * 2.39996, p = ((noise(i) + t * (t > RETURN_AT ? -1.7 : 1.7)) % 1 + 1) % 1;
      const r = (.02 + p * p) * Math.max(w, h), len = (10 + p * 170) * streakAlpha;
      line(g, [[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len)]], i % 5 ? '#bce3ff' : '#ffbe76', .6 + p * 1.6);
    } g.restore();
  }
  g.save(); g.globalAlpha = ease(t / .4) * (1 - ease((t - JOURNEY_DURATION + .5) / .5)); g.textAlign = 'center';
  g.fillStyle = '#ffbd73'; g.font = '700 10px sans-serif'; g.fillText('J D E D   /   C U T', w / 2, Math.max(45, h * .09));
  g.fillStyle = '#fff1df'; g.font = `700 ${Math.min(17, w / 24)}px sans-serif`;
  const caption =
    t < 2.35 ? 'CAP SUR LE VOLCAN' :
    t < 3.7 ? 'LE DUEL DU CRATÈRE' :
    t < 7.1 ? 'JDED VS TOI · COMBO' :
    t < 8.3 ? 'LES CISEAUX' :
    t < 8.7 ? 'TÊTE PAR TERRE' :
    t < 9.3 ? 'LE ZIZI POUSSE...' :
    t < 10.2 ? 'ÉJACULATION' :
    t < 11.5 ? 'IL RAMASSE LA TÊTE' :
    t < RETURN_AT ? 'DANS LA LAVE !' :
    'RETOUR À LA RÉALITÉ';
  g.fillText(caption, w / 2, Math.max(72, h * .135));
  g.restore();
}