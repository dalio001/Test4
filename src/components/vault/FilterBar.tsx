/**
 * FilterBar — sticky category chips row (All · Favorites · 6 categories with
 * counts) + sort dropdown + grid/list segmented toggle. Chips slide in from
 * the left with a 40ms stagger; active chip is tinted at 12% of its color.
 */

import { motion } from 'framer-motion';
import { ArrowUpDown, LayoutGrid, List, Star, X } from 'lucide-react';
import type { VaultCategory } from '@/lib/vault';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATEGORY_META, CATEGORY_ORDER, SORT_OPTIONS } from './vault-utils';
import type { CategoryFilter, SortKey } from './vault-utils';

export interface FilterBarCounts {
  total: number;
  favorites: number;
  perCategory: Record<VaultCategory, number>;
}

interface ChipDef {
  key: CategoryFilter;
  label: string;
  count: number;
  color: string;
  favorite?: boolean;
}

function Chip({
  def,
  active,
  index,
  onClick,
}: {
  def: ChipDef;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active ? 'font-medium' : 'border-kh-line bg-kh-surface text-kh-muted hover:border-kh-lineStrong hover:text-kh-primary',
      )}
      style={
        active
          ? { backgroundColor: `${def.color}1F`, borderColor: `${def.color}55`, color: def.color }
          : undefined
      }
    >
      {def.favorite && (
        <Star className="h-3.5 w-3.5" fill={active ? 'currentColor' : 'none'} aria-hidden />
      )}
      {def.label}
      <span
        className={cn('rounded-full px-1.5 font-mono text-[11px]', active ? '' : 'text-kh-faint')}
        style={active ? { backgroundColor: `${def.color}26` } : undefined}
      >
        {def.count}
      </span>
    </motion.button>
  );
}

export default function FilterBar({
  counts,
  category,
  onCategory,
  sort,
  onSort,
  view,
  onView,
  query,
  onClearQuery,
}: {
  counts: FilterBarCounts;
  category: CategoryFilter;
  onCategory: (c: CategoryFilter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  view: 'list' | 'grid';
  onView: (v: 'list' | 'grid') => void;
  query: string;
  onClearQuery: () => void;
}) {
  const chips: ChipDef[] = [
    { key: 'all', label: 'All', count: counts.total, color: '#EAF0FA' },
    { key: 'favorites', label: 'Favorites', count: counts.favorites, color: '#FFB84D', favorite: true },
    ...CATEGORY_ORDER.map((c) => ({
      key: c as CategoryFilter,
      label: CATEGORY_META[c].label,
      count: counts.perCategory[c],
      color: CATEGORY_META[c].color,
    })),
  ];
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Sort';

  return (
    <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 bg-kh-base/80 px-1 py-3 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c, i) => (
          <Chip
            key={c.key}
            def={c}
            index={i}
            active={category === c.key}
            onClick={() => onCategory(c.key)}
          />
        ))}
        {query.trim() && (
          <button
            type="button"
            onClick={onClearQuery}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-kh-cyan/40 bg-kh-cyan/10 px-3 py-1.5 text-sm font-medium text-kh-cyan transition-colors hover:bg-kh-cyan/20"
          >
            “{query.trim()}”
            <X className="h-3.5 w-3.5" aria-label="Clear search" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-kh-line bg-kh-surface px-3 py-1.5 text-sm text-kh-muted transition-colors hover:border-kh-lineStrong hover:text-kh-primary"
            >
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
              <span className="max-[520px]:hidden">{sortLabel}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 border-kh-lineStrong bg-kh-elevated">
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSort(v as SortKey)}>
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuRadioItem key={o.key} value={o.key} className="text-sm">
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          role="group"
          aria-label="View mode"
          className="flex items-center rounded-lg border border-kh-line bg-kh-surface p-0.5"
        >
          {(
            [
              { key: 'list', icon: List, label: 'List view' },
              { key: 'grid', icon: LayoutGrid, label: 'Grid view' },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              type="button"
              aria-label={v.label}
              aria-pressed={view === v.key}
              onClick={() => onView(v.key)}
              className={cn(
                'relative rounded-md p-1.5 transition-colors',
                view === v.key ? 'text-kh-mint' : 'text-kh-faint hover:text-kh-primary',
              )}
            >
              {view === v.key && (
                <motion.span
                  layoutId="view-toggle-pill"
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="absolute inset-0 rounded-md bg-kh-elevated"
                />
              )}
              <v.icon className="relative h-4 w-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}