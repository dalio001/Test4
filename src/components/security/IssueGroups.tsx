/**
 * IssueGroups — Watchtower §2. Stacked accordions for the four checks:
 * weak (danger) · reused (warning) · old (warning) · breached (danger).
 * The highest-priority non-empty group (weak → breached → reused → old)
 * starts open. Rows carry issue evidence, a masked password, an aurora
 * "Fix now" action (150ms lock-spin → /vault?edit=<id>) and an overflow
 * menu to ignore/include the check (ignored rows are excluded from the
 * score and rendered faint with a chip). Fixed rows exit with a mint
 * flash + collapse via AnimatePresence.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import LetterAvatar from '@/components/LetterAvatar';
import type { CheckType, EntryAudit, VaultAudit } from './analysis';
import { FIRST_FIX_ID, GROUP_IDS, ignoreKey, STRENGTH_COLORS } from './analysis';
import { cn } from '@/lib/utils';

const QUINT = [0.83, 0, 0.17, 1] as [number, number, number, number];
const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

const META: Record<
  CheckType,
  { title: string; icon: typeof AlertTriangle; color: string; explainer: string }
> = {
  weak: {
    title: 'Weak passwords',
    icon: AlertTriangle,
    color: '#FF5C7A',
    explainer: 'Easy to guess or crack. Replace them with generated ones — you never need to remember them.',
  },
  reused: {
    title: 'Reused passwords',
    icon: Copy,
    color: '#FFB84D',
    explainer: "One leak shouldn't open two doors. Give each account its own password.",
  },
  old: {
    title: 'Over a year old',
    icon: Clock,
    color: '#FFB84D',
    explainer: "Old isn't always bad — but fresh passwords shrink the window a leak stays useful.",
  },
  breached: {
    title: 'Found in known breaches',
    icon: ShieldAlert,
    color: '#FF5C7A',
    explainer:
      'These passwords appear in a public breach corpus (offline hash-list check). Change them anywhere they are used.',
  },
};

/* ---------------------------------- bits ---------------------------------- */

