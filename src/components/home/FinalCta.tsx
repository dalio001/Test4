/**
 * Home §9 — Final CTA (60vh). security-shield.png floats behind centered
 * content; headline scrambles in; aurora glow intensifies on entry.
 */

import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ScrambleText from '@/components/ScrambleText';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function FinalCta() {
  const navigate = useNavigate();
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden border-t border-kh-line">
      {/* aurora glow that intensifies on entry */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(640px circle at 50% 42%, rgba(56,225,255,.08), transparent 62%)',
        }}
      />
      {/* floating shield */}
      <motion.img
        src="/security-shield.png"
        alt=""
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.5 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[min(42vw,420px)] -translate-x-1/2 -translate-y-1/2 animate-float"
      />

      <div className="relative z-10 mx-auto max-w-[760px] px-6 text-center">
        <h2 className="text-display-lg text-kh-primary">
          <ScrambleText text="Your logins deserve a vault." />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
          className="mt-4 text-lg text-kh-muted"
        >
          Free forever. Encrypted always. Only yours.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/unlock?mode=create')}
            className="bg-aurora group flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-[#04110B] transition-transform duration-200 hover:-translate-y-px hover:shadow-glow active:scale-[0.97]"
          >
            Create your vault
            <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={() => navigate('/about')}
            className="rounded-full border border-kh-lineStrong px-7 py-3.5 text-base font-medium text-kh-primary transition-all duration-200 hover:-translate-y-px hover:bg-kh-elevated active:scale-[0.97]"
          >
            See how it works
          </button>
        </motion.div>
      </div>
    </section>
  );
}
