/**
 * Settings → Security methods → "Your locks" overview hero.
 * Three lock-status rows (master password / passkey / authenticator) plus an
 * overall protection chip; actions scroll to (and expand) the target card.
 */

import { Fingerprint, KeyRound, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVault } from '@/providers/VaultProvider';
import { EASE, KhButton, SectionCard, StatusChip } from './ui';

function scrollToCard(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export default function LocksOverviewCard({ onChangePassword }: { onChangePassword: () => void }) {
  const { passkeys, totpEnabled } = useVault();

  const rows = [
    {
      icon: KeyRound,
      name: 'Master password',
      status: <StatusChip tone="mint">Set · strong</StatusChip>,
      action: (
        <KhButton variant="ghost" className="px-3 py-1.5 text-xs" onClick={onChangePassword}>
          Change
        </KhButton>
      ),
    },
    {
      icon: Fingerprint,
      name: passkeys.length === 1 ? 'Passkey' : 'Passkeys',
      status:
        passkeys.length > 0 ? (
          <StatusChip tone="mint">{passkeys.length} registered</StatusChip>
        ) : (
          <StatusChip tone="faint">None yet</StatusChip>
        ),
      action: (
        <KhButton variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => scrollToCard('passkeys')}>
          Manage
        </KhButton>
      ),
    },
    {
      icon: Smartphone,
      name: 'Authenticator app (TOTP)',
      status: totpEnabled ? (
        <StatusChip tone="mint">Enabled</StatusChip>
      ) : (
        <StatusChip tone="faint">Not set up</StatusChip>
      ),
      action: (
        <KhButton variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => scrollToCard('totp')}>
          Manage
        </KhButton>
      ),
    },
  ];

  const locks = 1 + (passkeys.length > 0 ? 1 : 0) + (totpEnabled ? 1 : 0);
  const verdict = locks >= 3 ? 'Excellent' : locks === 2 ? 'Good' : 'Fair';

  return (
    <SectionCard
      className="rounded-3xl"
      headerAction={
        <span className="border-aurora rounded-full border px-3.5 py-1.5 text-xs font-medium text-kh-primary">
          Vault protection: <span className="text-aurora font-semibold">{verdict}</span>
        </span>
      }
    >
      <div className="-mt-2 divide-y divide-kh-line">
        {rows.map((row, i) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 * i + 0.05, duration: 0.45, ease: EASE }}
              className="flex items-center gap-3 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kh-line bg-kh-inset">
                <Icon className="h-4 w-4 text-kh-cyan" />
              </span>
              <span className="flex-1 text-sm font-medium text-kh-primary">{row.name}</span>
              {row.status}
              {row.action}
            </motion.div>
          );
        })}
      </div>
    </SectionCard>
  );
}
