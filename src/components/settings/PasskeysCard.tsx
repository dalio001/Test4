/**
 * Settings → Security methods → Passkeys card.
 * Lists registered passkeys (useVault passkeys API), registers new ones via
 * the WebAuthn ceremony (src/lib/webauthn.ts through the provider), and
 * removes them with a confirm dialog — removing the LAST passkey requires an
 * explicit acknowledgment checkbox.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Fingerprint, Plus, Trash2, Usb } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useVault } from '@/providers/VaultProvider';
import { EASE, KhButton, SectionCard, Spinner, StatusChip } from './ui';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

/** Friendly default name derived from the platform. */
function defaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/mac/i.test(ua)) return 'This Mac — Touch ID';
  if (/windows/i.test(ua)) return 'This PC — Windows Hello';
  if (/android/i.test(ua)) return 'This Android — fingerprint';
  if (/iphone|ipad/i.test(ua)) return 'This iPhone — Face ID';
  return 'This device — biometrics';
}

function looksLikeSecurityKey(name: string): boolean {
  return /yubi|key|usb|token|roaming/i.test(name);
}

export default function PasskeysCard() {
  const { passkeys, passkeyAvailable, addPasskey, removePasskey } = useVault();

  const [nameDialog, setNameDialog] = useState<null | { defaultName: string }>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const openNameDialog = (kind: 'device' | 'key') => {
    setNameDraft(kind === 'device' ? defaultDeviceName() : 'USB security key');
    setNameDialog({ defaultName: kind === 'device' ? defaultDeviceName() : 'USB security key' });
  };

  const runCeremony = async (name: string) => {
    setBusy(true);
    const ok = await addPasskey(name.trim() || 'Passkey');
    setBusy(false);
    setNameDialog(null);
    if (ok) {
      toast.success('Passkey registered — next unlock is one touch');
      setJustAdded(name);
      setTimeout(() => setJustAdded(null), 1200);
    } else {
      toast.info('Registration cancelled or unavailable on this device');
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    await removePasskey(removeTarget);
    setRemoveTarget(null);
    setAck(false);
    toast.success('Passkey removed');
  };

  const isLastPasskey = passkeys.length <= 1;

  return (
    <SectionCard
      id="passkeys"
      title="Passkeys"
      helper="Unlock with your fingerprint, face, device PIN, or a USB security key — nothing to type, nothing to phish."
      headerAction={<StatusChip tone="violet">{passkeys.length} registered</StatusChip>}
    >
      {/* registered list */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {passkeys.map((p) => (
            <motion.div
              key={p.credentialId}
              layout
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div
                className={`flex items-center gap-3 rounded-xl border border-kh-line bg-kh-inset px-4 py-3 ${
                  justAdded === p.name ? 'animate-pulse-glow' : ''
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kh-violet/30 bg-kh-violet/10">
                  {looksLikeSecurityKey(p.name) ? (
                    <Usb className="h-4 w-4 text-kh-violet" />
                  ) : (
                    <Fingerprint className="h-4 w-4 text-kh-violet" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-kh-primary">{p.name}</p>
                  <p className="font-mono text-[11px] text-kh-faint">added {formatDate(p.createdAt)}</p>
                </div>
                <KhButton variant="dangerGhost" className="px-2.5 py-1.5 text-xs" onClick={() => setRemoveTarget(p.credentialId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </KhButton>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {passkeys.length === 0 && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-kh-lineStrong px-4 py-6">
            <p className="text-sm text-kh-faint">No passkeys yet</p>
          </div>
        )}
      </div>

      {/* footer actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <KhButton variant="violet" onClick={() => openNameDialog('device')} disabled={!passkeyAvailable || busy}>
          {busy ? <Spinner /> : <Plus className="h-4 w-4" />}
          Register this device
        </KhButton>
        <KhButton variant="ghost" onClick={() => openNameDialog('key')} disabled={!passkeyAvailable || busy}>
          <Usb className="h-4 w-4" />
          Register a security key
        </KhButton>
        {!passkeyAvailable && (
          <p className="text-xs text-kh-faint">
            Passkeys aren’t available in this browser — try a device with biometrics or a PIN.
          </p>
        )}
      </div>

      {/* name dialog (also starts the ceremony) */}
      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && !busy && setNameDialog(null)}>
        <DialogContent className="border-kh-line bg-kh-elevated sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-kh-primary">Name this passkey</DialogTitle>
            <DialogDescription className="text-kh-muted">
              A friendly label so you remember which device or key this is.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="passkey-name" className="text-kh-muted">
              Passkey name
            </Label>
            <Input
              id="passkey-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={nameDialog?.defaultName}
              className="h-11 border-kh-line bg-kh-inset text-kh-primary"
              autoFocus
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <KhButton variant="ghost" onClick={() => setNameDialog(null)} disabled={busy}>
              Cancel
            </KhButton>
            <KhButton variant="violet" onClick={() => void runCeremony(nameDraft)} disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Follow your device’s prompt…
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" /> Register
                </>
              )}
            </KhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* remove confirm */}
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
            setAck(false);
          }
        }}
      >
        <DialogContent className="border-kh-line bg-kh-elevated sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-kh-primary">Remove this passkey?</DialogTitle>
            <DialogDescription className="text-kh-muted">
              {isLastPasskey
                ? 'This is your last passkey. After removing it, unlocking will require your master password (and authenticator, if enabled).'
                : 'You can register it again anytime from an unlocked vault.'}
            </DialogDescription>
          </DialogHeader>
          {isLastPasskey && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-kh-warning/30 bg-kh-warning/5 p-3.5 text-sm text-kh-muted">
              <Checkbox
                checked={ack}
                onCheckedChange={(v) => setAck(v === true)}
                className="mt-0.5 border-kh-lineStrong data-[state=checked]:border-kh-warning data-[state=checked]:bg-kh-warning data-[state=checked]:text-[#04110B]"
              />
              I understand I’ll need my master password to unlock from now on.
            </label>
          )}
          <DialogFooter>
            <KhButton variant="ghost" onClick={() => setRemoveTarget(null)}>
              Keep passkey
            </KhButton>
            <KhButton variant="danger" onClick={() => void confirmRemove()} disabled={isLastPasskey && !ack}>
              <Trash2 className="h-4 w-4" /> Remove
            </KhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
