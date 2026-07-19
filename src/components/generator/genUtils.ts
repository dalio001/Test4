/**
 * Generator page utilities — recipe state, entropy math, charset helpers.
 *
 * Wraps `generatePassword` from `@/lib/crypto` (the single crypto source of
 * truth) with the two recipe features the lib does not implement:
 *  - "Exclude look-alikes" (l 1 I O 0): rejection sampling over the lib's
 *    uniform output keeps the distribution uniform on the restricted set.
 *  - Passphrase "Capitalize words" off: decapitalize + strip the trailing
 *    separator/digit the lib always appends.
 */

import { generatePassword, secureRandomInt } from '@/lib/crypto';

export type GenMode = 'password' | 'passphrase' | 'pin';

export interface RecipeState {
  /** password mode: 8–64, default 20 */
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeLookalikes: boolean;
  /** passphrase mode: 3–8 words, default 4 */
  words: number;
  separator: string; // '-' | '.' | '_' | ' '
  capitalize: boolean;
  /** pin mode: 4–12 digits, default 6 */
  pinLength: number;
}

export const DEFAULT_RECIPE: RecipeState = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeLookalikes: false,
  words: 4,
  separator: '-',
  capitalize: true,
  pinLength: 6,
};

export interface HistoryItem {
  id: string;
  value: string;
  mode: GenMode;
  bits: number;
  createdAt: number;
}

export function makeId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ------------------------------------------------------------------ */
/* charsets — MUST stay in sync with src/lib/crypto.ts                 */
/* ------------------------------------------------------------------ */

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~';
/** entries in the lib's PASSPHRASE_WORDS list (uniform sampling index space) */
const WORDLIST_SIZE = 363;

const LOOKALIKE_RE = /[l1IO0]/;

/** Forge a secret for the given mode + recipe using the lib generator. */
export function forgeSecret(mode: GenMode, recipe: RecipeState): string {
  if (mode === 'pin') {
    return generatePassword({ mode: 'pin', pinLength: recipe.pinLength });
  }

  if (mode === 'passphrase') {
    const raw = generatePassword({
      mode: 'passphrase',
      words: recipe.words,
      separator: recipe.separator,
    });
    if (recipe.capitalize) return raw;
    // lib always capitalizes one word and appends `<sep><digit>` — undo both.
    return raw.slice(0, Math.max(0, raw.length - 2)).toLowerCase();
  }

  const opts = {
    mode: 'password' as const,
    length: recipe.length,
    upper: recipe.upper,
    lower: recipe.lower,
    digits: recipe.digits,
    symbols: recipe.symbols,
  };
  if (!recipe.excludeLookalikes) return generatePassword(opts);

  // Rejection sampling: uniform over the look-alike-free subset.
  let last = '';
  for (let i = 0; i < 50; i++) {
    last = generatePassword(opts);
    if (!LOOKALIKE_RE.test(last)) return last;
  }
  // Statistically unreachable fallback: swap look-alikes within their class.
  return last
    .split('')
    .map((ch) => {
      if (ch === 'l') return LOWER.replace('l', '')[secureRandomInt(LOWER.length - 1)];
      if (ch === 'I' || ch === 'O') return UPPER.replace(/[IO]/g, '')[secureRandomInt(UPPER.length - 2)];
      if (ch === '1' || ch === '0') return DIGITS.replace(/[10]/g, '')[secureRandomInt(DIGITS.length - 2)];
      return ch;
    })
    .join('');
}

/** Theoretical entropy (bits) of the generator's uniform sampling space. */
export function entropyBits(mode: GenMode, recipe: RecipeState): number {
  if (mode === 'pin') return recipe.pinLength * Math.log2(10);

  if (mode === 'passphrase') {
    const base = recipe.words * Math.log2(WORDLIST_SIZE);
    // lib behavior when capitalizing: + position of the capitalized word + trailing digit
    return recipe.capitalize ? base + Math.log2(recipe.words) + Math.log2(10) : base;
  }

  let pool = 0;
  if (recipe.upper) pool += recipe.excludeLookalikes ? UPPER.length - 2 : UPPER.length;
  if (recipe.lower) pool += recipe.excludeLookalikes ? LOWER.length - 1 : LOWER.length;
  if (recipe.digits) pool += recipe.excludeLookalikes ? DIGITS.length - 2 : DIGITS.length;
  if (recipe.symbols) pool += SYMBOLS.length;
  if (pool === 0) pool = LOWER.length;
  return recipe.length * Math.log2(pool);
}

