/**
 * EntryList — the login card list (list rows + grid cards). Row anatomy per
 * vault.md §3: letter avatar · title/username · masked password + eye ·
 * category chip · strength dot · age · hover action cluster (copy username,
 * copy password, star, ⋮ menu). Right-click mirrors actions via context menu.
 * Entrance stagger 40ms (max 8 concurrent), FLIP reorder on sort, delete
 * collapses height + fades.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  KeyRound,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import type { VaultEntry } from '@/lib/vault';
import LetterAvatar from '@/components/LetterAvatar';
import ScrambleText from '@/components/ScrambleText';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVault } from '@/providers/VaultProvider';
import { cn } from '@/lib/utils';
import MaskedSecret from './MaskedSecret';
import {
  CATEGORY_META,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
  isOld,
  oldMonthsLabel,
  timeAgo,
} from './vault-utils';
import type { StrengthMap } from './vault-utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export interface EntryListProps {
  entries: VaultEntry[];
  view: 'list' | 'grid';
  strength: StrengthMap;
  reused: Set<string>;
  /** id of a freshly-saved entry — its title scramble-materializes once */
  newId?: string | null;
  onOpen: (e: VaultEntry) => void;
  onEdit: (e: VaultEntry) => void;
  onDelete: (e: VaultEntry) => void;
  onDuplicate: (e: VaultEntry) => void;
}

function EntryTitle({ entry, scramble }: { entry: VaultEntry; scramble: boolean }) {
  if (scramble) {
    return (
      <ScrambleText
        text={entry.title}
        trigger="mount"
        speed={25}
        className="truncate text-[15px] font-semibold text-kh-primary"
      />
    );
  }
  return <span className="truncate text-[15px] font-semibold text-kh-primary">{entry.title}</span>;
}

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

function CategoryChip({ category }: { category: VaultEntry['category'] }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color, border: `1px solid ${meta.color}33` }}
    >
      {meta.label}
    </span>
  );
}

function FlagTags({ entry, reused }: { entry: VaultEntry; reused: boolean }) {
  return (
    <>
      {entry.totp && (
        <span className="shrink-0 rounded-full border border-kh-cyan/30 bg-kh-cyan/10 px-1.5 py-px font-mono text-[10px] font-medium text-kh-cyan">
          2FA
        </span>
      )}
      {reused && (
        <span className="shrink-0 rounded-full border border-kh-warning/30 bg-kh-warning/10 px-1.5 py-px text-[10px] font-medium text-kh-warning">
          Reused
        </span>
      )}
      {entry.breached && (
        <span className="shrink-0 rounded-full border border-kh-danger/30 bg-kh-danger/10 px-1.5 py-px text-[10px] font-medium text-kh-danger">
          Breach
        </span>
      )}
      {isOld(entry) && (
        <span className="shrink-0 rounded-full border border-kh-warning/30 bg-kh-warning/10 px-1.5 py-px text-[10px] font-medium text-kh-warning">
          {oldMonthsLabel(entry)}
        </span>
      )}
    </>
  );
}

function StrengthDot({ entry, strength }: { entry: VaultEntry; strength: StrengthMap }) {
  const info = strength.get(entry.id);
  if (!info) return null;
  const color = STRENGTH_COLORS[info.score];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={`Password strength ${STRENGTH_LABELS[info.score]}`}
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="border-kh-lineStrong bg-kh-elevated font-mono text-xs">
        {STRENGTH_LABELS[info.score]} · {info.bits} bits
      </TooltipContent>
    </Tooltip>
  );
}

