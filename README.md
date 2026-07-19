# KeyHaven — Every password. One vault. Only you.

A **zero-knowledge, local-first password manager**. All your logins are encrypted **inside your own browser** — there is no server, no account, and no one (not even this app) can ever read your passwords except you.

## Unlock methods (multi-layer security)

| Method | What it is |
|---|---|
| **Master password** | One strong password only you know. It *is* the encryption key — it is never stored anywhere. |
| **Passkey (WebAuthn)** | Unlock with your fingerprint / face / device PIN — phishing-proof. |
| **Google Authenticator (TOTP)** | 6-digit codes from Google Authenticator, Authy, or any authenticator app. Scan the QR code in Settings to connect. |
| **Recovery codes** | 8 one-time backup codes to download/print as an Emergency Kit. |

Extra protection: **auto-lock timer**, **clipboard auto-clear** (copied passwords wipe themselves), failed-attempt lockout, masked secrets everywhere.

## How it protects you (the crypto)

1. Your master password → **PBKDF2-SHA256, 600,000 iterations** → a 256-bit key.
2. Your whole vault → **AES-256-GCM** encryption (the same standard banks use).
3. Only the **encrypted blob** is stored (IndexedDB in your browser). Plaintext never touches disk or network.
4. Backup = one **encrypted export file** you can download and re-import anywhere.

## Features

- **Vault dashboard** — search, categories, favorites, ⌘K command palette, one-click copy with auto-clear, per-login TOTP codes.
- **Create-vault wizard** — master password → authenticator QR → passkey → recovery codes, in 4 guided steps.
- **Watchtower** — security score, weak / reused / old / breached password audit with one-click fixes, offline breach-style scan.
- **Generator** — passwords, passphrases, PINs with entropy bits + crack-time estimates.
- **Settings** — manage passkeys, authenticator, recovery codes, auto-lock, encrypted backup export/import.

## Run it yourself (beginner guide)

You need **Node.js 20** installed ([download here](https://nodejs.org)).

```bash
# 1. Get the code
git clone https://github.com/dalio001/Test4.git
cd Test4

# 2. Install dependencies (this creates package-lock.json automatically)
npm install

# 3. Start the app
npm run build && npm run preview
# or for development: npm run dev
```

Open the printed local address in your browser → **Create your vault**.

### Images

The 7 image assets (hero background, vault door, avatars…) are too large for the API that published this repo, so they ship separately as **`keyhaven-images.zip`**. To use them locally: unzip it and drop all files into the `public/` folder (they are referenced as `/hero-fallback.png`, `/unlock-vault.png`, etc.). The app still works without them — images are decorative.

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 3.4 · shadcn/ui · Framer Motion · GSAP · Three.js · WebCrypto API · WebAuthn · zxcvbn-ts · qrcode.react

## Project structure

```
src/
  lib/         crypto.ts (PBKDF2+AES-GCM) · totp.ts (RFC 6238) · webauthn.ts (passkeys) · vault.ts (encrypted storage)
  providers/   VaultProvider.tsx (unlock state, auto-lock, clipboard clearing)
  pages/       Home · Unlock · Vault · Security · Generator · Settings · About
  components/  ui/ (shadcn) + feature folders (vault, unlock, security, generator, settings, about)
```

> **Your passwords never leave your device.** Lose your master password AND recovery codes, and the vault is mathematically unrecoverable — that's the point.
