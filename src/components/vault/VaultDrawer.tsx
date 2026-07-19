/**
 * VaultDrawer — shared right-side drawer shell (440px, bg-elevated) with
 * blurred overlay. Slides in with ease-in-out-quint 300ms; overlay fades
 * 200ms (design.md §6.4). Used by the detail and add/edit drawers.
 */

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const QUINT = [0.83, 0, 0.17, 1] as [number, number, number, number];

export default function VaultDrawer({
  open,
  onClose,
  labelledBy,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-kh-base/60 backdrop-blur-[4px]"
            aria-hidden
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ duration: 0.3, ease: QUINT }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-kh-lineStrong bg-kh-elevated shadow-drawer"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-kh-muted transition-all duration-200 hover:rotate-90 hover:bg-kh-surface hover:text-kh-primary"
            >
              <X size={18} />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="shrink-0 border-t border-kh-line p-4">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}