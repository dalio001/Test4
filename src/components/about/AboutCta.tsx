/**
 * About §7 — Final CTA (50vh). "Now you know the trick: there is no trick —
 * just math, on your machine." Aurora glow bloom; buttons rise staggered.
 */

import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ScrambleText from '@/components/ScrambleText';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AboutCta() {
  const navigate = useNavigate();
  return (
    <section className="relative flex min-h-[50dvh] items-center justify-center overflow-hidden border-t border-kh-line">
      {/* aurora glow bloom */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(700px circle at 50% 45%, rgba(53,240,161,.07), transparent 60%), radial-gradient(560px circle at 50% 60%, rgba(139,124,255,.06), transparent 62%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[860px] px-6 py-20 text-center">
        <h2 className="text-display-lg text-kh-primary">
          <ScrambleText text="Now you know the trick:" />
          <br />
          <span className="text-aurora">
            <ScrambleText text="there is no trick — just math, on your machine." delay={400} />
          </span>
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/unlock?mode=create')}
            className="bg-aurora group flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-[#04110B] transition-all duration-200 hover:-translate-y-px hover:shadow-glow active:scale-[0.97]"
          >
            Create your vault
            <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={() => navigate('/unlock')}
            className="rounded-full border border-kh-lineStrong px-7 py-3.5 text-base font-medium text-kh-primary transition-all duration-200 hover:-translate-y-px hover:bg-kh-elevated active:scale-[0.97]"
          >
            Unlock existing vault
          </button>
        </motion.div>
      </div>
    </section>
  );
}
