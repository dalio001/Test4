/**
 * About §4 — "Two views of the same vault." Left: the clean login card only
 * the owner ever sees. Right: the raw ciphertext blob that is literally all
 * anyone else (KeyHaven included) could ever read. Lock glyph draws between
 * the columns; the ciphertext side glitches like static.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import LetterAvatar from '@/components/LetterAvatar';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const CIPHER_BLOB =
  '{"v":1,"kdf":{"name":"PBKDF2","iter":600000},"salt":"8F2E11AA0C","iv":"9f2c77b1","ct":"A91F4C77B2E3900BE399AA41F27C10D86E550377AA02C19BD468F0C512AD…(1.2KB)"}';
const GLITCH_CHARS = 'ABCDEF0123456789abcdef$#%&';

/** Cipher blob with occasional single-character static flicker (3s / 80ms). */
function GlitchBlob() {
  const [text, setText] = useState(CIPHER_BLOB);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let restore: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      const idx = 20 + Math.floor(Math.random() * (CIPHER_BLOB.length - 40));
      setText(CIPHER_BLOB.slice(0, idx) + GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] + CIPHER_BLOB.slice(idx + 1));
      restore = setTimeout(() => setText(CIPHER_BLOB), 80);
    }, 3000);
    return () => {
      clearInterval(interval);
      if (restore) clearTimeout(restore);
    };
  }, []);

  return (
    <code className="block break-all font-mono text-[13px] leading-7 text-kh-faint">{text}</code>
  );
}

export default function TwoViews() {
  return (
    <section className="border-t border-kh-line py-24 md:py-28">
      <div className="mx-auto max-w-marketing px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="font-display text-[40px] font-bold leading-[48px] tracking-[-0.02em] text-kh-primary"
        >
          Two views of the same vault.
        </motion.h2>

        <div className="relative mt-12 grid gap-6 md:grid-cols-2">
          {/* lock glyph between columns */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40%' }}
            transition={{ duration: 0.5, ease: EASE }}
            aria-hidden
            className="absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-kh-mint/40 bg-kh-base shadow-glow md:flex"
          >
            <Lock className="h-5 w-5 text-kh-mint" />
          </motion.div>

          {/* YOU SEE */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden rounded-2xl border border-kh-mint/25 bg-kh-surface shadow-card"
          >
            <div className="flex items-center gap-2 border-b border-kh-mint/20 bg-kh-mint/5 px-5 py-3">
              <Eye className="h-4 w-4 text-kh-mint" />
              <span className="font-mono text-xs font-medium tracking-[0.18em] text-kh-mint">YOU SEE</span>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-kh-line bg-kh-inset p-4">
                <div className="flex items-center gap-3">
                  <LetterAvatar name="GitHub" size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-kh-primary">GitHub</p>
                    <p className="truncate text-xs text-kh-faint">alex@dev.io</p>
                  </div>
                  <span className="rounded-full border border-kh-violet/40 bg-kh-violet/10 px-2.5 py-0.5 text-[11px] font-medium text-kh-violet">
                    work
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-kh-base px-3 py-2.5">
                  <span className="font-mono text-sm tracking-wider text-kh-primary">
                    correct-horse-battery
                  </span>
                  <EyeOff className="h-3.5 w-3.5 text-kh-faint" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-kh-mint" />
                  <span className="text-xs text-kh-mint">2FA on</span>
                  <span className="text-xs text-kh-faint">· strong password</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ANYONE ELSE SEES */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden rounded-2xl border border-kh-danger/25 bg-kh-surface shadow-card"
          >
            <div className="flex items-center gap-2 border-b border-kh-danger/20 bg-kh-danger/5 px-5 py-3">
              <EyeOff className="h-4 w-4 text-kh-danger" />
              <span className="font-mono text-xs font-medium tracking-[0.18em] text-kh-danger">
                ANYONE ELSE SEES
              </span>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-kh-line bg-kh-inset p-4">
                <GlitchBlob />
              </div>
              <p className="mt-3 font-mono text-[11px] leading-5 text-kh-faint">
                indistinguishable from random noise without the key
              </p>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-8 max-w-[58ch] text-center text-sm leading-6 text-kh-muted"
        >
          Same vault. The right column is the only thing that ever exists on disk — even we
          couldn’t turn it into the left.
        </motion.p>
      </div>
    </section>
  );
}
