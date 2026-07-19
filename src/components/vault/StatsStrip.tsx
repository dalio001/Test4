/**
 * StatsStrip — 4 compact stat cards that double as list filters, plus the
 * Watchtower score teaser (mini VaultRing gauge → /security).
 * Entrance: cards stagger 70ms, rise 16px + fade; numbers count up 700ms;
 * gauge fills over 900ms. Active filter: mint left-edge bar (layoutId).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { AlertTriangle, Copy, KeyRound, ShieldAlert } from 'lucide-react';
import VaultRing from '@/components/VaultRing';
import { cn } from '@/lib/utils';
import type { StatFilter, VaultStats } from './vault-utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      raf = requestAnimationFrame(() => setN(value));
    } else {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        setN(Math.round(eased * value));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
}

function GaugeTeaser({ score }: { score: number }) {
  const [progress, setProgress] = useState(0);
  const shown = useRef(false);
  useEffect(() => {
    let raf = 0;
    if (shown.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = true;
      raf = requestAnimationFrame(() => setProgress(score / 100));
    } else {
      shown.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        const eased = 1 - Math.pow(1 - t, 4);
        setProgress((eased * score) / 100);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <Link
      to="/security"
      className="group flex h-full items-center gap-3 rounded-xl border border-kh-line bg-kh-surface px-5 py-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-kh-lineStrong"
      aria-label={`Watchtower score ${score} out of 100 — open security report`}
    >
      <VaultRing size={48} progress={progress}>
        <span className="font-mono text-[13px] font-semibold text-kh-mint">
          <CountUp value={score} duration={900} />
        </span>
      </VaultRing>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-kh-primary">Watchtower score</span>
        <span className="block text-xs text-kh-faint transition-colors group-hover:text-kh-cyan">
          Open security report →
        </span>
      </span>
    </Link>
  );
}

interface StatCardDef {
  key: StatFilter | 'total';
  label: string;
  value: number;
  icon: typeof KeyRound;
  tint: string;
  applies: StatFilter;
}

export default function StatsStrip({
  stats,
  active,
  onSelect,
}: {
  stats: VaultStats;
  active: StatFilter;
  onSelect: (f: StatFilter) => void;
}) {
  const cards: StatCardDef[] = [
    { key: 'total', label: 'Total logins', value: stats.total, icon: KeyRound, tint: '#38E1FF', applies: null },
    { key: 'weak', label: 'Weak', value: stats.weak, icon: AlertTriangle, tint: '#FF5C7A', applies: 'weak' },
    { key: 'reused', label: 'Reused', value: stats.reused, icon: Copy, tint: '#FFB84D', applies: 'reused' },
    { key: 'breached', label: 'Breach alert', value: stats.breached, icon: ShieldAlert, tint: '#FF5C7A', applies: 'breached' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-5">
      {cards.map((c, i) => {
        const isActive = c.applies !== null && active === c.applies;
        return (
          <motion.button
            key={c.key}
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
            onClick={() => onSelect(isActive ? null : c.applies)}
            aria-pressed={isActive}
            className={cn(
              'relative overflow-hidden rounded-xl border p-4 text-left shadow-card transition-all hover:-translate-y-0.5 min-[900px]:p-5',
              isActive
                ? 'border-kh-lineStrong bg-kh-elevated'
                : 'border-kh-line bg-kh-surface hover:border-kh-lineStrong',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="stat-active-bar"
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="absolute inset-y-0 left-0 w-0.5 bg-kh-mint"
              />
            )}
            <span className="flex items-center justify-between">
              <span className="font-mono text-[26px] font-medium leading-none text-kh-primary min-[900px]:text-[28px]">
                <CountUp value={c.value} />
              </span>
              <c.icon className="h-4 w-4" style={{ color: c.tint }} aria-hidden />
            </span>
            <span className="mt-2 block text-sm text-kh-muted">{c.label}</span>
          </motion.button>
        );
      })}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
        className="col-span-2 min-[900px]:col-span-1"
      >
        <GaugeTeaser score={stats.score} />
      </motion.div>
    </div>
  );
}