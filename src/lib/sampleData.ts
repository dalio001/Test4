/**
 * KeyHaven shared sample dataset (design.md §7) — 12 realistic vault entries
 * used consistently by the vault, security (Watchtower) and generator pages,
 * and to seed demo vaults.
 *
 * Stats baked in: total 12 · weak 2 · reused 2 · breached 1 · old (≥12mo) 1.
 * Security score target: 78/100.
 *
 * All page agents: import from `@/lib/sampleData` — signatures are stable.
 */

import type { VaultEntry } from './vault';

function isoDaysAgo(days: number, hours = 0): string {
  const d = new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
  return d.toISOString();
}

function entry(
  id: string,
  title: string,
  url: string,
  username: string,
  password: string,
  category: VaultEntry['category'],
  extra: Partial<VaultEntry> & { updatedDaysAgo: number; lastUsedDaysAgo: number },
): VaultEntry {
  const { updatedDaysAgo, lastUsedDaysAgo, ...rest } = extra;
  return {
    id,
    title,
    url,
    username,
    password,
    category,
    favorite: false,
    updatedAt: isoDaysAgo(updatedDaysAgo),
    lastUsedAt: isoDaysAgo(lastUsedDaysAgo),
    ...rest,
  };
}

/** The 12-entry demo dataset. `Netflix`/`Spotify` share a password (reused #1). */
export const SAMPLE_ENTRIES: VaultEntry[] = [
  entry('gh-01', 'GitHub', 'https://github.com', 'maya.dev', 'Tr7!kQ9#mZ2$vL8p', 'work', {
    updatedDaysAgo: 12,
    lastUsedDaysAgo: 0,
    notes: 'Work + personal repos',
  }),
  entry('gm-02', 'Gmail', 'https://mail.google.com', 'maya.r.mails@gmail.com', 'N3ptune$Rise!42', 'other', {
    totp: true,
    updatedDaysAgo: 45,
    lastUsedDaysAgo: 0,
  }),
  entry('fg-03', 'Figma', 'https://figma.com', 'maya@studio.design', 'design2024!', 'work', {
    updatedDaysAgo: 88,
    lastUsedDaysAgo: 2,
  }),
  entry('nt-04', 'Notion', 'https://notion.so', 'maya@studio.design', 'V@ult3dBl0cks99', 'work', {
    updatedDaysAgo: 30,
    lastUsedDaysAgo: 1,
  }),
  entry('nf-05', 'Netflix', 'https://netflix.com', 'maya.r@gmail.com', 'sunshine123', 'streaming', {
    updatedDaysAgo: 210,
    lastUsedDaysAgo: 3,
    notes: 'Family plan',
  }),
  entry('sp-06', 'Spotify', 'https://spotify.com', 'maya.r@gmail.com', 'sunshine123', 'streaming', {
    updatedDaysAgo: 190,
    lastUsedDaysAgo: 1,
  }),
  entry('az-07', 'Amazon', 'https://amazon.com', 'maya.r@gmail.com', 'Sh0pT!llDr0p#21', 'shopping', {
    updatedDaysAgo: 425, // old: 14 months
    lastUsedDaysAgo: 9,
  }),
  entry('li-08', 'LinkedIn', 'https://linkedin.com', 'Maya R.', 'BlueCollar2023', 'social', {
    updatedDaysAgo: 150,
    lastUsedDaysAgo: 6,
  }),
  entry('tw-09', 'X / Twitter', 'https://x.com', '@mayamakes', 'qwerty2020', 'social', {
    updatedDaysAgo: 320,
    lastUsedDaysAgo: 14,
    breached: true,
  }),
  entry('cb-10', 'Chase Bank', 'https://chase.com', 'maya.r.banking', 'F!nanceF0rtress#88', 'finance', {
    favorite: true,
    totp: true,
    updatedDaysAgo: 20,
    lastUsedDaysAgo: 0,
    notes: 'Main checking',
  }),
  entry('pp-11', 'PayPal', 'https://paypal.com', 'maya.r@gmail.com', 'PayMe$2023fair', 'finance', {
    updatedDaysAgo: 130,
    lastUsedDaysAgo: 5,
  }),
  entry('dc-12', 'Discord', 'https://discord.com', 'mayamakes', 'G4m!ngW!zard#77', 'social', {
    favorite: true,
    updatedDaysAgo: 15,
    lastUsedDaysAgo: 0,
  }),
];

/** Headline stats for the sample dataset (Watchtower). */
export const SAMPLE_STATS = {
  total: 12,
  weak: 2,
  reused: 2,
  breached: 1,
  old: 1,
  securityScore: 78,
} as const;

/** A fresh deep copy of the sample entries (safe to mutate / seed a vault with). */
export function cloneSampleEntries(): VaultEntry[] {
  return SAMPLE_ENTRIES.map((e) => ({ ...e }));
}