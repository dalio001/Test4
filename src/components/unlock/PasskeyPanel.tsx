/**
 * PasskeyPanel — shared passkey UI for the Unlock tab (mode="unlock") and
 * the Create Vault wizard step 3 (mode="register"). Fingerprint glyph in a
 * violet pulsing VaultRing; the pulse accelerates during the WebAuthn
 * ceremony. Register success fills the ring mint, pops a check and fires a
 * subtle 12-dot particle burst. Graceful info state when no platform
 * authenticator is available.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Fingerprint, Loader2, Usb } from 'lucide-react';
import VaultRing from '@/components/VaultRing';
import { useVault } from '@/providers/VaultProvider';
import { cn } from '@/lib/utils';

export interface PasskeyPanelProps {
  mode: 'unlock' | 'register';
  /** unlock: passkey accepted (parent starts the success ceremony) */
  onSuccess?: () => void;
  /** unlock: "Use master password instead" */
  onFallback?: () => void;
  /** register: passkey registered — enables the wizard Continue */
  onRegistered?: () => void;
  /** register: "Skip for now" */
  onSkip?: () => void;
  /** disable all controls (failed-attempt lockout) */
  disabled?: boolean;
}

/** 12-dot mint particle burst (400ms) shown on register success. */
function ParticleBurst() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-kh-mint"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * 64,
              y: Math.sin(angle) * 64,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

export default function PasskeyPanel({
  mode,
  onSuccess,
  onFallback,
  onRegistered,
  onSkip,
  disabled,
}: PasskeyPanelProps) {
  const { passkeyAvailable, unlockWithPasskey, addPasskey } = useVault();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(false), 500);
    return () => clearTimeout(t);
  }, [burst]);

  if (!passkeyAvailable) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-kh-line bg-kh-inset">
          <Usb className="h-7 w-7 text-kh-muted" />
        </div>
        <p className="text-sm leading-[22px] text-kh-muted">
          Insert a security key or use a device with biometrics — this browser
          didn't report a built-in authenticator.
        </p>
        {mode === 'unlock' && onFallback && (
          <button
            type="button"
            onClick={onFallback}
            className="rounded-full border border-kh-lineStrong px-4 py-2 text-sm font-medium text-kh-primary transition-colors hover:bg-kh-elevated"
          >
            Choose another method
          </button>
        )}
        {mode === 'register' && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-kh-lineStrong px-4 py-2 text-sm font-medium text-kh-primary transition-colors hover:bg-kh-elevated"
          >
            Continue without a passkey
          </button>
        )}
      </div>
    );
  }

  const run = async () => {
    setBusy(true);
    setError(null);
    if (mode === 'unlock') {
      const ok = await unlockWithPasskey();
      setBusy(false);
      if (ok) {
        onSuccess?.();
      } else {
        setError("That passkey wasn't recognized — try again or use another method.");
      }
    } else {
      const ok = await addPasskey('This device');
      setBusy(false);
      if (ok) {
        setDone(true);
        setBurst(true);
        onRegistered?.();
      } else {
        setError('Passkey registration was cancelled or failed — you can try again or skip.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-1 text-center">
      {/* pulsing fingerprint ring (violet; fills mint on success) */}
      <motion.div
        className="relative"
        animate={{ scale: done ? 1 : busy ? [1, 1.1, 1] : [1, 1.06, 1] }}
        transition={
          done
            ? { duration: 0.2 }
            : { duration: busy ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <VaultRing size={120} progress={done ? 1 : undefined}>
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span
                key="check"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-kh-mint/15 text-kh-mint"
              >
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span
                key="finger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-kh-violet/10 text-kh-violet"
              >
                <Fingerprint className="h-7 w-7" />
              </motion.span>
            )}
          </AnimatePresence>
        </VaultRing>
        {burst && <ParticleBurst />}
      </motion.div>

      <p className="text-sm leading-[22px] text-kh-muted">
        {done
          ? 'Passkey ready — next time, one touch opens your vault.'
          : busy
            ? "Follow your device's prompt…"
            : mode === 'unlock'
              ? 'Use your fingerprint, face, device PIN, or security key.'
              : "Register this device's fingerprint/face or a USB security key so you can skip typing entirely."}
      </p>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm leading-[22px] text-kh-danger"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      {!done && (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl bg-kh-violet px-4 py-3 text-sm font-semibold text-[#0B0718] transition-all duration-200',
            'hover:-translate-y-px hover:shadow-[0_0_32px_rgba(139,124,255,.35)] active:scale-[0.97]',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none',
          )}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'unlock' ? 'Unlock with passkey' : 'Register passkey'}
        </button>
      )}

      {mode === 'unlock' && onFallback && (
        <button
          type="button"
          onClick={onFallback}
          className="text-sm font-medium text-kh-muted underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
        >
          Use master password instead
        </button>
      )}
      {mode === 'register' && onSkip && !done && (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-kh-muted underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}