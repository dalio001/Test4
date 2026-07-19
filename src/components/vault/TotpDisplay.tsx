/**
 * TotpDisplay — live 6-digit TOTP code with a 30s VaultRing countdown.
 * Digits render grouped `123 456` and flip-animate on refresh. Includes a
 * copy button wired to the vault clipboard auto-clear.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy } from 'lucide-react';
import VaultRing from '@/components/VaultRing';
import { getTotpCode } from '@/lib/totp';
import { useVault } from '@/providers/VaultProvider';
import { cn } from '@/lib/utils';

export default function TotpDisplay({
  secret,
  compact = false,
  className,
}: {
  secret: string;
  compact?: boolean;
  className?: string;
}) {
  const { copyWithAutoClear } = useVault();
  const [code, setCode] = useState('------');
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    let alive = true;
    const update = async () => {
      try {
        const r = await getTotpCode(secret);
        if (alive) {
          setCode(r.code);
          setSecondsLeft(r.secondsLeft);
        }
      } catch {
        if (alive) setCode('------');
      }
    };
    void update();
    const iv = setInterval(() => void update(), 1000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [secret]);

  const grouped = `${code.slice(0, 3)} ${code.slice(3)}`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0">
        <VaultRing size={compact ? 40 : 48} progress={secondsLeft / 30} muted={secondsLeft <= 5}>
          <span
            className={cn(
              'font-mono text-[11px] font-medium tabular-nums',
              secondsLeft <= 5 ? 'text-kh-danger' : 'text-kh-mint',
            )}
          >
            {secondsLeft}
          </span>
        </VaultRing>
      </div>
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={code}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'block font-mono font-medium tracking-[0.14em] text-kh-primary',
              compact ? 'text-lg' : 'text-xl',
            )}
            aria-label={`Two-factor code ${grouped}`}
          >
            {grouped}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        aria-label="Copy two-factor code"
        onClick={() => void copyWithAutoClear(code.replace(/\s/g, ''), '2FA code')}
        className="shrink-0 rounded-lg border border-kh-line bg-kh-inset p-2 text-kh-muted transition-all hover:-translate-y-px hover:border-kh-lineStrong hover:text-kh-primary"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}