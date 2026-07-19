/**
 * MaskedSecret — masked password with inline eye toggle. Reveal swaps bullets
 * to characters with a 12ms/char mini-scramble, brightens mono color, then
 * auto-remasks after `remaskSeconds` (default 15, from vault settings).
 * Honors prefers-reduced-motion with an instant swap.
 */

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const GLYPHS = '!<>-_\\/[]{}=+*^?#░▒█01';
const BULLET = '•';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function MaskedSecret({
  secret,
  remaskSeconds = 15,
  showToggle = true,
  maskLength,
  className,
  iconClassName,
}: {
  secret: string;
  remaskSeconds?: number;
  showToggle?: boolean;
  /** fixed bullet count when masked (defaults to secret length, min 8) */
  maskLength?: number;
  className?: string;
  iconClassName?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [display, setDisplay] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const masked = BULLET.repeat(maskLength ?? Math.max(8, Math.min(secret.length, 14)));

  // never keep a stale secret visible if the entry changes underneath us
  const [lastSecret, setLastSecret] = useState(secret);
  if (secret !== lastSecret) {
    setLastSecret(secret);
    if (revealed) setRevealed(false);
  }

  useEffect(() => {
    if (!revealed) return;
    let raf = 0;
    if (reducedMotion()) {
      raf = requestAnimationFrame(() => setDisplay(secret));
    } else {
      const start = performance.now();
      const tick = (now: number) => {
        let out = '';
        let done = true;
        for (let i = 0; i < secret.length; i++) {
          if (now >= start + (i + 1) * 12) out += secret[i];
          else {
            out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            done = false;
          }
        }
        setDisplay(out);
        if (!done) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    timerRef.current = setTimeout(() => setRevealed(false), remaskSeconds * 1000);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [revealed, secret, remaskSeconds]);

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span
        aria-label={revealed ? 'Password revealed' : 'Password hidden'}
        className={cn(
          'truncate font-mono text-[13px] tracking-[0.12em] transition-colors duration-200',
          revealed ? 'text-kh-primary' : 'text-kh-faint',
        )}
      >
        {revealed ? display : masked}
      </span>
      {showToggle && (
        <button
          type="button"
          aria-label={revealed ? 'Hide password' : 'Reveal password'}
          onClick={(e) => {
            e.stopPropagation();
            setRevealed((r) => !r);
          }}
          className={cn(
            'shrink-0 rounded-md p-1 text-kh-faint transition-colors hover:bg-kh-elevated hover:text-kh-primary',
            iconClassName,
          )}
        >
          <span className="relative block h-3.5 w-3.5">
            <Eye
              className={cn(
                'absolute inset-0 h-3.5 w-3.5 transition-opacity duration-150',
                revealed ? 'opacity-0' : 'opacity-100',
              )}
            />
            <EyeOff
              className={cn(
                'absolute inset-0 h-3.5 w-3.5 transition-opacity duration-150',
                revealed ? 'opacity-100' : 'opacity-0',
              )}
            />
          </span>
        </button>
      )}
    </span>
  );
}