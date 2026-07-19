/**
 * VaultToasts — bottom-right toast stack (design.md §6.4) plus the dedicated
 * clipboard auto-clear toast: "… copied — clipboard clears in 0:20" with a
 * live draining countdown bar (danger→mint gradient), then a "Clipboard
 * cleared" info toast when the wipe fires.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ClipboardCheck, Info, ShieldAlert } from 'lucide-react';
import { useVault } from '@/providers/VaultProvider';
import { cn } from '@/lib/utils';
import { subscribeVaultToasts } from './vault-utils';
import type { VaultToast } from './vault-utils';

const VARIANT_STYLE: Record<VaultToast['variant'], { icon: typeof Info; color: string; border: string }> = {
  success: { icon: CheckCircle2, color: '#35F0A1', border: 'rgba(53,240,161,.35)' },
  info: { icon: Info, color: '#38E1FF', border: 'rgba(56,225,255,.35)' },
  danger: { icon: ShieldAlert, color: '#FF5C7A', border: 'rgba(255,92,122,.35)' },
};

function ToastCard({ toast, onDismiss }: { toast: VaultToast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast.id, toast.durationMs, onDismiss]);

  const style = VARIANT_STYLE[toast.variant];
  const Icon = style.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="pointer-events-auto flex w-[340px] items-start gap-3 rounded-xl border bg-kh-elevated p-3.5 shadow-drawer"
      style={{ borderColor: style.border }}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: style.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-kh-primary">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs leading-5 text-kh-muted">{toast.description}</p>}
        {toast.actionLabel && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss(toast.id);
            }}
            className="mt-1 text-xs font-semibold text-kh-mint transition-colors hover:text-kh-cyan"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-1 text-kh-faint transition-colors hover:text-kh-primary"
      >
        ×
      </button>
    </motion.div>
  );
}

/** The clipboard auto-clear countdown toast — driven entirely by useVault(). */
function ClipboardToast() {
  const { clipboardCountdown, lastCopiedLabel, settings } = useVault();
  const total = Math.max(1, settings.clipboardClearSeconds);
  const [clearedTick, setClearedTick] = useState(0);

  const active = clipboardCountdown !== null && clipboardCountdown > 0;

  // fire a "Clipboard cleared" toast on the active → inactive transition
  const [wasActive, setWasActive] = useState(false);
  if (active !== wasActive) {
    setWasActive(active);
    if (wasActive && !active) setClearedTick((t) => t + 1);
  }

  const progress = active ? clipboardCountdown / total : 0;

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            key="clipboard"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto w-[340px] overflow-hidden rounded-xl border border-kh-warning/30 bg-kh-elevated shadow-drawer"
            role="status"
          >
            <div className="flex items-center gap-3 p-3.5 pb-3">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-kh-mint" aria-hidden />
              <p className="min-w-0 flex-1 text-sm leading-5 text-kh-primary">
                {lastCopiedLabel ?? 'Secret'} copied — clipboard clears in{' '}
                <span className="font-mono text-kh-warning">
                  0:{String(clipboardCountdown).padStart(2, '0')}
                </span>
              </p>
            </div>
            <div className="h-1 w-full bg-kh-inset">
              <div
                className="h-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(90deg, #FF5C7A 0%, #FFB84D 45%, #35F0A1 100%)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {clearedTick > 0 && <ClearedToast key={clearedTick} />}
      </AnimatePresence>
    </>
  );
}

function ClearedToast() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="pointer-events-auto flex w-[340px] items-center gap-3 rounded-xl border border-kh-cyan/30 bg-kh-elevated p-3.5 shadow-drawer"
      role="status"
    >
      <Info className="h-4 w-4 shrink-0 text-kh-cyan" aria-hidden />
      <p className="text-sm text-kh-primary">Clipboard cleared</p>
    </motion.div>
  );
}

export default function VaultToasts() {
  const [toasts, setToasts] = useState<VaultToast[]>([]);

  useEffect(
    () =>
      subscribeVaultToasts((t) => {
        setToasts((cur) => [...cur.slice(-3), t]);
      }),
    [],
  );

  const dismiss = useCallback((id: number) => setToasts((cur) => cur.filter((t) => t.id !== id)), []);

  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3',
      )}
    >
      <ClipboardToast />
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}