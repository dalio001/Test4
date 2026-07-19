/**
 * StrengthMeter — 4-segment zxcvbn strength gauge (design.md §6.4).
 * Ramp: 0–1 danger · 2 warning · 3 cyan · 4 mint. Label + crack-time
 * caption ("centuries to crack") + entropy bits in mono.
 */

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { zxcvbn } from 'zxcvbn-ts';
import { cn } from '@/lib/utils';

const LABELS = ['Weak', 'Weak', 'Fair', 'Strong', 'Excellent'] as const;
const COLORS = ['#FF5C7A', '#FF5C7A', '#FFB84D', '#38E1FF', '#35F0A1'] as const;

export default function StrengthMeter({ password }: { password: string }) {
  const result = useMemo(() => (password ? zxcvbn(password) : null), [password]);
  const score = result?.score ?? 0;
  const active = password.length > 0;
  const filled = active ? Math.max(1, score) : 0; // any input lights at least segment 1
  const color = COLORS[score];
  const label = active ? LABELS[score] : '—';
  // entropy ≈ log2(guesses) = guesses_log10 / log10(2)
  const bits = result ? Math.round(result.guesses_log10 / Math.log10(2)) : 0;
  const crackDisplay = result
    ? result.crack_times_display.offline_slow_hashing_1e5_per_second
    : '';

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={active ? score : 0} aria-label="Password strength">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-kh-inset">
            <motion.div
              className="h-full w-full origin-left rounded-full"
              initial={false}
              animate={{
                scaleX: active && i < filled ? 1 : 0,
                backgroundColor: COLORS[score],
              }}
              transition={{ duration: 0.2, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-medium"
            style={{ color: active ? color : '#5C6B84' }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
        {result && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={crackDisplay}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn('truncate font-mono text-xs text-kh-faint')}
            >
              {crackDisplay} to crack · ~{Math.round(bits)} bits
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}