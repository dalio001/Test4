/**
 * StrengthMeter — 4 segments, ramp colors (design.md §2/§6.4):
 * 0–1 #FF5C7A · 2 #FFB84D · 3 #38E1FF · 4 #35F0A1. Segments fill with a
 * 100ms stagger; label (Weak/Fair/Strong/Excellent) always paired with color.
 */

import { motion } from 'framer-motion';
import { STRENGTH_COLORS, STRENGTH_LABELS } from './genUtils';

export default function StrengthMeter({ score }: { score: 0 | 1 | 2 | 3 | 4 }) {
  const color = STRENGTH_COLORS[score];
  const filled = Math.max(1, score); // score 0 still shows one danger segment
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-eyebrow text-kh-faint">Strength</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {STRENGTH_LABELS[score]}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5" role="img" aria-label={`Strength: ${STRENGTH_LABELS[score]}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-kh-inset">
            <motion.div
              className="h-full w-full origin-left rounded-full"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ scaleX: i < filled ? 1 : 0, opacity: i < filled ? 1 : 0 }}
              transition={{ delay: i * 0.1, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
