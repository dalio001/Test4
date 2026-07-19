/**
 * ScrambleOutput — the generator's output stage. On every new value each
 * character cycles 3–6 random glyphs (8ms stagger, ≤450ms total) before
 * settling left→right — "encryption made visible" (design/generator.md §1).
 * Settled characters are colored per class: symbols cyan, digits violet,
 * letters primary (passphrase separators mint). Reduced motion: instant swap.
 */

import { useEffect, useState } from 'react';
import type { GenMode } from './genUtils';
import { charColorClass } from './genUtils';

const GLYPHS = '!<>-_\\/[]{}=+*^?#░▒█01';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Frame {
  chars: string[];
  settled: boolean[];
}

export default function ScrambleOutput({
  text,
  runId,
  mode,
}: {
  text: string;
  /** increments per generation — retriggers the scramble even if text repeats */
  runId: number;
  mode: GenMode;
}) {
  const [frame, setFrame] = useState<Frame>({ chars: [], settled: [] });

  useEffect(() => {
    const target = text.split('');
    if (reducedMotion()) {
      const raf = requestAnimationFrame(() =>
        setFrame({ chars: target, settled: target.map(() => true) }),
      );
      return () => cancelAnimationFrame(raf);
    }

    const t0 = performance.now();
    // 3–6 glyph cycles per char (~26ms each), 8ms stagger, capped at 440ms
    const settleAt = target.map((_, i) =>
      Math.min(t0 + i * 8 + (3 + Math.random() * 3) * 26, t0 + 440),
    );

    let raf = 0;
    const tick = (now: number) => {
      let done = true;
      const chars: string[] = [];
      const settled: boolean[] = [];
      for (let i = 0; i < target.length; i++) {
        if (now >= settleAt[i]) {
          chars[i] = target[i];
          settled[i] = true;
        } else {
          chars[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          settled[i] = false;
          done = false;
        }
      }
      setFrame({ chars, settled });
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, runId]);

  return (
    <div
      aria-label={`Generated ${mode}: ${text}`}
      className="flex min-h-[76px] select-text flex-wrap items-center justify-center break-all px-2 py-4 font-mono text-[clamp(20px,3vw,30px)] leading-[1.5]"
    >
      {frame.chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={frame.settled[i] ? charColorClass(text[i] ?? ch, mode) : 'text-kh-faint'}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </div>
  );
}
