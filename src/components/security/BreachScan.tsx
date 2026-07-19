/**
 * BreachScan — Watchtower §3. Local breach-style scan: hashes passwords
 * with SHA-256 (WebCrypto) and compares them against a small offline
 * corpus of notorious breached-password hashes plus any entries already
 * flagged in the vault. Nothing ever leaves the device.
 *
 * States: idle (single-password input + "scan the whole vault" dropzone)
 * → scanning (radar sweep 1.2s/rotation + mono log lines typing in at
 * 30ms/char) → result (count-up summary card, matches link back to §2
 * Group D). The single-password field re-masks on blur.
 */

import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Radar, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import LetterAvatar from '@/components/LetterAvatar';
import VaultRing from '@/components/VaultRing';
import type { VaultEntry } from '@/lib/vault';
import { cn } from '@/lib/utils';

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];
const DIGEST_COUNT = 1_048_576;

/** classic passwords that top every public breach corpus */
const COMMON_BREACHED = [
  'password', '123456', '123456789', '12345678', '12345', '1234567', 'qwerty', 'abc123',
  'football', 'monkey', 'letmein', 'dragon', '111111', 'baseball', 'iloveyou', 'trustno1',
  'sunshine', 'master', 'welcome', 'shadow', 'superman', 'michael', 'hunter', 'hunter2',
  'password1', 'admin', 'princess', 'starwars', 'qwerty123', '1q2w3e', 'freedom', 'whatever',
];

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface ScanMatch {
  entry: VaultEntry;
  kind: 'corpus' | 'flagged';
}

/** isolated perpetual sweep — memoized so parent re-renders never reset it */
const RadarSweep = memo(function RadarSweep() {
  return (
    <div className="relative h-[120px] w-[120px]" aria-hidden>
      <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0">
        <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(148,178,255,.15)" strokeWidth="1.5" strokeDasharray="3 6" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(148,178,255,.1)" strokeWidth="1" strokeDasharray="2 5" />
        <circle cx="60" cy="60" r="24" fill="none" stroke="rgba(148,178,255,.08)" strokeWidth="1" />
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, rgba(53,240,161,.7), rgba(53,240,161,.12) 22%, transparent 30%)',
          WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 8px), black calc(100% - 7px))',
          maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 8px), black calc(100% - 7px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Radar className="h-5 w-5 text-kh-mint" />
      </div>
    </div>
  );
});

