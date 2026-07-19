/**
 * Home §5 — Numbers strip. Four stat blocks; numbers count up (mono, 1.2s,
 * expo) at 30% visibility. The `0` playfully counts 12→0 in reverse.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function CountUp({
  from,
  to,
  format,
  active,
}: {
  from: number;
  to: number;
  format: (n: number) => string;
  active: boolean;
}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // expo out
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to]);
  return <>{format(value)}</>;
}

const STATS: { from: number; to: number; format: (n: number) => string; label: string; mint?: boolean }[] = [
  { from: 0, to: 256, format: (n) => `${n}-bit`, label: 'AES encryption keys' },
  { from: 0, to: 600_000, format: (n) => `${n.toLocaleString()}+`, label: 'key-derivation iterations (PBKDF2)' },
  { from: 12, to: 0, format: (n) => `${n}`, label: 'people who can read your vault. Including us.', mint: true },
  { from: 0, to: 100, format: (n) => `${n}%`, label: 'local. No account. No server. No sync risk.' },
];

export default function NumbersStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30% 0px' });

  return (
    <section className="border-y border-kh-line bg-kh-surface/40">
      <div ref={ref} className="mx-auto grid max-w-marketing grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: EASE }}
            className={`border-kh-line px-8 py-12 ${i % 2 === 1 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}
          >
            <p className={`font-mono text-4xl font-medium md:text-5xl ${stat.mint ? 'text-kh-mint' : 'text-kh-primary'}`}>
              <CountUp from={stat.from} to={stat.to} format={stat.format} active={inView} />
            </p>
            <p className="mt-3 text-sm leading-6 text-kh-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
