/**
 * RecipeCard — "Recipe" controls (design/generator.md §2 Card A).
 * Password: length slider (8–64) + charset toggles + exclude look-alikes.
 * Passphrase: words slider (3–8) + separator select + capitalize toggle.
 * PIN: digits slider (4–12). Controls cross-slide 200ms on mode switch.
 * Built on Radix primitives, styled to Obsidian Vault tokens.
 */

import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GenMode, RecipeState } from './genUtils';

/* ------------------------------ atoms ------------------------------ */

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-kh-primary">{label}</span>
        <span className="rounded-md border border-kh-line bg-kh-inset px-2 py-0.5 font-mono text-[13px] font-semibold text-kh-mint">
          {value}
        </span>
      </div>
      <SliderPrimitive.Root
        className="relative mt-3 flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        aria-label={ariaLabel}
      >
        <SliderPrimitive.Track className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-kh-inset">
          <SliderPrimitive.Range className="bg-aurora absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-5 w-5 cursor-grab rounded-full border-2 border-kh-mint bg-kh-base shadow-card transition-shadow duration-200 hover:shadow-glow focus-visible:shadow-glow active:cursor-grabbing active:shadow-glow"
          aria-label={ariaLabel}
        />
      </SliderPrimitive.Root>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-kh-faint">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sample,
  helper,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sample?: string;
  helper?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-kh-line py-3 first:border-t-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-kh-primary">{label}</span>
          {sample && <span className="font-mono text-xs text-kh-cyan">{sample}</span>}
        </div>
        {helper && <p className="mt-0.5 text-xs leading-5 text-kh-faint">{helper}</p>}
      </div>
      <SwitchPrimitive.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          'data-[state=checked]:border-kh-mint/60 data-[state=checked]:bg-kh-mint/20',
          'data-[state=unchecked]:border-kh-lineStrong data-[state=unchecked]:bg-kh-inset',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        <SwitchPrimitive.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-kh-faint transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-kh-mint data-[state=checked]:shadow-[0_0_12px_rgba(53,240,161,.45)]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

const SEPARATORS: { value: string; label: string; name: string }[] = [
  { value: '-', label: '-', name: 'hyphen' },
  { value: '.', label: '.', name: 'dot' },
  { value: '_', label: '_', name: 'underscore' },
  { value: ' ', label: '␣', name: 'space' },
];

/* ------------------------------ card ------------------------------ */

export default function RecipeCard({
  mode,
  recipe,
  onChange,
}: {
  mode: GenMode;
  recipe: RecipeState;
  onChange: (patch: Partial<RecipeState>) => void;
}) {
  const enabledCharsets = [recipe.upper, recipe.lower, recipe.digits, recipe.symbols].filter(
    Boolean,
  ).length;

  return (
    <div className="rounded-2xl border border-kh-line bg-kh-surface p-6 shadow-card sm:p-7">
      <h3 className="font-display text-lg font-semibold text-kh-primary">Recipe</h3>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5"
        >
          {mode === 'password' && (
            <div>
              <SliderRow
                label="Length"
                value={recipe.length}
                min={8}
                max={64}
                onChange={(length) => onChange({ length })}
                ariaLabel="Password length"
              />
              <div className="mt-4">
                <ToggleRow
                  label="Uppercase"
                  sample="A-Z"
                  checked={recipe.upper}
                  disabled={recipe.upper && enabledCharsets === 1}
                  onChange={(upper) => onChange({ upper })}
                />
                <ToggleRow
                  label="Lowercase"
                  sample="a-z"
                  checked={recipe.lower}
                  disabled={recipe.lower && enabledCharsets === 1}
                  onChange={(lower) => onChange({ lower })}
                />
                <ToggleRow
                  label="Digits"
                  sample="0-9"
                  checked={recipe.digits}
                  disabled={recipe.digits && enabledCharsets === 1}
                  onChange={(digits) => onChange({ digits })}
                />
                <ToggleRow
                  label="Symbols"
                  sample="!@#$…"
                  checked={recipe.symbols}
                  disabled={recipe.symbols && enabledCharsets === 1}
                  onChange={(symbols) => onChange({ symbols })}
                />
                <ToggleRow
                  label="Exclude look-alikes"
                  sample="l 1 I O 0"
                  helper="Skips characters that are easy to confuse when reading aloud."
                  checked={recipe.excludeLookalikes}
                  onChange={(excludeLookalikes) => onChange({ excludeLookalikes })}
                />
              </div>
            </div>
          )}

          {mode === 'passphrase' && (
            <div>
              <SliderRow
                label="Words"
                value={recipe.words}
                min={3}
                max={8}
                onChange={(words) => onChange({ words })}
                ariaLabel="Word count"
              />
              <div className="mt-5">
                <span className="text-sm font-medium text-kh-primary">Separator</span>
                <div className="mt-2 flex gap-2" role="group" aria-label="Word separator">
                  {SEPARATORS.map((sep) => (
                    <button
                      key={sep.name}
                      type="button"
                      onClick={() => onChange({ separator: sep.value })}
                      aria-pressed={recipe.separator === sep.value}
                      aria-label={`Separate words with ${sep.name}`}
                      className={cn(
                        'h-10 min-w-11 flex-1 rounded-lg border font-mono text-sm transition-all duration-150 active:scale-95',
                        recipe.separator === sep.value
                          ? 'border-kh-mint/60 bg-kh-mint/10 text-kh-mint'
                          : 'border-kh-line bg-kh-inset text-kh-muted hover:border-kh-lineStrong hover:text-kh-primary',
                      )}
                    >
                      {sep.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <ToggleRow
                  label="Capitalize words"
                  sample="Otter"
                  helper="Adds a capital letter and a trailing digit for sites with complexity rules."
                  checked={recipe.capitalize}
                  onChange={(capitalize) => onChange({ capitalize })}
                />
              </div>
              <p className="mt-4 rounded-xl border border-kh-line bg-kh-inset px-4 py-3 font-mono text-[13px] leading-5 text-kh-muted">
                e.g. <span className="text-kh-primary">crimson-otter-velvet-piano</span>
              </p>
            </div>
          )}

          {mode === 'pin' && (
            <div>
              <SliderRow
                label="Digits"
                value={recipe.pinLength}
                min={4}
                max={12}
                onChange={(pinLength) => onChange({ pinLength })}
                ariaLabel="PIN length"
              />
              <p className="mt-4 rounded-xl border border-kh-line bg-kh-inset px-4 py-3 text-[13px] leading-5 text-kh-faint">
                PINs are digits only — great for device locks. For online accounts, prefer a
                full password.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
