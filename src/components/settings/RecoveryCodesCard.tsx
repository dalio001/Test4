/**
 * Settings → Security methods → Recovery codes card.
 * Masked mono grid (auto-remasks on the vault remask timer), reveal-all with
 * a mini-scramble per code, Download .txt, Print Emergency Kit, and
 * Regenerate behind an amber confirm (old codes stop working immediately).
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff, FileDown, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LiveScramble from '@/components/LiveScramble';
import { useVault } from '@/providers/VaultProvider';
import { EASE, KhButton, SectionCard, StatusChip } from './ui';

const MASKED = '••••-••••-••••';

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function emergencyKitText(codes: string[]): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    'KEYHAVEN — EMERGENCY KIT',
    `Printed: ${stamp}`,
    '',
    'Keep this page somewhere physical and safe. Anyone holding it can',
    'recover your vault — treat it like cash or a passport.',
    '',
    'RECOVERY CODES (each works once):',
    ...codes.map((c, i) => `  ${String(i + 1).padStart(2, ' ')}. ${c}`),
    '',
    'MASTER PASSWORD HINT (optional, write by hand):',
    '  ______________________________________________',
    '',
    'How to recover: open KeyHaven → Unlock → "Use a recovery code" →',
    'enter one code above, then set a new master password.',
    '',
    'keyhaven.local — zero-knowledge, local-first. We can’t see this page.',
  ].join('\n');
}

export default function RecoveryCodesCard() {
  const { recoveryCodes, regenerateRecoveryCodes, settings } = useVault();
  const [revealed, setRevealed] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  // auto-remask on the vault's reveal timeout
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), Math.max(5, settings.remaskSeconds) * 1000);
    return () => clearTimeout(t);
  }, [revealed, settings.remaskSeconds, recoveryCodes]);

  const stamp = new Date().toISOString().slice(0, 10);

  const downloadTxt = () => {
    downloadTextFile(`keyhaven-recovery-codes-${stamp}.txt`, emergencyKitText(recoveryCodes));
    toast.success('Recovery codes downloaded — store the file offline');
  };

  const printKit = () => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) {
      toast.error('Popup blocked — allow popups to print the kit');
      return;
    }
    const rows = recoveryCodes
      .map(
        (c, i) =>
          `<div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px dashed #ccc">
            <span style="color:#888;width:24px">${i + 1}.</span>
            <code style="font-family:ui-monospace,monospace;font-size:16px;letter-spacing:2px">${c}</code>
          </div>`,
      )
      .join('');
    w.document.write(`<!doctype html><html><head><title>KeyHaven Emergency Kit</title></head>
      <body style="font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;color:#111;padding:0 24px">
        <h1 style="font-size:22px;margin-bottom:4px">KeyHaven — Emergency Kit</h1>
        <p style="color:#555;font-size:13px;margin-top:0">Printed ${stamp} · Keep this page somewhere physical and safe.
        Anyone holding it can recover your vault — treat it like cash or a passport.</p>
        <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:2px;margin-top:28px">Recovery codes (each works once)</h2>
        ${rows}
        <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:2px;margin-top:28px">Master password hint (optional)</h2>
        <div style="border-bottom:2px solid #999;height:36px"></div>
        <p style="color:#555;font-size:13px;margin-top:28px">How to recover: open KeyHaven → Unlock → “Use a recovery code” →
        enter one code above, then set a new master password.</p>
        <p style="color:#999;font-size:11px;margin-top:32px">keyhaven.local — zero-knowledge, local-first. We can’t see this page.</p>
        <script>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  const regenerate = () => {
    regenerateRecoveryCodes();
    setRegenOpen(false);
    setRevealed(true);
    toast.success('New recovery codes generated — old codes stopped working');
  };

  return (
    <SectionCard
      id="recovery"
      title="Recovery codes"
      helper="One-time codes that unlock your vault if you lose your phone or forget your master password. Store them offline — they’re as powerful as your password."
      headerAction={<StatusChip tone="faint">{recoveryCodes.length} codes</StatusChip>}
    >
      {/* grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {recoveryCodes.map((code, i) => (
            <motion.div
              key={`${code}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: revealed ? i * 0.04 : 0, duration: 0.3, ease: EASE }}
              className="flex items-center rounded-lg border border-kh-line bg-kh-inset px-4 py-3"
            >
              <span className="mr-3 font-mono text-[11px] text-kh-faint">{String(i + 1).padStart(2, '0')}</span>
              {revealed ? (
                <LiveScramble text={code} className="font-mono text-sm tracking-wider text-kh-mint" speed={22} />
              ) : (
                <span className="font-mono text-sm tracking-wider text-kh-faint">{MASKED}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <KhButton variant="secondary" onClick={() => setRevealed((r) => !r)}>
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {revealed ? 'Mask all' : 'Reveal all'}
        </KhButton>
        <KhButton variant="ghost" onClick={downloadTxt}>
          <FileDown className="h-4 w-4" /> Download .txt
        </KhButton>
        <KhButton variant="ghost" onClick={printKit}>
          <Printer className="h-4 w-4" /> Print Emergency Kit
        </KhButton>
        <KhButton variant="amberGhost" onClick={() => setRegenOpen(true)}>
          <RefreshCw className="h-4 w-4" /> Regenerate
        </KhButton>
      </div>
      {revealed && (
        <p className="mt-3 font-mono text-[11px] text-kh-faint">
          masks again in {settings.remaskSeconds}s
        </p>
      )}

      {/* regenerate confirm */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="border-kh-line bg-kh-elevated sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-kh-primary">
              <AlertTriangle className="h-5 w-5 text-kh-warning" /> Regenerate codes?
            </DialogTitle>
            <DialogDescription className="text-kh-muted">
              Old codes stop working immediately. If your printed Emergency Kit is lying in a
              drawer, it becomes scrap paper — print the new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <KhButton variant="ghost" onClick={() => setRegenOpen(false)}>
              Keep current codes
            </KhButton>
            <KhButton
              onClick={regenerate}
              className="border border-kh-warning/50 text-kh-warning hover:bg-kh-warning hover:text-[#04110B]"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </KhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