function StrengthBar({ strength }: { strength: number }) {
  const filled = strength === 0 ? 1 : strength;
  const color = STRENGTH_COLORS[strength];
  return (
    <span className="flex items-center gap-1" aria-label={`Strength ${strength} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-1 w-6 rounded-full"
          style={{ backgroundColor: i < filled ? color : 'rgba(148,178,255,.12)' }}
        />
      ))}
    </span>
  );
}

function FixButton({ entryId, first }: { entryId: string; first?: boolean }) {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);

  const go = () => {
    if (spinning) return;
    setSpinning(true);
    setTimeout(() => navigate(`/vault?edit=${entryId}`), 150);
  };

  return (
    <button
      id={first ? FIRST_FIX_ID : undefined}
      onClick={go}
      className="bg-aurora flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#04110B] transition-all duration-200 hover:-translate-y-px hover:shadow-glow active:scale-[0.97]"
    >
      {spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
      Fix now
    </button>
  );
}

function RowMenu({
  ignoredRow,
  onToggleIgnore,
}: {
  ignoredRow: boolean;
  onToggleIgnore: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-kh-faint transition-colors hover:bg-kh-elevated hover:text-kh-primary"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-xl border border-kh-line bg-kh-elevated shadow-drawer"
            >
              <button
                onClick={() => {
                  setOpen(false);
                  onToggleIgnore();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-kh-muted transition-colors hover:bg-kh-surface hover:text-kh-primary"
              >
                {ignoredRow ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {ignoredRow ? 'Include in score again' : 'Ignore this check'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------- row ----------------------------------- */

function IssueRow({
  audit,
  check,
  ignoredRow,
  onToggleIgnore,
  firstFix,
}: {
  audit: EntryAudit;
  check: CheckType;
  ignoredRow: boolean;
  onToggleIgnore: () => void;
  firstFix?: boolean;
}) {
  const { entry } = audit;
  const meta = META[check];
  return (
    <motion.li
      layout="position"
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } },
      }}
      exit={{
        opacity: [1, 1, 0],
        y: -14,
        backgroundColor: ['rgba(53,240,161,0)', 'rgba(53,240,161,.16)', 'rgba(53,240,161,0)'],
        transition: { duration: 0.4, ease: EXPO },
      }}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-kh-line bg-kh-base/50 px-4 py-3 transition-colors hover:border-kh-lineStrong sm:flex-nowrap sm:gap-4',
        ignoredRow && 'opacity-55',
      )}
    >
      <LetterAvatar name={entry.title} size={38} />
      <span className="min-w-0 flex-1 basis-40">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-kh-primary">{entry.title}</span>
          {ignoredRow && (
            <span
              className="rounded-full border border-kh-line px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-kh-faint"
              title="Ignored — excluded from your security score"
            >
              ignored
            </span>
          )}
        </span>
        <span className="block truncate text-[12px] text-kh-faint">{entry.username}</span>
      </span>

      {/* evidence */}
      <span className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        {check === 'weak' && (
          <>
            <StrengthBar strength={audit.strength} />
            <span className="font-mono text-[11px] text-kh-faint">crack time: {audit.crackTime}</span>
          </>
        )}
        {check === 'reused' && (
          <span className="font-mono text-[11px] text-kh-faint">shared with {audit.reuseGroup !== null ? 'this cluster' : 'others'}</span>
        )}
        {check === 'old' && (
          <span className="flex items-center gap-1.5 text-[12px] text-kh-warning">
            <Clock className="h-3.5 w-3.5" />
            Last changed {audit.ageMonths} {audit.ageMonths === 1 ? 'month' : 'months'} ago
          </span>
        )}
        {check === 'breached' && (
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{ color: meta.color, backgroundColor: `${meta.color}14`, border: `1px solid ${meta.color}40` }}
          >
            <ShieldAlert className="h-3 w-3" />
            In breach corpus
          </span>
        )}
        <span className="font-mono text-[13px] tracking-[0.12em] text-kh-faint" aria-label="Password (masked)">
          ••••••••
        </span>
      </span>

      <FixButton entryId={entry.id} first={firstFix} />
      <RowMenu ignoredRow={ignoredRow} onToggleIgnore={onToggleIgnore} />
    </motion.li>
  );
}

/* --------------------------------- groups --------------------------------- */

interface GroupModel {
  check: CheckType;
  rows: EntryAudit[];
  activeCount: number;
}

export default function IssueGroups({
  audit,
  ignored,
  onToggleIgnore,
  highlighted,
}: {
  audit: VaultAudit;
  ignored: Set<string>;
  onToggleIgnore: (entryId: string, check: CheckType) => void;
  highlighted: CheckType | null;
}) {
  const groups: GroupModel[] = (
    [
      { check: 'weak' as CheckType, rows: audit.weak },
      { check: 'breached' as CheckType, rows: audit.breached },
      { check: 'reused' as CheckType, rows: audit.reused },
      { check: 'old' as CheckType, rows: audit.old },
    ] as { check: CheckType; rows: EntryAudit[] }[]
  )
    .filter((g) => g.rows.length > 0)
    .map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => {
        const ai = ignored.has(ignoreKey(a.entry.id, g.check)) ? 1 : 0;
        const bi = ignored.has(ignoreKey(b.entry.id, g.check)) ? 1 : 0;
        if (ai !== bi) return ai - bi;
        return a.strength - b.strength;
      }),
      activeCount: g.rows.filter((r) => !ignored.has(ignoreKey(r.entry.id, g.check))).length,
    }));

  const [open, setOpen] = useState<CheckType | null>(null);
  // default open: highest-priority non-empty group
  useEffect(() => {
    setOpen((cur) => cur ?? (groups.length > 0 ? groups[0].check : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length > 0 ? groups[0].check : 'none']);

  // re-open a group when a chip requests it (highlight → scroll target)
  useEffect(() => {
    if (highlighted) setOpen(highlighted);
  }, [highlighted]);

  if (groups.length === 0) {
    return (
      <section aria-label="Audit results" id="wt-groups">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EXPO }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-kh-mint/25 bg-kh-mint/[0.04] px-6 py-12 text-center"
        >
          <ShieldCheck className="h-8 w-8 text-kh-mint" />
          <h3 className="font-display text-xl font-semibold text-kh-primary">All clear</h3>
          <p className="max-w-[46ch] text-sm leading-6 text-kh-muted">
            {audit.total === 0
              ? 'No logins to audit yet. Add your first login and Watchtower will grade it here.'
              : 'Every login passed all four checks — strength, reuse, age and breach exposure.'}
          </p>
        </motion.div>
      </section>
    );
  }

  return (
    <section aria-label="Audit results" className="space-y-4">
      {groups.map((group, gi) => {
        const meta = META[group.check];
        const isOpen = open === group.check;
        const isHighlighted = highlighted === group.check;
        const firstActiveId = group.rows.find(
          (r) => !ignored.has(ignoreKey(r.entry.id, group.check)),
        )?.entry.id;

        // reused rows render inside their cluster wrapper (linked + badge)
        const reusedRows =
          group.check === 'reused'
            ? audit.reuseGroups.map((cluster) =>
                cluster.filter((r) => group.rows.some((gr) => gr.entry.id === r.entry.id)),
              )
            : [];

        return (
          <motion.div
            key={group.check}
            id={GROUP_IDS[group.check]}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.55, delay: gi * 0.1, ease: EXPO }}
            className="relative scroll-mt-36 overflow-hidden rounded-2xl border border-kh-line bg-kh-surface transition-colors"
          >
            {/* chip-hover highlight ring (scroll-spy style outline pulse) */}
            <AnimatePresence>
              {isHighlighted && (
                <motion.div
                  key="hl"
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
                  style={{ boxShadow: `0 0 0 2px ${meta.color}, 0 0 32px ${meta.color}30` }}
                />
              )}
            </AnimatePresence>
            {/* header */}
            <button
              onClick={() => setOpen(isOpen ? null : group.check)}
              className="flex h-16 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-kh-elevated/60 sm:px-5"
              aria-expanded={isOpen}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${meta.color}14`, border: `1px solid ${meta.color}35` }}
              >
                <meta.icon style={{ color: meta.color, width: 18, height: 18 }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2.5">
                  <span className="truncate text-[15px] font-semibold text-kh-primary">{meta.title}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
                    style={{ color: meta.color, backgroundColor: `${meta.color}18` }}
                  >
                    {group.activeCount}
                  </span>
                </span>
                <span className="block text-[12px] text-kh-faint">
                  affects {group.activeCount} {group.activeCount === 1 ? 'account' : 'accounts'}
                  {group.activeCount !== group.rows.length &&
                    ` · ${group.rows.length - group.activeCount} ignored`}
                </span>
              </span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-kh-faint transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </button>

            {/* body */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: QUINT }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-kh-line px-4 py-4 sm:px-5">
                    <p className="mb-4 max-w-[64ch] text-sm leading-[22px] text-kh-muted">{meta.explainer}</p>

                    {group.check === 'reused' ? (
                      <div className="space-y-5">
                        {reusedRows.map((cluster, ci) => (
                          <div key={ci} className="relative pl-5">
                            {/* linking line + shared badge */}
                            <span
                              aria-hidden
                              className="absolute left-[7px] top-4 bottom-4 w-px"
                              style={{ background: `linear-gradient(${meta.color}70, ${meta.color}20)` }}
                            />
                            <span
                              className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                              style={{
                                color: meta.color,
                                backgroundColor: `${meta.color}12`,
                                border: `1px solid ${meta.color}35`,
                              }}
                            >
                              <Copy className="h-3 w-3" />
                              same password · {cluster.length} accounts
                            </span>
                            <motion.ul
                              initial="hidden"
                              animate="show"
                              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                              className="space-y-2"
                            >
                              <AnimatePresence initial={false}>
                                {cluster.map((row) => (
                                  <IssueRow
                                    key={row.entry.id}
                                    audit={row}
                                    check={group.check}
                                    ignoredRow={ignored.has(ignoreKey(row.entry.id, group.check))}
                                    onToggleIgnore={() => onToggleIgnore(row.entry.id, group.check)}
                                  />
                                ))}
                              </AnimatePresence>
                            </motion.ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <motion.ul
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                        className="space-y-2"
                      >
                        <AnimatePresence initial={false}>
                          {group.rows.map((row) => (
                            <IssueRow
                              key={row.entry.id}
                              audit={row}
                              check={group.check}
                              ignoredRow={ignored.has(ignoreKey(row.entry.id, group.check))}
                              onToggleIgnore={() => onToggleIgnore(row.entry.id, group.check)}
                              firstFix={group.check === 'weak' && row.entry.id === firstActiveId}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </section>
  );
}
