/**
 * KeyHaven passkey (WebAuthn) helpers.
 *
 * Strategy: when a passkey is registered we wrap (encrypt) the AES-GCM vault
 * key with a wrapping key derived from the credential's raw ID + a random salt
 * (SHA-256 → AES-GCM). The wrapped blob is stored in the vault record.
 * To unlock, `navigator.credentials.get()` requires the user's biometric / PIN /
 * security key; only then can the wrapping key be recomputed and the vault key
 * unwrapped. All heavy lifting stays local — nothing is transmitted.
 *
 * Graceful fallback: every entry point checks availability first; when
 * WebAuthn or platform authenticators are unavailable, `isPasskeyAvailable()`
 * returns false and callers should hide passkey UI.
 *
 * All page agents: import from `@/lib/webauthn` — signatures are stable.
 */

import {
  b64ToBuf,
  bufToB64,
  decryptVault,
  encryptVault,
  exportRawKey,
  importRawKey,
  randomBytes,
  randomSalt,
} from './crypto';

/** A passkey-wrapped vault key as persisted (inside the encrypted vault record metadata). */
export interface WrappedKeyBlob {
  /** base64 of the WebAuthn credential raw ID */
  credentialId: string;
  /** encryptVault(wrappingKey, rawVaultKeyB64) */
  wrappedKey: string;
  /** base64 salt mixed into the wrapping key */
  salt: string;
  /** user label, e.g. "MacBook Touch ID" */
  name: string;
  createdAt: string;
}

/** True when the WebAuthn API exists at all. */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials &&
    typeof navigator.credentials.create === 'function'
  );
}

/** True when a platform authenticator (Touch ID, Windows Hello, Android biometrics) is likely available. */
export async function isPasskeyAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Derive the AES-GCM wrapping key from a credential raw ID + salt. */
async function deriveWrappingKey(rawId: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey> {
  const idBytes = new Uint8Array(rawId);
  const material = new Uint8Array(idBytes.length + salt.length);
  material.set(idBytes, 0);
  material.set(salt, idBytes.length);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Register a new passkey and wrap the vault key with it.
 * @param vaultKey the in-memory AES-GCM vault key (unlocked session)
 * @param name friendly label for the passkey
 * @returns the wrapped blob to persist, or null if the user cancelled / unsupported
 */
export async function registerPasskey(
  vaultKey: CryptoKey,
  name = 'Passkey',
): Promise<WrappedKeyBlob | null> {
  if (!isWebAuthnSupported()) return null;
  try {
    const userId = randomBytes(16);
    const challenge = randomBytes(32);
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge as BufferSource,
        rp: { name: 'KeyHaven' },
        user: {
          id: userId as BufferSource,
          name: `keyhaven-${bufToB64(userId).slice(0, 8)}`,
          displayName: 'KeyHaven Vault',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return null;
    const rawId = credential.rawId;
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey(rawId, salt);
    const rawVaultKey = await exportRawKey(vaultKey);
    const wrappedKey = await encryptVault(wrappingKey, rawVaultKey);
    return {
      credentialId: bufToB64(rawId),
      wrappedKey,
      salt: bufToB64(salt),
      name,
      createdAt: new Date().toISOString(),
    };
  } catch {
    // user cancelled, authenticator unavailable, etc.
    return null;
  }
}

/**
 * Authenticate with a passkey and unwrap the vault key.
 * @param blob a previously stored {@link WrappedKeyBlob}
 * @returns the unwrapped AES-GCM vault key, or null on failure/cancel
 */
export async function unwrapWithPasskey(blob: WrappedKeyBlob): Promise<CryptoKey | null> {
  if (!isWebAuthnSupported()) return null;
  try {
    const challenge = randomBytes(32);
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge as BufferSource,
        allowCredentials: [
          { type: 'public-key', id: b64ToBuf(blob.credentialId) as BufferSource },
        ],
        userVerification: 'preferred',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return null;
    const wrappingKey = await deriveWrappingKey(assertion.rawId, b64ToBuf(blob.salt));
    const rawVaultKey = await decryptVault(wrappingKey, blob.wrappedKey);
    return await importRawKey(rawVaultKey);
  } catch {
    return null;
  }
}