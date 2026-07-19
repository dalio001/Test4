/**
 * StrengthMeter — 4-segment password strength gauge (design.md §6.4).
 * Ramp colors, label + entropy bits in mono, optional crack-time caption.
 */

import { STRENGTH_COLORS, STRENGTH_LABELS, strengthOf } from './vault-utils';
import { cn } from '@/lib/utils';

export default function StrengthMeter({
  password,
  showBits = true,
  showCrackTime = false,
  className,
}: {
  password: string;
  showBits?: boolean;
  showCrackTime?: boolean;
  className?: string;
}) {
  const info = strengthOf(password);
  const color = STRENGTH_COLORS[info.score];
  return (
    <div className={cn('select-none', className)} aria-label={`Password strength: ${STRENGTH_LABELS[info.score]}`}>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => {
          const lit = password.length > 0 && i < Math.max(info.score, 1);
          return (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ backgroundColor: lit ? color : 'rgba(148,178,255,.12)' }}
            />
          );
        })}
      </div>
      {password.length > 0 && (
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium" style={{ color }}>
            {STRENGTH_LABELS[info.score]}
          </span>
          {showBits && <span className="font-mono text-[11px] text-kh-faint">{info.bits} bits</span>}
        </div>
      )}
      {showCrackTime && password.length > 0 && (
        <p className="mt-0.5 font-mono text-[11px] text-kh-faint">crack time: {info.crackTime}</p>
      )}
    </div>
  );
}