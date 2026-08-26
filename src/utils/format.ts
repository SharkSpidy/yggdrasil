import type { Person } from "../types";

/** "1822 – 1889" or "1901 – present" for a person. */
export function lifespan(p: Person): string {
  const born = p.born ?? "?";
  const died = p.died != null ? p.died : "present";
  return `${born} – ${died}`;
}

export function isLiving(p: Person): boolean {
  return p.died == null;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** 0-indexed depth -> "Generation III" style label. */
export function generationLabel(depth: number): string {
  return `Generation ${ROMAN_NUMERALS[depth] ?? depth + 1}`;
}

export function ringLabel(index: number): string {
  return `Gen ${ROMAN_NUMERALS[index] ?? index + 1}`;
}