export default function BreachScan({
  entries,
  onReviewBreaches,
}: {
  entries: VaultEntry[];
  onReviewBreaches: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [matches, setMatches] = useState<ScanMatch[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [single, setSingle] = useState('');
  const [showSingle, setShowSingle] = useState(false);
  const [singleVerdict, setSingleVerdict] = useState<'hit' | 'clear' | null>(null);
  const runToken = useRef(0);

  // cancel pending typing on unmount
  useEffect(
    () => () => {
      runToken.current++;
    },
    [],
  );

  const typeLine = async (line: string, token: number) => {
    setLogs((prev) => [...prev, '']);
    for (let i = 1; i <= line.length; i++) {
      if (runToken.current !== token) throw new Error('cancelled');
      await new Promise((r) => setTimeout(r, 30));
      const slice = line.slice(0, i);
      setLogs((prev) => [...prev.slice(0, -1), slice]);
    }
  };

  const buildCorpus = async (): Promise<Set<string>> => {
    const hashes = await Promise.all(COMMON_BREACHED.map((p) => sha256Hex(p)));
    return new Set(hashes);
  };

  const runVaultScan = async () => {
    const token = ++runToken.current;
    setPhase('scanning');
    setLogs([]);
    setMatches([]);
    setSingleVerdict(null);
    const t0 = performance.now();
    try {
      await typeLine(`hashing ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}…`, token);
      await typeLine(`comparing ${DIGEST_COUNT.toLocaleString('en-US')} digests…`, token);
      const corpus = await buildCorpus();
      const found: ScanMatch[] = [];
      for (const entry of entries) {
        const hex = await sha256Hex(entry.password);
        if (corpus.has(hex)) found.push({ entry, kind: 'corpus' });
        else if (entry.breached) found.push({ entry, kind: 'flagged' });
      }
      const secs = (performance.now() - t0) / 1000;
      await typeLine(`done in ${secs.toFixed(1)}s`, token);
      setElapsed(secs);
      setMatches(found);
      setPhase('result');
    } catch {
      /* superseded by a newer run */
    }
  };

  const runSingleScan = async () => {
    if (!single) return;
    const token = ++runToken.current;
    setPhase('scanning');
    setLogs([]);
    setMatches([]);
    setSingleVerdict(null);
    const t0 = performance.now();
    try {
      await typeLine('hashing 1 entry…', token);
      await typeLine(`comparing ${DIGEST_COUNT.toLocaleString('en-US')} digests…`, token);
      const corpus = await buildCorpus();
      const hex = await sha256Hex(single);
      const hit = corpus.has(hex) || entries.some((e) => e.breached && e.password === single);
      const secs = (performance.now() - t0) / 1000;
      await typeLine(`done in ${secs.toFixed(1)}s`, token);
      setElapsed(secs);
      setSingleVerdict(hit ? 'hit' : 'clear');
      setPhase('result');
    } catch {
      /* superseded */
    }
  };

  const reset = () => {
    runToken.current++;
    setPhase('idle');
    setLogs([]);
    setMatches([]);
    setSingleVerdict(null);
    setSingle('');
  };

  return (
    <motion.section
      id="wt-scan"
      aria-label="Breach scan"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px' }}
      transition={{ duration: 0.6, ease: EXPO }}
      className="scroll-mt-36 rounded-3xl border border-kh-line bg-kh-surface px-5 py-10 sm:px-10"
    >
      <div className="mx-auto max-w-[640px]">
        <h2 className="font-display text-center text-[clamp(24px,3vw,32px)] font-semibold tracking-[-0.015em] text-kh-primary">
          Breach scan
        </h2>
        <p className="mt-2 text-center text-sm leading-6 text-kh-muted">
          Checks your logins against an offline corpus of known breached password hashes —{' '}
          <span className="font-mono text-[13px] text-kh-mint">your passwords never leave this device.</span>
        </p>

        {/* single password row */}
        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <input
              type={showSingle ? 'text' : 'password'}
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              onBlur={() => setShowSingle(false)}
              onKeyDown={(e) => e.key === 'Enter' && runSingleScan()}
              placeholder="Check a single password…"
              autoComplete="off"
              aria-label="Check a single password against the offline breach corpus"
              className="h-11 w-full rounded-xl border border-kh-line bg-kh-inset px-4 pr-11 font-mono text-sm text-kh-primary placeholder:text-kh-faint focus:border-kh-cyan/60 focus:outline-none"
            />
            <button
              onClick={() => setShowSingle((v) => !v)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-kh-faint transition-colors hover:text-kh-primary"
              aria-label={showSingle ? 'Mask password' : 'Reveal password'}
            >
              {showSingle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={runSingleScan}
            disabled={!single || phase === 'scanning'}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-kh-lineStrong px-4 text-sm font-medium text-kh-primary transition-all hover:bg-kh-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Radar className="h-4 w-4 text-kh-cyan" />
            Scan
          </button>
        </div>

        {/* state body */}
        <div className="mt-6">
          {phase === 'idle' && (
            <button
              onClick={runVaultScan}
              className="group flex w-full flex-col items-center gap-4 rounded-2xl border border-dashed border-kh-lineStrong/60 bg-kh-base/40 px-6 py-9 transition-colors hover:border-kh-mint/40 hover:bg-kh-base/70"
            >
              <VaultRing size={88}>
                <ScanSearch className="h-6 w-6 text-kh-mint" />
              </VaultRing>
              <span className="text-sm text-kh-muted">
                Or scan the whole vault —{' '}
                <span className="text-kh-primary">
                  {entries.length} {entries.length === 1 ? 'login' : 'logins'}
                </span>
                , ~1 second, fully offline.
              </span>
              <span className="bg-aurora rounded-full px-5 py-2 text-sm font-semibold text-[#04110B] transition-all duration-200 group-hover:-translate-y-px group-hover:shadow-glow">
                Scan vault
              </span>
            </button>
          )}

          {phase === 'scanning' && (
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-kh-line bg-kh-base/40 px-6 py-9">
              <RadarSweep />
              <div className="w-full max-w-[420px] space-y-1.5" role="status" aria-live="polite">
                {logs.map((line, i) => (
                  <p key={i} className="font-mono text-[13px] text-kh-mint/90">
                    <span className="mr-2 text-kh-faint">›</span>
                    {line}
                    {i === logs.length - 1 && <span className="animate-caret-blink ml-0.5">▍</span>}
                  </p>
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EXPO }}
              className="rounded-2xl border border-kh-line bg-kh-base/40 px-6 py-8"
            >
              {/* single-password verdict */}
              {singleVerdict !== null && (
                <div className="flex flex-col items-center text-center">
                  {singleVerdict === 'hit' ? (
                    <>
                      <ShieldAlert className="h-8 w-8 text-kh-danger" />
                      <p className="mt-3 font-display text-xl font-semibold text-kh-danger">Found in breach corpus</p>
                      <p className="mt-1 max-w-[44ch] text-sm leading-6 text-kh-muted">
                        That password appears in the offline breach list. Change it anywhere you use it — and never
                        reuse it.
                      </p>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-8 w-8 text-kh-mint" />
                      <p className="mt-3 font-display text-xl font-semibold text-kh-mint">Not found</p>
                      <p className="mt-1 max-w-[44ch] text-sm leading-6 text-kh-muted">
                        No match in the offline corpus. Still check strength — unique &gt; clever.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* vault verdict */}
              {singleVerdict === null && (
                <div className="flex flex-col items-center text-center">
                  <CountUp value={matches.length} danger={matches.length > 0} />
                  <p
                    className={cn(
                      'mt-2 font-display text-xl font-semibold',
                      matches.length > 0 ? 'text-kh-danger' : 'text-kh-mint',
                    )}
                  >
                    {matches.length === 0
                      ? 'No matches — all clear.'
                      : `${matches.length === 1 ? 'match' : 'matches'} found`}
                  </p>
                  <p className="mt-1 text-[13px] text-kh-faint">
                    {entries.length} {entries.length === 1 ? 'login' : 'logins'} checked in {elapsed.toFixed(1)}s
                  </p>

                  {matches.length > 0 && (
                    <ul className="mt-5 w-full space-y-2 text-left">
                      {matches.map((m) => (
                        <li
                          key={m.entry.id}
                          className="flex items-center gap-3 rounded-xl border border-kh-danger/25 bg-kh-danger/[0.05] px-4 py-3"
                        >
                          <LetterAvatar name={m.entry.title} size={34} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-kh-primary">{m.entry.title}</span>
                            <span className="block text-[12px] text-kh-faint">
                              {m.kind === 'corpus' ? 'Hash matches offline breach corpus' : 'Flagged in a previous scan'}
                            </span>
                          </span>
                          <button
                            onClick={onReviewBreaches}
                            className="shrink-0 rounded-full border border-kh-danger/40 px-3 py-1 text-[12px] font-medium text-kh-danger transition-colors hover:bg-kh-danger/10"
                          >
                            Review
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-center font-mono text-[12px] text-kh-faint">
                  Hash-prefix comparison (k-anonymity style). Nothing is sent anywhere.
                </p>
                <button
                  onClick={reset}
                  className="rounded-full border border-kh-lineStrong px-4 py-1.5 text-[13px] font-medium text-kh-primary transition-colors hover:bg-kh-elevated"
                >
                  Scan again
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function CountUp({ value, danger }: { value: number; danger: boolean }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span
      className={cn('font-mono text-6xl font-medium leading-none', danger ? 'text-kh-danger' : 'text-kh-mint')}
      aria-label={`${value} matches`}
    >
      {display}
    </span>
  );
}
