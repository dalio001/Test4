/**
 * Settings tab 4 — About. Logomark, version, the local-first promise, link
 * rows, and a keyboard-shortcuts modal.
 */

import { Link } from 'react-router';
import { ArrowUpRight, Keyboard, ShieldCheck, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { SectionCard } from './ui';

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['⌘', 'K'], action: 'Search your vault' },
  { keys: ['Space'], action: 'Reveal / mask the focused password' },
  { keys: ['C'], action: 'Copy the focused password' },
  { keys: ['L'], action: 'Lock the vault now' },
];

export default function AboutTab() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col items-center py-4 text-center">
          <img src="/logo.svg" alt="KeyHaven logomark" className="h-14 w-14" />
          <h3 className="mt-4 font-display text-2xl font-semibold text-kh-primary">
            <span className="text-aurora">Key</span>Haven
          </h3>
          <p className="mt-1 font-mono text-xs text-kh-faint">v1.0.0</p>
          <p className="mt-3 max-w-[44ch] text-sm leading-6 text-kh-muted">
            Built local-first. No accounts, no servers, no telemetry.
          </p>
        </div>

        <div className="mt-2 divide-y divide-kh-line border-t border-kh-line">
          <Link
            to="/about"
            className="group flex items-center gap-3 py-3.5 text-sm text-kh-primary transition-colors hover:text-kh-mint"
          >
            <ShieldCheck className="h-4 w-4 text-kh-cyan" />
            <span className="flex-1">How KeyHaven protects you</span>
            <ArrowUpRight className="h-4 w-4 text-kh-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/security"
            className="group flex items-center gap-3 py-3.5 text-sm text-kh-primary transition-colors hover:text-kh-mint"
          >
            <Sparkles className="h-4 w-4 text-kh-cyan" />
            <span className="flex-1">Security checklist</span>
            <ArrowUpRight className="h-4 w-4 text-kh-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="group flex w-full items-center gap-3 py-3.5 text-left text-sm text-kh-primary transition-colors hover:text-kh-mint"
          >
            <Keyboard className="h-4 w-4 text-kh-cyan" />
            <span className="flex-1">Keyboard shortcuts</span>
            <ArrowUpRight className="h-4 w-4 text-kh-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>
      </SectionCard>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="border-kh-line bg-kh-elevated sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-kh-primary">Keyboard shortcuts</DialogTitle>
            <DialogDescription className="text-kh-muted">
              Everywhere inside the unlocked vault.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-kh-line">
            {SHORTCUTS.map((s) => (
              <div key={s.action} className="flex items-center justify-between py-3">
                <span className="text-sm text-kh-muted">{s.action}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <Kbd
                      key={k}
                      className="border border-kh-lineStrong bg-kh-inset font-mono text-xs text-kh-primary"
                    >
                      {k}
                    </Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
