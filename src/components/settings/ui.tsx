/**
 * Shared building blocks for the settings surface: SectionCard (r/xl panel
 * with title + helper), Row, and small primitives used across the tabs.
 */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function SectionCard({
  id,
  title,
  helper,
  children,
  className,
  danger,
  headerAction,
}: {
  id?: string;
  title?: string;
  helper?: string;
  children: ReactNode;
  className?: string;
  danger?: boolean;
  headerAction?: ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: EASE }}
      className={cn(
        'scroll-mt-36 rounded-2xl border bg-kh-surface p-6 shadow-card md:p-7',
        danger ? 'border-kh-danger/30' : 'border-kh-line',
        className,
      )}
    >
      {(title || headerAction) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className={cn('font-display text-xl font-semibold', danger ? 'text-kh-danger' : 'text-kh-primary')}>
                {title}
              </h3>
            )}
            {helper && <p className="mt-1.5 max-w-[62ch] text-sm leading-6 text-kh-muted">{helper}</p>}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function StatusChip({
  tone,
  children,
  pulse,
}: {
  tone: 'mint' | 'faint' | 'warning' | 'danger' | 'violet';
  children: ReactNode;
  pulse?: boolean;
}) {
  const tones = {
    mint: 'border-kh-mint/40 bg-kh-mint/10 text-kh-mint',
    faint: 'border-kh-line bg-kh-elevated text-kh-faint',
    warning: 'border-kh-warning/40 bg-kh-warning/10 text-kh-warning',
    danger: 'border-kh-danger/40 bg-kh-danger/10 text-kh-danger',
    violet: 'border-kh-violet/40 bg-kh-violet/10 text-kh-violet',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        pulse && 'animate-pulse-glow',
      )}
    >
      {children}
    </span>
  );
}

/** Ghost / secondary / danger / violet buttons styled to design tokens. */
export function KhButton({
  variant = 'secondary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost' | 'violet' | 'amberGhost';
}) {
  const variants = {
    primary:
      'bg-aurora text-[#04110B] font-semibold hover:-translate-y-px hover:shadow-glow active:scale-[0.97]',
    secondary:
      'border border-kh-lineStrong bg-kh-elevated text-kh-primary hover:border-kh-mint/40 active:scale-[0.97]',
    ghost: 'text-kh-muted hover:bg-kh-elevated hover:text-kh-primary active:scale-[0.97]',
    danger:
      'border border-kh-danger/50 text-kh-danger hover:bg-kh-danger hover:text-[#04110B] active:scale-[0.97]',
    dangerGhost: 'text-kh-danger hover:bg-kh-danger/10 active:scale-[0.97]',
    violet:
      'bg-kh-violet text-[#0B0618] font-semibold hover:-translate-y-px hover:shadow-[0_0_32px_rgba(139,124,255,.35)] active:scale-[0.97]',
    amberGhost: 'text-kh-warning hover:bg-kh-warning/10 active:scale-[0.97]',
  } as const;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}
