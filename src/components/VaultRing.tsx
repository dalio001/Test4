/**
 * VaultRing — KeyHaven's recurring vault-door motif: concentric dashed rings
 * rotating at different speeds (outer 40s, mid 28s reverse, inner 16s).
 * Optional `progress` (0–1) fills an arc in solid mint (unlock progress,
 * security score, TOTP countdown).
 */

import { useId } from 'react';
import type { ReactNode } from 'react';

export interface VaultRingProps {
  /** px size of the square SVG (default 160) */
  size?: number;
  className?: string;
  /** 0–1 → mint progress arc; omit for a purely decorative ring */
  progress?: number;
  /** render centered inside the ring */
  children?: ReactNode;
  /** dim the whole ring (e.g. backdrop usage) */
  muted?: boolean;
}

export default function VaultRing({ size = 160, className, progress, children, muted }: VaultRingProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const opacity = muted ? 0.35 : 1;
  const progressR = 88;
  const circumference = 2 * Math.PI * progressR;
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ opacity }}>
        <defs>
          <linearGradient id={`vr-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#35F0A1" />
            <stop offset="55%" stopColor="#38E1FF" />
            <stop offset="100%" stopColor="#8B7CFF" />
          </linearGradient>
        </defs>
        <g className="animate-spin-40" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="94" fill="none" stroke={`url(#vr-grad-${id})`} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 9" />
        </g>
        <g className="animate-spin-28r" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="76" fill="none" stroke="#38E1FF" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="14 10" />
        </g>
        <g className="animate-spin-16" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="58" fill="none" stroke="#35F0A1" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 7" />
        </g>
        {typeof progress === 'number' && (
          <circle
            cx="100"
            cy="100"
            r={progressR}
            fill="none"
            stroke="#35F0A1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 300ms cubic-bezier(.16,1,.3,1)' }}
          />
        )}
      </svg>
      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
