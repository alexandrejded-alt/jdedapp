/**
 * Dates et heures : tout est affiché et saisi en heure de Paris,
 * quel que soit le fuseau du téléphone ou de l'ordinateur.
 * En base, les créneaux sont stockés en UTC (timestamptz).
 */
export const TZ = 'Europe/Paris';

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

function parisParts(ms: number): Parts {
  const o: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  }
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Décalage de Paris par rapport à UTC, en minutes, à un instant donné. */
function offsetMinutes(utcMs: number): number {
  const p = parisParts(utcMs);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - utcMs) / 60000;
}

/** "2026-11-12" + "14:30" (heure de Paris) -> instant exact. */
export function parisToDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = offsetMinutes(guess);
  let ms = guess - off1 * 60000;
  const off2 = offsetMinutes(ms);
  if (off2 !== off1) ms = guess - off2 * 60000;
  return new Date(ms);
}

export function parisToIso(date: string, time: string): string {
  return parisToDate(date, time).toISOString();
}

/** Date du jour à Paris, "AAAA-MM-JJ". */
export function todayParis(now: Date = new Date()): string {
  const p = parisParts(now.getTime());
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

/** Date (AAAA-MM-JJ) d'un instant, vue de Paris. */
export function dateParis(iso: string): string {
  const p = parisParts(new Date(iso).getTime());
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

/** Heure (HH:MM) d'un instant, vue de Paris. */
export function timeParis(iso: string): string {
  const p = parisParts(new Date(iso).getTime());
  return `${pad2(p.h)}:${pad2(p.mi)}`;
}

/** Ajoute des jours à une date AAAA-MM-JJ (calcul de calendrier pur). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** Lundi de la semaine qui contient cette date. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(date, -dow);
}

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (n: number): string => `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;
export const hhmm = (t: string | null | undefined): string => (t ? t.slice(0, 5) : '');

const noonUtc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const F_LONG = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const F_WD = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
const F_MO = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
const F_MONTH = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long' });
const F_DM = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short' });

/** "Jeudi 12 novembre" */
export const dayLong = (date: string): string => cap(F_LONG.format(noonUtc(date)));

/** Morceaux pour les pastilles de jour : { wd: "jeu", dn: 12, mo: "nov" } */
export function dayParts(date: string): { wd: string; dn: number; mo: string } {
  const d = noonUtc(date);
  return {
    wd: F_WD.format(d).replace('.', ''),
    dn: d.getUTCDate(),
    mo: F_MO.format(d).replace('.', ''),
  };
}

export const monthLabel = (y: number, m: number): string => cap(F_MONTH.format(new Date(Date.UTC(y, m, 1, 12)))) + ' ' + y;

/** "9 nov." pour une date de création. */
export const shortDate = (iso: string): string => F_DM.format(new Date(iso)).replace('.', '');