function CopyButton({
  field,
  text,
  label,
  copiedField,
  onCopy,
  primary = false,
}: {
  field: string;
  text: string;
  label: string;
  copiedField: string | null;
  onCopy: (field: string, text: string, label: string) => void;
  primary?: boolean;
}) {
  const copied = copiedField === field;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onCopy(field, text, label);
      }}
      className={cn(
        'rounded-lg p-2 transition-all hover:-translate-y-px',
        primary
          ? 'bg-aurora text-[#04110B] shadow-glow hover:brightness-110'
          : 'border border-kh-line bg-kh-inset text-kh-muted hover:border-kh-lineStrong hover:text-kh-primary',
      )}
    >
      <span className="relative block h-3.5 w-3.5">
        <Copy
          className={cn(
            'absolute inset-0 h-3.5 w-3.5 transition-all duration-150',
            copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Check
          className={cn(
            'absolute inset-0 h-3.5 w-3.5 transition-all duration-150',
            copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* shared per-entry action wiring                                      */
/* ------------------------------------------------------------------ */

function useEntryActions(props: EntryListProps) {
  const { copyWithAutoClear, toggleFavorite, settings } = useVault();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    (field: string, text: string, label: string) => {
      void copyWithAutoClear(text, label);
      setCopiedField(field);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedField(null), 1200);
    },
    [copyWithAutoClear],
  );
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const glowMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return { copy, copiedField, toggleFavorite, remaskSeconds: settings.remaskSeconds, glowMove, props };
}

type Actions = ReturnType<typeof useEntryActions>;

function MenuItems({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const { props } = actions;
  return (
    <>
      <ContextMenuItem className="gap-2 text-sm" onSelect={() => props.onOpen(entry)}>
        <KeyRound className="h-3.5 w-3.5 text-kh-muted" /> Open details
      </ContextMenuItem>
      <ContextMenuItem
        className="gap-2 text-sm"
        onSelect={() => actions.copy(`menu-u-${entry.id}`, entry.username, 'Username')}
      >
        <User className="h-3.5 w-3.5 text-kh-muted" /> Copy username
      </ContextMenuItem>
      <ContextMenuItem
        className="gap-2 text-sm"
        onSelect={() => actions.copy(`menu-p-${entry.id}`, entry.password, 'Password')}
      >
        <Copy className="h-3.5 w-3.5 text-kh-muted" /> Copy password
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-kh-line" />
      <ContextMenuItem className="gap-2 text-sm" onSelect={() => props.onEdit(entry)}>
        <Pencil className="h-3.5 w-3.5 text-kh-muted" /> Edit
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 text-sm" onSelect={() => props.onDuplicate(entry)}>
        <Copy className="h-3.5 w-3.5 text-kh-muted" /> Duplicate
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-kh-line" />
      <ContextMenuItem
        className="gap-2 text-sm text-kh-danger focus:text-kh-danger"
        onSelect={() => props.onDelete(entry)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </ContextMenuItem>
    </>
  );
}

function MoreMenu({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const { props } = actions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More actions for ${entry.title}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg border border-kh-line bg-kh-inset p-2 text-kh-muted transition-all hover:-translate-y-px hover:border-kh-lineStrong hover:text-kh-primary"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 border-kh-lineStrong bg-kh-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem className="gap-2 text-sm" onSelect={() => props.onEdit(entry)}>
          <Pencil className="h-3.5 w-3.5 text-kh-muted" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" onSelect={() => props.onDuplicate(entry)}>
          <Copy className="h-3.5 w-3.5 text-kh-muted" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-kh-line" />
        <DropdownMenuItem
          className="gap-2 text-sm text-kh-danger focus:text-kh-danger"
          onSelect={() => props.onDelete(entry)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StarButton({ entry, actions, className }: { entry: VaultEntry; actions: Actions; className?: string }) {
  return (
    <button
      type="button"
      aria-label={entry.favorite ? `Remove ${entry.title} from favorites` : `Add ${entry.title} to favorites`}
      aria-pressed={entry.favorite}
      onClick={(e) => {
        e.stopPropagation();
        actions.toggleFavorite(entry.id);
      }}
      className={cn(
        'rounded-lg border border-kh-line bg-kh-inset p-2 transition-all hover:-translate-y-px hover:border-kh-lineStrong',
        entry.favorite ? 'text-kh-warning' : 'text-kh-muted hover:text-kh-warning',
        className,
      )}
    >
      <Star className="h-3.5 w-3.5" fill={entry.favorite ? 'currentColor' : 'none'} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* list row                                                            */
/* ------------------------------------------------------------------ */

function EntryRow({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const { props } = actions;
  const { strength, reused } = props;
  const info = strength.get(entry.id);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open ${entry.title} details`}
          onClick={() => props.onOpen(entry)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') props.onOpen(entry);
          }}
          onMouseMove={actions.glowMove}
          className="group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-kh-line bg-kh-surface py-3 pl-4 pr-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-kh-lineStrong"
        >
          {/* leading strength bar — tints on hover */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors duration-200 group-hover:bg-[var(--bar)]"
            style={{ '--bar': info ? STRENGTH_COLORS[info.score] : 'transparent' } as React.CSSProperties}
          />
          {/* cursor glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(56,225,255,.07), transparent 65%)' }}
          />

          <LetterAvatar name={entry.title} size={40} />

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <EntryTitle entry={entry} scramble={props.newId === entry.id} />
              <FlagTags entry={entry} reused={reused.has(entry.password)} />
            </span>
            <span className="block truncate text-sm text-kh-muted">{entry.username}</span>
          </span>

          <span className="hidden w-44 shrink-0 min-[1180px]:block" onClick={(e) => e.stopPropagation()}>
            <MaskedSecret secret={entry.password} remaskSeconds={actions.remaskSeconds} />
          </span>

          <span className="hidden shrink-0 min-[900px]:block">
            <CategoryChip category={entry.category} />
          </span>

          <span className="hidden shrink-0 min-[720px]:block">
            <StrengthDot entry={entry} strength={strength} />
          </span>

          <span className="hidden w-16 shrink-0 text-right text-xs text-kh-faint min-[900px]:block">
            {timeAgo(entry.lastUsedAt)}
          </span>

          {/* hover action cluster */}
          <span
            className="flex shrink-0 translate-x-2 items-center gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <CopyButton field={`u-${entry.id}`} text={entry.username} label="Copy username" copiedField={actions.copiedField} onCopy={actions.copy} />
            <CopyButton field={`p-${entry.id}`} text={entry.password} label="Copy password" copiedField={actions.copiedField} onCopy={actions.copy} primary />
            <StarButton entry={entry} actions={actions} />
            <MoreMenu entry={entry} actions={actions} />
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 border-kh-lineStrong bg-kh-elevated">
        <MenuItems entry={entry} actions={actions} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ------------------------------------------------------------------ */
/* grid card                                                           */
/* ------------------------------------------------------------------ */

function EntryGridCard({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const { props } = actions;
  const { strength, reused } = props;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open ${entry.title} details`}
          onClick={() => props.onOpen(entry)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') props.onOpen(entry);
          }}
          onMouseMove={actions.glowMove}
          className="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-kh-line bg-kh-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-kh-lineStrong"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(56,225,255,.08), transparent 65%)' }}
          />
          <span className="flex items-center gap-3">
            <LetterAvatar name={entry.title} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <EntryTitle entry={entry} scramble={props.newId === entry.id} />
              </span>
              <span className="block truncate text-sm text-kh-muted">{entry.username}</span>
            </span>
            <StarButton entry={entry} actions={actions} className="border-transparent bg-transparent" />
          </span>

          <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="min-w-0 flex-1 rounded-lg border border-kh-line bg-kh-inset px-2.5 py-1.5">
              <MaskedSecret secret={entry.password} remaskSeconds={actions.remaskSeconds} />
            </span>
          </span>

          <span className="flex items-center gap-2">
            <CategoryChip category={entry.category} />
            <FlagTags entry={entry} reused={reused.has(entry.password)} />
            <span className="flex-1" />
            <StrengthDot entry={entry} strength={strength} />
            <span className="text-xs text-kh-faint">{timeAgo(entry.lastUsedAt)}</span>
          </span>

          <span
            className="flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <CopyButton field={`u-${entry.id}`} text={entry.username} label="Copy username" copiedField={actions.copiedField} onCopy={actions.copy} />
            <CopyButton field={`p-${entry.id}`} text={entry.password} label="Copy password" copiedField={actions.copiedField} onCopy={actions.copy} primary />
            <span className="flex-1" />
            <MoreMenu entry={entry} actions={actions} />
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 border-kh-lineStrong bg-kh-elevated">
        <MenuItems entry={entry} actions={actions} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ------------------------------------------------------------------ */
/* list                                                                */
/* ------------------------------------------------------------------ */

export default function EntryList(props: EntryListProps) {
  const actions = useEntryActions(props);
  const { entries, view } = props;

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3'
            : 'flex flex-col gap-3',
        )}
      >
        <AnimatePresence mode="popLayout">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                height: 0,
                marginBottom: 0,
                overflow: 'hidden',
                transition: { duration: 0.25, delay: 0 },
              }}
              transition={{
                duration: 0.35,
                ease: EASE,
                delay: Math.min(i, 7) * 0.04,
                layout: { type: 'spring', stiffness: 300, damping: 30 },
              }}
            >
              {view === 'grid' ? (
                <EntryGridCard entry={entry} actions={actions} />
              ) : (
                <EntryRow entry={entry} actions={actions} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}