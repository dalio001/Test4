/**
 * CommandPalette — ⌘K fuzzy search across logins + actions (vault.md §3/§6).
 * Enter opens the highlighted login's detail drawer; with an empty query `c`
 * copies its password (clipboard auto-clear). Typing live-filters the list
 * behind the palette via `onQueryChange`; closing the palette clears it.
 */

import { useState } from 'react';
import { Lock, Plus, Search, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import LetterAvatar from '@/components/LetterAvatar';
import { useVault } from '@/providers/VaultProvider';
import { hostOf, showVaultToast } from './vault-utils';
import type { EntryExt } from './vault-utils';

export default function CommandPalette({
  open,
  onOpenChange,
  entries,
  onOpenEntry,
  onAddLogin,
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: EntryExt[];
  onOpenEntry: (e: EntryExt) => void;
  onAddLogin: () => void;
  onQueryChange: (q: string) => void;
}) {
  const { copyWithAutoClear, lock } = useVault();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');

  const setOpen = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setQuery('');
      onQueryChange('');
    }
  };

  const highlighted = entries.find((e) => `entry-${e.id}` === value) ?? null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'c' && query.trim() === '' && highlighted) {
      e.preventDefault();
      void copyWithAutoClear(highlighted.password, 'Password');
      showVaultToast({
        title: `${highlighted.title} password copied`,
        variant: 'success',
        durationMs: 2500,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search your vault</DialogTitle>
        <DialogDescription>Search logins and run vault actions</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="overflow-hidden border-kh-lineStrong bg-kh-elevated p-0 shadow-drawer"
        onKeyDown={handleKeyDown}
      >
        <Command
          value={value}
          onValueChange={setValue}
          className="bg-transparent [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-kh-faint [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput
            placeholder="Search your vault…"
            value={query}
            onValueChange={(q) => {
              setQuery(q);
              onQueryChange(q);
            }}
          />
          <CommandList className="max-h-[340px]">
            <CommandEmpty>
              <span className="text-sm text-kh-faint">No logins match “{query}”.</span>
            </CommandEmpty>
            <CommandGroup heading="Logins">
              {entries.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`entry-${e.id}`}
                  keywords={[e.title, e.username, hostOf(e.url), e.category]}
                  onSelect={() => {
                    onOpenEntry(e);
                    setOpen(false);
                  }}
                  className="gap-3 aria-selected:bg-kh-surface"
                >
                  <LetterAvatar name={e.title} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-kh-primary">{e.title}</span>
                    <span className="block truncate text-xs text-kh-faint">{e.username}</span>
                  </span>
                  {e.favorite && <span className="text-xs text-kh-warning">★</span>}
                  <CommandShortcut className="font-mono text-[10px] text-kh-faint">↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                value="action-add-login"
                keywords={['add', 'new', 'login', 'create']}
                onSelect={() => {
                  onAddLogin();
                  setOpen(false);
                }}
                className="gap-3 aria-selected:bg-kh-surface"
              >
                <Plus className="h-4 w-4 text-kh-mint" />
                <span className="text-sm">Add login</span>
              </CommandItem>
              <CommandItem
                value="action-generator"
                keywords={['generator', 'password', 'random']}
                onSelect={() => {
                  navigate('/generator');
                  setOpen(false);
                }}
                className="gap-3 aria-selected:bg-kh-surface"
              >
                <Wand2 className="h-4 w-4 text-kh-cyan" />
                <span className="text-sm">Generator</span>
              </CommandItem>
              <CommandItem
                value="action-lock"
                keywords={['lock', 'vault', 'secure']}
                onSelect={() => {
                  lock();
                  setOpen(false);
                }}
                className="gap-3 aria-selected:bg-kh-surface"
              >
                <Lock className="h-4 w-4 text-kh-warning" />
                <span className="text-sm">Lock vault</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex items-center gap-4 border-t border-kh-line px-4 py-2.5">
          {[
            ['↑↓', 'navigate'],
            ['↵', 'open'],
            ['c', 'copy password'],
            ['esc', 'close'],
          ].map(([kbd, label]) => (
            <span key={kbd} className="flex items-center gap-1.5 text-[11px] text-kh-faint">
              <kbd className="rounded border border-kh-lineStrong bg-kh-inset px-1.5 py-0.5 font-mono text-[10px] text-kh-muted">
                {kbd}
              </kbd>
              {label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-kh-faint">
            <Search className="h-3 w-3" /> {entries.length} logins
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}