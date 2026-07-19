/**
 * KeyHaven vault model + IndexedDB persistence layer.
 *
 * ONLY ciphertext is ever written to disk: the vault record holds the KDF salt,
 * KDF params, a key verifier, and one AES-GCM encrypted blob containing
 * `{ entries, settings, recoveryCodes }`. The TOTP secret (when enrolled) is
 * itself encrypted with the vault key before storage.
 *
 * All page agents: import from `@/lib/vault` — signatures are stable.
 */

import { KDF_ITERATIONS } from './crypto';
import type { WrappedKeyBlob } from './webauthn';

/* ------------------------------------------------------------------ */
/* content model (design.md §7)                                        */
/* ------------------------------------------------------------------ */

export type VaultCategory = 'social' | 'finance' | 'work' | 'shopping' | 'streaming' | 'other';

export interface VaultEntry {
  id: string;
  title: string;
  url: string;
  username: string;
  /** secret — rendered masked in UI; strength derived via zxcvbn (0–4) */
  password: string;
  category: VaultCategory;
  favorite: boolean;
  notes?: string;
  /** has a 2FA/TOTP code stored for this login */
  totp?: boolean;
  /** ISO timestamps */
  updatedAt: string;
  lastUsedAt: string;
  /** flagged by local breach-style scan */
  breached?: boolean;
}

export interface VaultSettings {
  /** minutes of inactivity before the vault auto-locks (default 5) */
  autoLockMinutes: number;
  /** seconds before a copied secret is wiped from the clipboard (default 20) */
  clipboardClearSeconds: number;
  /** reveal secrets auto-remask after N seconds (default 15) */
  remaskSeconds: number;
}

export const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 20,
  remaskSeconds: 15,
};

/** The decrypted payload — exists in memory only, while unlocked. */
export interface VaultData {
  entries: VaultEntry[];
  settings: VaultSettings;
  recoveryCodes: string[];
}

/* ------------------------------------------------------------------ */
/* persisted record (ciphertext only)                                  */
/* ------------------------------------------------------------------ */

export interface VaultRecord {
  version: 1;
  /** base64 PBKDF2 salt */
  salt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number };
  /** base64 SHA-256 of the raw derived key — rejects wrong passwords early */
  verifier: string;
  /** encryptVault(key, JSON.stringify(VaultData)) */
  blob: string;
  /** TOTP second factor: base32 secret encrypted with the vault key */
  totpSecretEncrypted?: string;
  totpEnabled?: boolean;
  /** passkey-wrapped copies of the vault key */
  passkeys?: WrappedKeyBlob[];
  createdAt: string;
  updatedAt: string;
}

export function newVaultRecord(salt: string, verifier: string, blob: string): VaultRecord {
  const now = new Date().toISOString();
  return {
    version: 1,
    salt,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS },
    verifier,
    blob,
    passkeys: [],
    createdAt: now,
    updatedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

const DB_NAME = 'keyhaven';
const DB_VERSION = 1;
const STORE = 'vault';
const RECORD_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persist the (fully encrypted) vault record. */
export async function saveVaultRecord(record: VaultRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...record, updatedAt: new Date().toISOString() }, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load the persisted vault record, or null when none exists. */
export async function loadVaultRecord(): Promise<VaultRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(RECORD_KEY);
    req.onsuccess = () => resolve((req.result as VaultRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** True when a vault exists on this device. */
export async function hasVault(): Promise<boolean> {
  return (await loadVaultRecord()) !== null;
}

/** Permanently delete the local vault (danger zone). */
export async function clearVaultRecord(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ------------------------------------------------------------------ */
/* encrypted export / import                                           */
/* ------------------------------------------------------------------ */

export interface VaultExportFile {
  app: 'keyhaven';
  kind: 'encrypted-vault-export';
  version: 1;
  exportedAt: string;
  /** the still-encrypted vault record — ciphertext only, safe to store anywhere */
  record: VaultRecord;
}

/** Serialize the encrypted record for download (stays ciphertext end-to-end). */
export function buildExportFile(record: VaultRecord): string {
  const file: VaultExportFile = {
    app: 'keyhaven',
    kind: 'encrypted-vault-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    record,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Parse an exported backup file. Accepts both the {@link VaultExportFile}
 * wrapper and a bare {@link VaultRecord}. Throws on malformed input.
 */
export function parseExportFile(text: string): VaultRecord {
  const parsed = JSON.parse(text) as Partial<VaultExportFile> & Partial<VaultRecord>;
  const record =
    parsed.kind === 'encrypted-vault-export' && parsed.record
      ? parsed.record
      : (parsed as VaultRecord);
  if (
    !record ||
    record.version !== 1 ||
    typeof record.salt !== 'string' ||
    typeof record.blob !== 'string' ||
    typeof record.verifier !== 'string' ||
    !record.kdf
  ) {
    throw new Error('Not a valid KeyHaven encrypted backup file.');
  }
  return record;
}

/** Trigger a browser download of the encrypted backup. */
export function downloadVaultExport(record: VaultRecord): void {
  const blob = new Blob([buildExportFile(record)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `keyhaven-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}