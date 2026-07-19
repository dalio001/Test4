/**
 * Settings tab 2 — Vault & data.
 * Encrypted backup export (ciphertext file + size toast) and import
 * (dropzone → validate → backup-password prompt → import + unlock + summary),
 * "This device" session card with real record metadata, and the danger zone
 * (clear trusted devices / delete vault with type-to-confirm).
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  MonitorSmartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useVault } from '@/providers/VaultProvider';
import { buildExportFile, loadVaultRecord, parseExportFile } from '@/lib/vault';
import type { VaultRecord } from '@/lib/vault';
import { KhButton, SectionCard, Spinner, StatusChip } from './ui';
import { cn } from '@/lib/utils';

const LAST_EXPORT_KEY = 'keyhaven:last-export';

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function browserName(): string {
  const ua = navigator.userAgent;
  const browser = /edg/i.test(ua)
    ? 'Edge'
    : /chrome/i.test(ua)
      ? 'Chrome'
      : /safari/i.test(ua) && !/chrome/i.test(ua)
        ? 'Safari'
        : /firefox/i.test(ua)
          ? 'Firefox'
          : 'This browser';
  const os = /mac/i.test(ua) ? 'macOS' : /windows/i.test(ua) ? 'Windows' : /linux/i.test(ua) ? 'Linux' : /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : '';
  return os ? `${browser} on ${os}` : browser;
}

/* ------------------------------------------------------------------ */

