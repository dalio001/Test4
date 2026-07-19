/**
 * UnlockMode — Mode A of the vault gate (design/unlock.md).
 * Three method tabs: master password, passkey, authenticator (TOTP).
 * - Master password: mono input + eye toggle, caps-lock warning, honest
 *   KDF microcopy, "trust this device" preference (persisted locally).
 * - TOTP: 6-box OTP with live 30s countdown ring; auto-submits on the 6th
 *   digit; wrong code shakes with danger borders.
 * - Failed attempts: counter chip after 2 fails; 5 fails locks inputs for
 *   30s (calm anti-brute-force pause).
 * - "Forgot master password?" modal: explains zero-knowledge, honest
 *   recovery-code check, and a type-DELETE start-over that wipes the vault.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Smartphone,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ScrambleText from '@/components/ScrambleText';
import VaultRing from '@/components/VaultRing';
import OtpInput from '@/components/unlock/OtpInput';
import PasskeyPanel from '@/components/unlock/PasskeyPanel';
import { useVault } from '@/providers/VaultProvider';
import { cn } from '@/lib/utils';

type Method = 'password' | 'passkey' | 'totp';

const LAST_METHOD_KEY = 'keyhaven.lastMethod';
const TRUST_KEY = 'keyhaven.trustedDevice';
const MAX_FAILS = 5;
const LOCK_SECONDS = 30;

export interface UnlockModeProps {
  /** parent starts the success ceremony (ring sweep → iris → /vault) */
  onSuccess: () => void;
  onSwitchToCreate: () => void;
  /** notify parent to flash the card border danger */
  onFail: () => void;
}

/** 24px live TOTP countdown ring — strokes scrub in real time. */
function TotpCountdown() {
  const [remaining, setRemaining] = useState(() => 30 - ((Date.now() / 1000) % 30));
  useEffect(() => {
    const id = setInterval(() => setRemaining(30 - ((Date.now() / 1000) % 30)), 200);
    return () => clearInterval(id);
  }, []);
  const r = 10;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center" title="Codes refresh every 30 seconds">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(148,178,255,.12)" strokeWidth="2" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={remaining <= 5 ? '#FF5C7A' : '#35F0A1'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - remaining / 30)}
        />
      </svg>
      <span className="absolute font-mono text-[9px] font-medium text-kh-faint">{Math.ceil(remaining)}</span>
    </span>
  );
}

