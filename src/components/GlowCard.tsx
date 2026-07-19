/**
 * GlowCard — bento/feature card with the standard KeyHaven hover:
 * translateY(−4px), strong border, and an inner radial glow that follows
 * the cursor via CSS vars --mx/--my (design.md §5/§6).
 */

import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GlowCard({
  children,
  className,
  glow = 'rgba(56,225,255,.10)',
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
}) {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <motion.div
      onMouseMove={onMouseMove}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-kh-line bg-kh-surface shadow-card transition-colors duration-300 hover:border-kh-lineStrong',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), ${glow}, transparent 65%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}
