/**
 * PageStub — branded placeholder for routes whose pages ship from other
 * agents. Keeps the scaffold navigable end-to-end while making ownership
 * of the final page obvious.
 */

import { Link } from 'react-router';
import type { ReactNode } from 'react';
import VaultRing from '@/components/VaultRing';

export default function PageStub({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[720px] flex-col items-center justify-center px-6 py-20 text-center">
      <VaultRing size={96} muted>
        {icon}
      </VaultRing>
      <span className="mt-6 rounded-full border border-kh-line bg-kh-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-kh-faint">
        Under construction
      </span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.02em] text-kh-primary">{title}</h1>
      <p className="mt-3 max-w-[52ch] leading-[26px] text-kh-muted">{description}</p>
      {children}
      <div className="mt-8 flex gap-3">
        <Link
          to="/"
          className="rounded-full border border-kh-lineStrong px-5 py-2.5 text-sm font-medium text-kh-primary transition-colors hover:bg-kh-elevated"
        >
          ← Back home
        </Link>
        <Link
          to="/unlock"
          className="bg-aurora rounded-full px-5 py-2.5 text-sm font-semibold text-[#04110B] transition-transform hover:-translate-y-px"
        >
          Go to unlock
        </Link>
      </div>
    </div>
  );
}