export default function UnlockMode({ onSuccess, onSwitchToCreate, onFail }: UnlockModeProps) {
  const { unlock, totpEnabled, passkeys, destroyVault } = useVault();

  const hasPasskey = passkeys.length > 0;
  const validMethod = (m: string | null): Method =>
    m === 'passkey' && hasPasskey ? 'passkey' : m === 'totp' && totpEnabled ? 'totp' : 'password';

  const [method, setMethod] = useState<Method>(() =>
    validMethod(typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_METHOD_KEY) : null),
  );

  /* master password state */
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trust, setTrust] = useState(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(TRUST_KEY) === '1' : false,
  );

  /* totp state */
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpShake, setTotpShake] = useState(0);
  const [totpNotice, setTotpNotice] = useState(false);

  /* failed-attempt throttling */
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  const locked = lockUntil !== null && lockRemaining > 0;

  /* forgot-password dialog */
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const pwInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lockUntil === null) return;
    const tick = () => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockUntil(null);
        setLockRemaining(0);
        setFails(0);
      } else {
        setLockRemaining(left);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  const registerFail = () => {
    onFail();
    setFails((f) => {
      const n = f + 1;
      if (n >= MAX_FAILS) setLockUntil(Date.now() + LOCK_SECONDS * 1000);
      return n;
    });
  };

  const persistTrust = () => {
    if (trust) localStorage.setItem(TRUST_KEY, '1');
    else localStorage.removeItem(TRUST_KEY);
  };

  const submitPassword = async () => {
    if (!password || busy || locked) return;
    setBusy(true);
    setError(null);
    const res = await unlock(password);
    setBusy(false);
    if (res === 'ok') {
      localStorage.setItem(LAST_METHOD_KEY, 'password');
      persistTrust();
      onSuccess();
    } else if (res === 'totp-required') {
      setPendingPassword(password);
      setPassword('');
      setTotpNotice(true);
      setTotpError(null);
      setTotpCode('');
      setMethod('totp');
    } else {
      registerFail();
      setError("That master password didn't match — try again.");
    }
  };

  const submitTotp = async (code: string) => {
    if (!pendingPassword || totpBusy || locked) return;
    setTotpBusy(true);
    setTotpError(null);
    const res = await unlock(pendingPassword, code);
    setTotpBusy(false);
    if (res === 'ok') {
      localStorage.setItem(LAST_METHOD_KEY, 'totp');
      persistTrust();
      onSuccess();
    } else if (res === 'totp-invalid') {
      registerFail();
      setTotpShake((k) => k + 1);
      setTotpCode('');
      setTotpError("That code didn't match — wait for a fresh one and try again.");
    } else {
      setPendingPassword(null);
      setMethod('password');
      setError('Please re-enter your master password to continue.');
    }
  };

  const checkRecoveryCode = () => {
    const v = recoveryInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v)) {
      setRecoveryMsg('Recovery codes look like XXXX-XXXX-XXXX — check the format and try again.');
      return;
    }
    setRecoveryMsg(
      "Recovery codes live inside your sealed vault, so they can't open it by themselves. If your master password is lost, starting over below is the only way back in.",
    );
  };

  const startOver = async () => {
    if (deleteInput !== 'DELETE' || deleting) return;
    setDeleting(true);
    await destroyVault();
    setDeleting(false);
    setForgotOpen(false);
    setDeleteInput('');
    onSwitchToCreate();
  };

  const capsProps = {
    onKeyDown: (e: React.KeyboardEvent) => setCapsLock(e.getModifierState('CapsLock')),
    onKeyUp: (e: React.KeyboardEvent) => setCapsLock(e.getModifierState('CapsLock')),
  };

  const tabs = useMemo(
    () =>
      [
        { id: 'password' as Method, label: 'Master password', icon: KeyRound, disabled: false, tip: null as string | null },
        { id: 'passkey' as Method, label: 'Passkey', icon: Fingerprint, disabled: !hasPasskey, tip: 'No passkey registered yet' },
        { id: 'totp' as Method, label: 'Authenticator', icon: Smartphone, disabled: !totpEnabled, tip: 'Authenticator not enabled for this vault' },
      ],
    [hasPasskey, totpEnabled],
  );

  return (
    <div className="flex flex-col">
      {/* header block */}
      <div className="flex flex-col items-center text-center">
        <VaultRing size={64}>
          <Lock className="h-6 w-6 text-kh-mint" />
        </VaultRing>
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.01em] text-kh-primary">
          <ScrambleText text="Welcome back." trigger="mount" speed={30} />
        </h3>
        <p className="mt-1.5 text-sm leading-[22px] text-kh-muted">
          Your vault is sealed. Prove it's you — choose a method.
        </p>
      </div>

      {/* failed-attempt chip / lockout notice */}
      <AnimatePresence>
        {(fails >= 2 || locked) && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'mt-4 flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                locked
                  ? 'border-kh-danger/40 bg-kh-danger/10 text-kh-danger'
                  : 'border-kh-warning/40 bg-kh-warning/10 text-kh-warning',
              )}
              role="status"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {locked
                ? `Too many attempts — unlocking is paused. Try again in ${lockRemaining}s.`
                : `${fails} failed attempts`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* method tabs */}
      <Tabs value={method} onValueChange={(v) => setMethod(v as Method)} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl border border-kh-line bg-kh-inset p-1">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              disabled={t.disabled || locked}
              title={t.disabled ? (t.tip ?? undefined) : undefined}
              className="relative rounded-lg px-2 py-2 text-xs font-medium text-kh-muted transition-colors hover:text-kh-primary data-[state=active]:bg-transparent data-[state=active]:text-kh-primary data-[state=active]:shadow-none sm:text-[13px]"
            >
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.label}</span>
              {method === t.id && !t.disabled && (
                <motion.span
                  layoutId="method-underline"
                  className="absolute inset-x-3 -bottom-[5px] h-0.5 rounded-full bg-kh-mint"
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 min-h-[280px]">
        {/* TAB 1 — master password */}
        {method === 'password' && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="kh-master-pw" className="mb-1.5 block text-sm font-medium text-kh-primary">
                Master password
              </label>
              <div className="relative">
                <input
                  ref={pwInputRef}
                  id="kh-master-pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  disabled={locked || busy}
                  aria-label="Master password"
                  autoComplete="current-password"
                  autoFocus
                  placeholder="••••••••••••"
                  {...capsProps}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    capsProps.onKeyDown(e);
                    if (e.key === 'Enter') void submitPassword();
                  }}
                  className="h-11 w-full rounded-md border border-kh-line bg-kh-inset px-3 pr-11 font-mono text-[15px] tracking-[0.02em] text-kh-primary placeholder:text-kh-faint focus:border-kh-cyan/60 focus:outline-none focus:ring-2 focus:ring-kh-cyan/25 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide master password' : 'Show master password'}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-kh-faint transition-colors hover:text-kh-primary"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AnimatePresence>
                {capsLock && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-kh-warning/40 bg-kh-warning/10 px-2.5 py-1 text-[11px] font-medium text-kh-warning"
                  >
                    <AlertTriangle className="h-3 w-3" /> Caps Lock is on
                  </motion.div>
                )}
              </AnimatePresence>
              {/* honest KDF microcopy */}
              <p className="mt-2 font-mono text-[11px] leading-4 text-kh-faint">
                {busy
                  ? 'PBKDF2-SHA256 · 600,000 iterations · deriving key…'
                  : password
                    ? 'PBKDF2-SHA256 · 600k iterations — stretching is intentional.'
                    : 'Key derived locally — it never leaves this device.'}
              </p>
              {busy && (
                <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-kh-inset">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-kh-mint/70"
                    animate={{ x: ['0%', '300%'] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}
              {error && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-kh-danger" role="alert">
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void submitPassword()}
              disabled={!password || busy || locked}
              className={cn(
                'bg-aurora flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#04110B] transition-all duration-200',
                'hover:-translate-y-px hover:shadow-glow active:scale-[0.97]',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none',
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Unlock vault
            </button>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="kh-trust"
                checked={trust}
                onCheckedChange={(v) => setTrust(v === true)}
                disabled={locked}
                className="border-kh-lineStrong"
              />
              <label
                htmlFor="kh-trust"
                title="Stored locally on this browser for 30 days. The encrypted vault itself still enforces every check."
                className="cursor-pointer select-none text-sm text-kh-muted"
              >
                Trust this device for 30 days
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="font-mono text-[13px] text-kh-cyan underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
              >
                Unlock with recovery code
              </button>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-kh-muted underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
              >
                Forgot master password?
              </button>
            </div>
          </div>
        )}

        {/* TAB 2 — passkey */}
        {method === 'passkey' && (
          <PasskeyPanel
            mode="unlock"
            disabled={locked}
            onSuccess={() => {
              localStorage.setItem(LAST_METHOD_KEY, 'passkey');
              onSuccess();
            }}
            onFallback={() => setMethod('password')}
          />
        )}

        {/* TAB 3 — authenticator */}
        {method === 'totp' && (
          <div className="flex flex-col gap-4">
            {pendingPassword ? (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-kh-primary">Authenticator code</label>
                    <TotpCountdown />
                  </div>
                  <p className="mb-3 text-sm leading-[22px] text-kh-muted">
                    {totpNotice
                      ? 'Master password verified. Now open your authenticator app (e.g. Google Authenticator) and enter the 6-digit code for KeyHaven.'
                      : 'Open your authenticator app (e.g. Google Authenticator) and enter the 6-digit code for KeyHaven.'}
                  </p>
                  <OtpInput
                    value={totpCode}
                    onChange={(v) => {
                      setTotpCode(v);
                      setTotpError(null);
                    }}
                    onComplete={(v) => void submitTotp(v)}
                    disabled={locked || totpBusy}
                    error={!!totpError}
                    shakeKey={totpShake}
                    autoFocus
                  />
                  {totpBusy && (
                    <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-kh-faint">
                      <Loader2 className="h-3 w-3 animate-spin" /> verifying…
                    </p>
                  )}
                  {totpError && (
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-kh-danger" role="alert">
                      {totpError}
                    </motion.p>
                  )}
                </div>
                <p className="font-mono text-[11px] leading-4 text-kh-faint">
                  Codes refresh every 30s · works offline
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="font-mono text-[13px] text-kh-cyan underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
                  >
                    Use a recovery code instead
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-kh-muted underline-offset-4 transition-colors hover:text-kh-primary hover:underline"
                  >
                    Lost your phone?
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <Smartphone className="h-8 w-8 text-kh-faint" />
                <p className="text-sm leading-[22px] text-kh-muted">
                  Your master password is verified first — then KeyHaven asks for
                  the 6-digit code from your authenticator app.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('password');
                    setTimeout(() => pwInputRef.current?.focus(), 60);
                  }}
                  className="rounded-full border border-kh-lineStrong px-4 py-2 text-sm font-medium text-kh-primary transition-colors hover:bg-kh-elevated"
                >
                  Enter master password
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* card footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-kh-line pt-4 text-sm">
        <span className="text-kh-muted">
          New here?{' '}
          <button type="button" onClick={onSwitchToCreate} className="font-semibold text-kh-mint underline-offset-4 hover:underline">
            Create a vault
          </button>
        </span>
        <Link to="/about" className="text-kh-muted underline-offset-4 transition-colors hover:text-kh-primary hover:underline">
          About the security
        </Link>
      </div>

      {/* forgot / recovery modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="border-kh-lineStrong bg-kh-elevated text-kh-primary sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Forgot your master password?</DialogTitle>
            <DialogDescription className="text-sm leading-[22px] text-kh-muted">
              KeyHaven is zero-knowledge: your master password never leaves this
              device, so no one — not even us — can reset or recover it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label htmlFor="kh-recovery-code" className="text-sm font-medium text-kh-primary">
              Try a recovery code
            </label>
            <div className="flex gap-2">
              <input
                id="kh-recovery-code"
                value={recoveryInput}
                onChange={(e) => {
                  setRecoveryInput(e.target.value.toUpperCase());
                  setRecoveryMsg(null);
                }}
                placeholder="XXXX-XXXX-XXXX"
                className="h-11 flex-1 rounded-md border border-kh-line bg-kh-inset px-3 font-mono text-[15px] tracking-[0.06em] text-kh-primary placeholder:text-kh-faint focus:border-kh-cyan/60 focus:outline-none focus:ring-2 focus:ring-kh-cyan/25"
              />
              <button
                type="button"
                onClick={checkRecoveryCode}
                className="rounded-md border border-kh-lineStrong px-4 text-sm font-medium text-kh-primary transition-colors hover:bg-kh-surface"
              >
                Check
              </button>
            </div>
            {recoveryMsg && <p className="text-sm leading-[22px] text-kh-warning">{recoveryMsg}</p>}
          </div>

          <div className="my-1 h-px bg-kh-line" />

          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm leading-[22px] text-kh-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-kh-danger" />
              Start over — permanently wipes the encrypted vault on this device.
              Without the password its contents are already unreadable; this
              just deletes them.
            </p>
            <div className="flex gap-2">
              <input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder='Type DELETE to confirm'
                aria-label='Type DELETE to confirm vault deletion'
                className="h-11 flex-1 rounded-md border border-kh-danger/40 bg-kh-inset px-3 font-mono text-[15px] text-kh-danger placeholder:text-kh-faint focus:border-kh-danger focus:outline-none focus:ring-2 focus:ring-kh-danger/25"
              />
              <button
                type="button"
                onClick={() => void startOver()}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="rounded-md border border-kh-danger/50 px-4 text-sm font-semibold text-kh-danger transition-colors hover:bg-kh-danger hover:text-[#1A0508] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-kh-danger"
              >
                {deleting ? 'Wiping…' : 'Delete vault'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}