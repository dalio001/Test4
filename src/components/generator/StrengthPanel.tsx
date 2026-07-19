/**
 * StrengthPanel — "Why it's strong" card (design/generator.md §2 Card B):
 * StrengthMeter (zxcvbn score), big mono entropy bits (count-up 300ms),
 * crack-time readout at 100B guesses/sec (flip on change), composition
 * mini-bars. All scoring runs locally via zxcvbn-ts.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { zxcvbn } from 'zxcvbn-ts';
import StrengthMeter from './StrengthMeter';
import type { GenMode } from './genUtils';
import { compositionOf, crackSecondsAt100B, formatCrackTime } from './genUtils';

/** ease-out count-up over `duration` ms whenever `value` changes */
function useCountUp(value: number, duration = 300): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      fromRef.current = current; // resume point if interrupted mid-animation
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

export default function StrengthPanel({
  output,
  bits,
  mode,
}: {
  output: string;
  bits: number;
  mode: GenMode;
}) {
  const score = useMemo(() => (output ? zxcvbn(output).score : 0), [output]);
  const shownBits = useCountUp(Math.round(bits));
  const crackLine = `≈ ${formatCrackTime(crackSecondsAt100B(bits))} at 100B guesses/sec`;
  const segments = useMemo(() => compositionOf(output, mode), [output, mode]);

  return (
    <div className="rounded-2xl border border-kh-line bg-kh-surface p-6 shadow-card sm:p-7">
      <h3 className="font-display text-lg font-semibold text-kh-primary">Why it&rsquo;s strong</h3>

      <div className="mt-5">
        <StrengthMeter score={score} />
      </div>

      {/* entropy count-up */}
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-eyebrow text-kh-faint">Entropy</div>
          <div className="mt-1 font-mono text-[34px] font-bold leading-none text-kh-primary">
            {Math.round(shownBits)}
            <span className="ml-2 text-base font-medium text-kh-muted">bits</span>
          </div>
        </div>
        <ShieldGlyph score={score} />
      </div>

      {/* crack time — swaps with a flip on change */}
      <div className="mt-4 overflow-hidden rounded-xl border border-kh-line bg-kh-inset px-4 py-3 [perspective:400px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={crackLine}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[13px] leading-5 text-kh-cyan"
          >
            {crackLine}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* composition mini-bars */}
      <div className="mt-6">
        <div className="text-eyebrow text-kh-faint">Composition</div>
        <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-kh-inset">
          {segments.map((s) => (
            <motion.div
              key={s.key}
              className="h-full"
              style={{ backgroundColor: s.color }}
              initial={false}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-kh-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
              <span className="font-mono text-kh-faint">{Math.round(s.pct)}%</span>
            </span>
          ))}
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-5 text-kh-faint">
        Strength scored by zxcvbn, run locally in your browser. Crack time assumes the attacker
        knows your exact recipe — aim for 80+ bits for important accounts.
      </p>
    </div>
  );
}

/** tiny decorative shield that tints with the ramp color */
function ShieldGlyph({ score }: { score: number }) {
  const colors = ['#FF5C7A', '#FF5C7A', '#FFB84D', '#38E1FF', '#35F0A1'];
  const c = colors[score] ?? colors[0];
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5 20 6v6c0 4.8-3.4 8.3-8 9.5C7.4 20.3 4 16.8 4 12V6l8-3.5Z"
        stroke={c}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.2h5.6M12 9.4v5.6"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
