/**
 * About §1 — Hero (80vh). security-shield.png floats (opacity .6) behind
 * centered content; headline scrambles in word batches; aurora glow; scroll
 * cue line.
 */

import { motion } from 'framer-motion';
import ScrambleText from '@/components/ScrambleText';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AboutHero() {
  return (
    <section className="relative flex min-h-[80dvh] items-center justify-center overflow-hidden">
      {/* aurora glow */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(720px circle at 50% 30%, rgba(56,225,255,.07), transparent 62%), radial-gradient(560px circle at 78% 12%, rgba(139,124,255,.06), transparent 60%)',
        }}
      />
      {/* floating shield behind text */}
      <motion.img
        src="/security-shield.png"
        alt=""
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.6, duration: 1.2 }}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[min(70vw,480px)] -translate-x-1/2 -translate-y-1/2 animate-float"
      />

      <div className="relative z-10 mx-auto max-w-[860px] px-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="font-mono text-eyebrow text-kh-mint"
        >
          THE SECURITY MODEL
        </motion.p>
        <h1 className="mt-5 text-display-lg text-kh-primary">
          <ScrambleText text="Security you can verify," trigger="mount" delay={150} />
          <br />
          <span className="text-aurora">
            <ScrambleText text="not just trust." trigger="mount" delay={650} />
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
          className="mx-auto mt-6 max-w-[60ch] text-lg leading-[30px] text-kh-muted"
        >
          KeyHaven is built on one rule: your passwords are encrypted on your device, and only
          your device. Scroll — we’ll show you exactly what that means, in plain language.
        </motion.p>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        aria-hidden
        className="absolute bottom-8 left-1/2 h-14 w-px -translate-x-1/2 overflow-hidden"
      >
        <span className="block h-full w-full animate-scroll-cue bg-gradient-to-b from-kh-mint to-transparent" />
      </motion.div>
    </section>
  );
}