/** Offline attack at 100B guesses/sec (zxcvbn's fast-hash rate: 1e11/s). */
export function crackSecondsAt100B(bits: number): number {
  return Math.pow(2, bits) / 1e11;
}

const TIME_UNITS: [number, string][] = [
  [1e18, 'quintillion'],
  [1e15, 'quadrillion'],
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
];

function trim(n: number): string {
  return n < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString('en-US');
}

/** Human crack-time like `3 trillion years` (or `less than a second`). */
export function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'forever';
  const YEAR = 31_557_600;
  if (seconds < 1) return 'less than a second';
  if (seconds < 60) return `${trim(seconds)} seconds`;
  if (seconds < 3_600) return `${trim(seconds / 60)} minutes`;
  if (seconds < 86_400) return `${trim(seconds / 3_600)} hours`;
  if (seconds < YEAR) return `${trim(seconds / 86_400)} days`;
  const years = seconds / YEAR;
  if (years >= 1e21) return `${years.toExponential(1).replace('e+', ' × 10^')} years`;
  if (years < 100) return `${trim(years)} years`;
  for (const [unit, name] of TIME_UNITS) {
    if (years >= unit) return `${trim(years / unit)} ${name} years`;
  }
  return `${trim(years)} years`;
}

/* ------------------------------------------------------------------ */
/* per-character coloring (design: symbols cyan, digits violet)        */
/* ------------------------------------------------------------------ */

export function charColorClass(ch: string, mode: GenMode): string {
  if (ch >= '0' && ch <= '9') return 'text-kh-violet';
  const isLetter = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  if (isLetter) return 'text-kh-primary';
  if (mode === 'passphrase') return 'text-kh-mint'; // separators
  return 'text-kh-cyan'; // symbols
}

/* ------------------------------------------------------------------ */
/* composition mini-bars                                               */
/* ------------------------------------------------------------------ */

export interface CompositionSegment {
  key: string;
  label: string;
  pct: number; // 0–100
  color: string;
}

/** Charset proportions of an actual forged value (stacked bar). */
export function compositionOf(value: string, mode: GenMode): CompositionSegment[] {
  let letters = 0;
  let digits = 0;
  let symbols = 0;
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') digits++;
    else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) letters++;
    else symbols++;
  }
  const total = Math.max(1, value.length);
  const pct = (n: number) => Math.round((n / total) * 1000) / 10;
  if (mode === 'pin') {
    return [{ key: 'digits', label: 'Digits', pct: 100, color: '#8B7CFF' }];
  }
  if (mode === 'passphrase') {
    return [
      { key: 'letters', label: 'Words', pct: pct(letters), color: '#35F0A1' },
      { key: 'separators', label: 'Separators', pct: pct(symbols), color: '#38E1FF' },
      { key: 'digits', label: 'Digits', pct: pct(digits), color: '#8B7CFF' },
    ].filter((s) => s.pct > 0);
  }
  return [
    { key: 'letters', label: 'Letters', pct: pct(letters), color: '#35F0A1' },
    { key: 'digits', label: 'Digits', pct: pct(digits), color: '#8B7CFF' },
    { key: 'symbols', label: 'Symbols', pct: pct(symbols), color: '#38E1FF' },
  ].filter((s) => s.pct > 0);
}

/* ------------------------------------------------------------------ */
/* strength ramp (design.md §2)                                        */
/* ------------------------------------------------------------------ */

export const STRENGTH_LABELS = ['Weak', 'Weak', 'Fair', 'Strong', 'Excellent'] as const;
export const STRENGTH_COLORS = ['#FF5C7A', '#FF5C7A', '#FFB84D', '#38E1FF', '#35F0A1'] as const;

export const MODE_LABELS: Record<GenMode, string> = {
  password: 'Password',
  passphrase: 'Passphrase',
  pin: 'PIN',
};
