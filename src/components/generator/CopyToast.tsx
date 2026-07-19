/**
 * CopyToast — clipboard auto-clear toast (design.md §6.4, generator.md §1).
 * Driven entirely by VaultProvider's clipboard countdown: appears whenever a
 * copy is armed, shows the live M:SS countdown and a draining bar.
 * Enter: slide up 24px + scale .96→1 (spring-soft). Exit: fade 150ms.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useVault } from '@/providers/VaultProvider';

function formatClock(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CopyToast() {
  const { clipboardCountdown, lastCopiedLabel, settings } = useVault();
  const total = settings.clipboardClearSeconds || 20;
  const active = clipboardCountdown !== null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3 max-[719px]:bottom-20">
      <AnimatePresence>
        {active && (
          <motion.div
            key="copy-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto w-[300px] overflow-hidden rounded-xl border border-kh-lineStrong bg-kh-elevated shadow-drawer"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-kh-mint" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-kh-primary">
                  {lastCopiedLabel ? `${lastCopiedLabel} copied` : 'Copied'}
                </p>
                <p className="text-xs text-kh-muted">
                  Clipboard clears in{' '}
                  <span className="font-mono text-kh-cyan">{formatClock(clipboardCountdown)}</span>
                </p>
              </div>
            </div>
            {/* countdown bar */}
            <div className="h-0.5 w-full bg-kh-inset">
              <div
                className="h-full bg-kh-mint transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, (clipboardCountdown / total) * 100))}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
