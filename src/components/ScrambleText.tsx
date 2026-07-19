/**
 * ScrambleText — KeyHaven's signature "encryption made visible" effect.
 * Characters cycle through a glyph pool (`!<>-_\/[]{}=+*^?#░▒█01`) before
 * settling left→right (~35ms/char). Words scramble as parallel batches.
 * Honors prefers-reduced-motion by rendering instantly.
 */

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const GLYPHS = '!<>-_\\/[]{}=+*^?#░▒█01';

export interface ScrambleTextProps {
  /** final text (max ~20 chars per word batch for best effect) */
  text: string;
  className?: string;
  /** ms per character settle (default 35) */
  speed?: number;
  /** ms before the run starts (default 0) */
  delay?: number;
  /** 'mount' starts after mount; 'inView' starts when ~visible (default 'inView') */
  trigger?: 'mount' | 'inView';
  /** extra ms stagger between words (default 90) */
  wordStagger?: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ScrambleText({
  text,
  className,
  speed = 35,
  delay = 0,
  trigger = 'inView',
  wordStagger = 90,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [output, setOutput] = useState<string>(() => (trigger === 'mount' ? '' : text));
  const startedRef = useRef(false);

  const active = trigger === 'mount' ? true : inView;

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    if (prefersReducedMotion()) {
      setOutput(text);
      return;
    }

    // Build per-char settle timestamps (word batches run in parallel)
    const words = text.split(' ');
    const settleAt: number[] = [];
    let charIndex = 0;
    const t0 = performance.now() + delay;
    words.forEach((word, wi) => {
      const wordStart = t0 + wi * wordStagger;
      for (let i = 0; i < word.length; i++) {
        settleAt[charIndex] = wordStart + (i + 1) * speed;
        charIndex++;
      }
      charIndex++; // the space
      settleAt[charIndex - 1] = wordStart; // space appears with its word
    });

    const totalDuration = Math.max(...settleAt) - t0 + 120;
    let raf = 0;
    const tick = (now: number) => {
      let out = '';
      let done = true;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ') {
          out += ' ';
          continue;
        }
        if (now >= settleAt[i]) {
          out += ch;
        } else if (now >= t0) {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          done = false;
        } else {
          done = false;
        }
      }
      setOutput(out);
      if (!done && now - t0 < totalDuration + 400) {
        raf = requestAnimationFrame(tick);
      } else {
        setOutput(text);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, text, speed, delay]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {output}
    </span>
  );
}
