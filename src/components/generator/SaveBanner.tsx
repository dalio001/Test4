/**
 * SaveBanner — "Found the one?" inline CTA (design/generator.md §4).
 * Aurora 1px border: a conic gradient rotating slowly (6s) behind a padded
 * surface. Rises in at 20% viewport. Button hands off to the vault add flow.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, KeyRound } from 'lucide-react';

export default function SaveBanner({ onSave }: { onSave: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Save to vault"
    >
      <div className="relative overflow-hidden rounded-2xl p-px shadow-card">
        {/* rotating aurora border */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-center">
          {reduce ? (
            <div
              className="h-[200%] w-[200%]"
              style={{
                background: 'conic-gradient(from 0deg, #35F0A1, #38E1FF 35%, #8B7CFF 70%, #35F0A1)',
              }}
            />
          ) : (
            <motion.div
              className="aspect-square w-[240%] max-w-none"
              style={{
                background: 'conic-gradient(from 0deg, #35F0A1, #38E1FF 35%, #8B7CFF 70%, #35F0A1)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>

        <div className="relative flex flex-col items-start gap-4 rounded-[19px] bg-kh-surface px-6 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-kh-mint/30 bg-kh-mint/10">
            <KeyRound className="h-5 w-5 text-kh-mint" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg font-semibold text-kh-primary">Found the one?</h4>
            <p className="mt-0.5 text-sm leading-6 text-kh-muted">
              Save it straight into your vault — title, site and username, done.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="bg-aurora group flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#04110B] transition-all duration-200 hover:-translate-y-px hover:shadow-glow active:scale-[0.97]"
          >
            Save to vault
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
