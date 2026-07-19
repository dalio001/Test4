/**
 * LiveScramble — like ScrambleText, but re-runs whenever `text` changes
 * (cycling generator output, ciphertext demos). Honors reduced motion.
 */

import { useEffect, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}=+*^?#░▒█01abcdef0123456789';

export default function LiveScramble({
  text,
  className,
  speed = 28,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      let s = '';
      let done = true;
      for (let i = 0; i < text.length; i++) {
        if (now >= start + (i + 1) * speed) {
          s += text[i];
        } else {
          s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          done = false;
        }
      }
      setOut(s);
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, speed]);

  return <span className={className}>{out}</span>;
}