function BackupCard() {
  const { entries, exportVault, importVault, unlock } = useVault();
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(() =>
    localStorage.getItem(LAST_EXPORT_KEY),
  );
  const [pending, setPending] = useState<null | { file: File; record: VaultRecord }>(null);
  const [password, setPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    setExporting(true);
    try {
      const rec = await loadVaultRecord();
      const size = rec ? new Blob([buildExportFile(rec)]).size : 0;
      exportVault();
      const stamp = new Date().toISOString();
      localStorage.setItem(LAST_EXPORT_KEY, stamp);
      setLastExport(stamp);
      toast.success(
        `Encrypted backup downloaded (${(size / 1024).toFixed(1)} KB of ciphertext)`,
      );
    } finally {
      setTimeout(() => setExporting(false), 400);
    }
  };

  const pickFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const record = parseExportFile(await file.text());
      setPending({ file, record });
      setPassword('');
      setImportError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Not a valid KeyHaven backup file');
    }
  };

  const doImport = async () => {
    if (!pending || importing) return;
    setImporting(true);
    setImportError(null);
    const result = await importVault(pending.file);
    if (!result.ok) {
      setImporting(false);
      setImportError(result.error ?? 'Import failed');
      return;
    }
    // provider is now locked around the imported record — unlock with its password
    const unlockResult = await unlock(password);
    setImporting(false);
    if (unlockResult === 'ok') {
      setPending(null);
      toast.success('Backup imported — vault unlocked');
    } else if (unlockResult === 'totp-required') {
      setPending(null);
      toast.info('Backup imported — this vault also asks for your authenticator code', {
        duration: 4000,
      });
      // the app-shell guard routes to /unlock on its own
    } else {
      setImportError(
        unlockResult === 'totp-invalid'
          ? 'That authenticator code didn’t match.'
          : 'That password doesn’t match this backup. The imported vault stays on this device — you can retry from the unlock screen.',
      );
    }
  };

  return (
    <SectionCard
      title="Backup & restore"
      helper="Your vault lives only in this browser. Export an encrypted backup file (AES-256-GCM, needs your master password to open) and import it on any device."
    >
      <div className="flex flex-wrap gap-3">
        <KhButton variant="primary" onClick={() => void doExport()} disabled={exporting}>
          {exporting ? <Spinner /> : <Download className="h-4 w-4" />}
          Export encrypted vault
        </KhButton>
        <KhButton variant="secondary" onClick={() => fileInput.current?.click()}>
          <Upload className="h-4 w-4" /> Import backup
        </KhButton>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
        className={cn(
          'mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-all duration-200',
          dragOver ? 'scale-[1.01] border-kh-mint bg-kh-mint/5' : 'border-kh-lineStrong bg-kh-inset',
        )}
      >
        <Upload className={cn('h-5 w-5', dragOver ? 'text-kh-mint' : 'text-kh-faint')} />
        <p className="text-sm text-kh-muted">
          Drop a <span className="font-mono text-xs">keyhaven-backup-*.json</span> here, or click to browse
        </p>
        <p className="text-xs text-kh-faint">It stays encrypted — we never see the contents.</p>
      </div>

      <p className="mt-4 font-mono text-[11px] leading-5 text-kh-faint">
        Last export: {fmtDateTime(lastExport)} · Vault size: {entries.length} entries · Storage:
        this browser (IndexedDB)
      </p>

      {/* import confirm + password modal */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && !importing && setPending(null)}>
        <DialogContent className="border-kh-line bg-kh-elevated sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-kh-primary">Import this backup?</DialogTitle>
            <DialogDescription className="text-kh-muted">
              Exported {fmtDateTime(pending?.record.updatedAt)} ·{' '}
              {pending?.record.passkeys?.length ?? 0} passkey(s) ·{' '}
              {pending?.record.totpEnabled ? 'authenticator enabled' : 'no authenticator'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-kh-warning/30 bg-kh-warning/5 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-kh-warning" />
            <p className="text-sm leading-6 text-kh-muted">
              Importing <span className="text-kh-primary">replaces</span> the vault currently on
              this device. Export a backup of it first if you’re unsure.
            </p>
          </div>
          <div className="space-y-2 py-1">
            <label htmlFor="import-password" className="text-sm font-medium text-kh-muted">
              Master password for this backup
            </label>
            <Input
              id="import-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="The password in use when the backup was made"
              autoComplete="off"
              className="h-11 border-kh-line bg-kh-inset font-mono text-sm text-kh-primary"
              onKeyDown={(e) => e.key === 'Enter' && password && void doImport()}
            />
            {importError && <p className="text-xs leading-5 text-kh-danger">{importError}</p>}
          </div>
          <DialogFooter>
            <KhButton variant="ghost" onClick={() => setPending(null)} disabled={importing}>
              Cancel
            </KhButton>
            <KhButton variant="primary" onClick={() => void doImport()} disabled={!password || importing}>
              {importing ? (
                <>
                  <Spinner /> Importing…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Import & unlock
                </>
              )}
            </KhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */

function DevicesCard() {
  const [meta, setMeta] = useState<{ createdAt: string; updatedAt: string } | null>(null);
  const [sessionStart] = useState(() => new Date().toISOString());

  useEffect(() => {
    void loadVaultRecord().then((rec) => {
      if (rec) setMeta({ createdAt: rec.createdAt, updatedAt: rec.updatedAt });
    });
  }, []);

  const clearTrusted = () => {
    // trusted-device flags live in localStorage under this prefix
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('keyhaven:trusted')) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
    toast.success('Trusted-device flags cleared on this browser');
  };

  return (
    <SectionCard
      title="This device"
      helper="KeyHaven has no cloud account — this is unlock activity on this browser only."
    >
      <div className="flex items-center gap-3 rounded-xl border border-kh-line bg-kh-inset px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-kh-mint/30 bg-kh-mint/10">
          <MonitorSmartphone className="h-4 w-4 text-kh-mint" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-kh-primary">{browserName()} (current)</p>
          <p className="font-mono text-[11px] text-kh-faint">session started {fmtDateTime(sessionStart)}</p>
        </div>
        <StatusChip tone="mint">active now</StatusChip>
      </div>

      <div className="mt-3 space-y-1.5 font-mono text-[11px] leading-5 text-kh-faint">
        <p>vault created {fmtDateTime(meta?.createdAt)} · last change {fmtDateTime(meta?.updatedAt)}</p>
      </div>

      <div className="mt-4">
        <KhButton variant="ghost" onClick={clearTrusted}>
          Sign out of other remembered devices
        </KhButton>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */

function DangerZoneCard() {
  const { destroyVault } = useVault();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = typed === 'DELETE' && accepted && !deleting;

  const doDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    await destroyVault();
    toast.success('Vault deleted. This device is clean.');
    // guard routes to /unlock?mode=create
  };

  const clearTrusted = () => {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('keyhaven:trusted')) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
    toast.success('Trusted-device flags cleared');
  };

  return (
    <SectionCard
      title="Danger zone"
      helper="Irreversible actions. Calm, but permanent."
      danger
      className="hover:border-kh-danger/50"
    >
      <div className="divide-y divide-kh-line">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div>
            <p className="text-sm font-medium text-kh-primary">Clear all trusted devices</p>
            <p className="text-xs text-kh-faint">Every browser forgets it was ever trusted.</p>
          </div>
          <KhButton variant="amberGhost" onClick={clearTrusted}>
            Clear trusted devices
          </KhButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div>
            <p className="text-sm font-medium text-kh-primary">Delete vault on this device</p>
            <p className="text-xs text-kh-faint">
              Wipes the encrypted vault from IndexedDB. Without a backup, it’s gone forever.
            </p>
          </div>
          <KhButton variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete vault
          </KhButton>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteOpen(false);
            setTyped('');
            setAccepted(false);
          }
        }}
      >
        <DialogContent className="border-kh-danger/30 bg-kh-elevated sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-kh-danger">
              <AlertTriangle className="h-5 w-5" /> Delete this vault forever?
            </DialogTitle>
            <DialogDescription className="text-kh-muted">
              The encrypted vault on this device is wiped immediately. There is no “undo”, no
              support line, no server copy — that’s the deal with zero-knowledge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium text-kh-muted">
                Type <span className="font-mono text-kh-danger">DELETE</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className={cn(
                  'h-11 border-kh-line bg-kh-inset font-mono text-sm text-kh-primary',
                  typed === 'DELETE' && 'border-kh-mint/60',
                )}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-kh-line bg-kh-inset p-3.5 text-sm text-kh-muted">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5 border-kh-lineStrong data-[state=checked]:border-kh-danger data-[state=checked]:bg-kh-danger data-[state=checked]:text-[#04110B]"
              />
              I have exported a backup or accept permanent loss.
            </label>
          </div>

          <DialogFooter>
            <KhButton variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep my vault
            </KhButton>
            <KhButton variant="danger" onClick={() => void doDelete()} disabled={!canDelete}>
              {deleting ? (
                <>
                  <Spinner /> Wiping…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete forever
                </>
              )}
            </KhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */

export default function VaultDataTab() {
  return (
    <div className="space-y-6">
      <BackupCard />
      <DevicesCard />
      <DangerZoneCard />
    </div>
  );
}
