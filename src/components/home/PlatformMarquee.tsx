/**
 * Home §2 — Platform marquee. Two infinite rows (opposite directions,
 * 40s/52s, pause on hover) of letter-avatar platform chips; 80px edge fade.
 */

import { motion } from 'framer-motion';
import LetterAvatar from '@/components/LetterAvatar';

const ROW_1 = ['Google', 'Netflix', 'GitHub', 'Amazon', 'Spotify', 'Instagram', 'Chase', 'PayPal', 'Discord', 'Dropbox'];
const ROW_2 = ['Figma', 'Notion', 'LinkedIn', 'X', 'Reddit', 'Airbnb', 'Steam', 'Slack', 'Binance', 'Adobe'];

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function Chip({ name }: { name: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5 rounded-full border border-kh-line bg-kh-surface px-4 py-2 text-sm text-kh-muted transition-colors duration-200 hover:border-kh-lineStrong hover:text-kh-primary">
      <LetterAvatar name={name} size={22} />
      {name}
    </span>
  );
}

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="mask-fade-x group overflow-hidden">
      <div
        className={`flex w-max gap-4 py-2 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} group-hover:[animation-play-state:paused]`}
      >
        {doubled.map((name, i) => (
          <Chip key={`${name}-${i}`} name={name} />
        ))}
      </div>
    </div>
  );
}

export default function PlatformMarquee() {
  return (
    <section className="border-y border-kh-line bg-kh-surface/50 py-8">
      <div className="mx-auto max-w-marketing px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-center text-sm text-kh-faint"
        >
          One home for every login you juggle —
        </motion.p>
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <MarqueeRow items={ROW_1} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <MarqueeRow items={ROW_2} reverse />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
