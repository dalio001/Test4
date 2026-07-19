/**
 * HistoryList — "This session" (design/generator.md §3). Up to 5 rows,
 * newest first; each forged value inserts at top (slide 24px + fade, others
 * FLIP-shift via layout), overflow rows collapse out. Rows: per-char colored
 * mono secret with per-row mask toggle, mode chip, entropy chip, hover
 * actions (Copy · Save to vault). Memory only — cleared on leave.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, Check, Copy, Dices, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenMode, HistoryItem } from './genUtils';
import { MODE_LABELS, charColorClass } from './genUtils';

const MODE_CHIP: Record<GenMode, string> = {
  password: 'border-kh-cyan/30 bg-kh-cyan/10 text-kh-cyan',
  passphrase: 'border-kh-mint/30 bg-kh-mint/10 text-kh-mint',
  pin: 'border-kh-violet/30 bg-kh-violet/10 text-kh-violet',
};

function Row({
  item,
  index,
  onCopy,
  onSave,
}: {
  item: HistoryItem;
  index: number;
  onCopy: (item: HistoryItem) => void;
  onSave: (item: HistoryItem) => void;
}) {
  const [masked, setMasked] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    onCopy(item);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { delay: index * 0.04, duration: 0.2 } }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group overflow-hidden"
    >
      <div className="flex items-center gap-3 rounded-xl border border-kh-line bg-kh-surface px-4 py-3 transition-colors hover:border-kh-lineStrong">
        {/* secret */}
        <div className="min-w-0 flex-1 break-all font-mono text-[13px] leading-6" aria-label={masked ? 'Masked secret' : item.value}>
          {masked ? (
            <span aria-hidden className="tracking-[0.1em] text-kh-faint">
              {'•'.repeat(Math.min(item.value.length, 32))}
            </span>
          ) : (
            item.value.split('').map((ch, i) => (
              <span key={i} aria-hidden className={charColorClass(ch, item.mode)}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))
          )}
        </div>

        {/* chips */}
        <span className={cn('hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline', MODE_CHIP[item.mode])}>
          {MODE_LABELS[item.mode]}
        </span>
        <span className="hidden shrink-0 rounded-full border border-kh-line bg-kh-inset px-2 py-0.5 font-mono text-[11px] text-kh-muted md:inline">
          {Math.round(item.bits)} bits
        </span>

        {/* mask toggle */}
        <button
          type="button"
          onClick={() => setMasked((m) => !m)}
          aria-label={masked ? `Reveal ${MODE_LABELS[item.mode]} from history` : `Mask ${MODE_LABELS[item.mode]} from history`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-kh-faint transition-colors hover:bg-kh-elevated hover:text-kh-primary"
        >
          {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* hover actions (30ms stagger) */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={copy}
            aria-label="Copy from history"
            style={{ transitionDelay: '30ms' }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-kh-muted transition-all hover:bg-kh-elevated hover:text-kh-mint active:scale-95"
          >
            {copied ? <Check className="h-4 w-4 text-kh-mint" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onSave(item)}
            aria-label="Save to vault"
            style={{ transitionDelay: '60ms' }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-kh-muted transition-all hover:bg-kh-elevated hover:text-kh-mint active:scale-95"
          >
            <BookmarkPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}

export default function HistoryList({
  items,
  onCopy,
  onSave,
  onClear,
}: {
  items: HistoryItem[];
  onCopy: (item: HistoryItem) => void;
  onSave: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Session history">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-lg font-semibold text-kh-primary">
          This session
          {items.length > 0 && (
            <span className="ml-2 rounded-full border border-kh-line bg-kh-inset px-2 py-0.5 font-mono text-[11px] font-normal text-kh-faint">
              {items.length}
            </span>
          )}
        </h4>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-kh-muted transition-colors hover:bg-kh-elevated hover:text-kh-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-kh-lineStrong px-6 py-8 text-center">
          <Dices className="h-5 w-5 text-kh-faint" />
          <p className="text-sm text-kh-faint">
            Nothing forged yet this session — press{' '}
            <kbd className="rounded-md border border-kh-line bg-kh-inset px-1.5 py-0.5 font-mono text-[11px] text-kh-muted">
              Space
            </kbd>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <Row key={item.id} item={item} index={i} onCopy={onCopy} onSave={onSave} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <p className="mt-3 text-xs text-kh-faint">Kept only in memory — gone when you leave.</p>
    </section>
  );
}
