/**
 * ScoreGauge — the Watchtower hero gauge. A VaultRing variant: decorative
 * concentric dashed rings spinning at 40s / 28s (reverse) / 16s, plus a
 * 12px aurora-gradient arc that scrubs 0→score over 1.4s expo with a synced
 * mono count-up. The band label ("GOOD", …) scrambles in at arc completion.
 * When the score later improves (a fix lands), the arc re-animates and a
 * "+N" chip floats up. Honors prefers-reduced-motion (final state instantly).
 */

import { useEffect, useId, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import ScrambleText from '@/components/ScrambleText';
import { BAND_COLOR, BAND_LABEL, scoreBand } from './analysis';

const R = 88;
const CIRCUMFERENCE = 2 * Math.PI * R;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ScoreGauge({ score, size = 280 }: { score: number; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => String(Math.round(v)));
  const dashoffset = useTransform(mv, (v) => CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, v)) / 100));
  const firstRun = useRef(true);
  const prevScore = useRef(score);
  const [delta, setDelta] = useState<number | null>(null);
  const [arcDone, setArcDone] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const duration = reduced ? 0 : firstRun.current ? 1.4 : 0.9;
    firstRun.current = false;

    if (score > prevScore.current) setDelta(score - prevScore.current);
    prevScore.current = score;

    const controls = animate(mv, score, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => setArcDone(true),
    });
    if (reduced) setArcDone(true);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // auto-dismiss the "+N" float
  useEffect(() => {
    if (delta === null) return;
    const t = setTimeout(() => setDelta(null), 1800);
    return () => clearTimeout(t);
  }, [delta]);

  const band = scoreBand(score);
  const color = BAND_COLOR[band];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`Security score ${score} out of 100`}>
        <defs>
          <linearGradient id={`wt-gauge-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#35F0A1" />
            <stop offset="48%" stopColor="#38E1FF" />
            <stop offset="100%" stopColor="#8B7CFF" />
          </linearGradient>
        </defs>
        {/* decorative rotating dashed rings */}
        <g className="animate-spin-40" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="96" fill="none" stroke={`url(#wt-gauge-${id})`} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 9" />
        </g>
        <g className="animate-spin-28r" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="70" fill="none" stroke="#38E1FF" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="14 10" />
        </g>
        <g className="animate-spin-16" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="56" fill="none" stroke="#35F0A1" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 7" />
        </g>
        {/* track */}
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(148,178,255,.08)" strokeWidth="12" />
        {/* score arc */}
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={`url(#wt-gauge-${id})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          transform="rotate(-90 100 100)"
          style={{ strokeDashoffset: dashoffset, filter: 'drop-shadow(0 0 10px rgba(53,240,161,.35))' }}
        />
      </svg>

      {/* center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          <motion.span
            className="font-mono font-medium leading-none text-kh-primary"
            style={{ fontSize: size * 0.257 }}
          >
            {rounded}
          </motion.span>
          <AnimatePresence>
            {delta !== null && (
              <motion.span
                key={`delta-${score}`}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -18, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -right-4 top-0 rounded-full bg-kh-mint/15 px-2 py-0.5 font-mono text-sm font-medium text-kh-mint"
              >
                +{delta}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span
          className="mt-2 font-mono text-sm font-bold tracking-[0.22em]"
          style={{ color }}
        >
          {arcDone ? (
            <ScrambleText key={BAND_LABEL[band]} text={BAND_LABEL[band]} trigger="mount" speed={45} />
          ) : (
            <span className="opacity-0">{BAND_LABEL[band]}</span>
          )}
        </span>
        <span className="mt-1 text-[13px] text-kh-faint">Security score</span>
      </div>
    </div>
  );
}
