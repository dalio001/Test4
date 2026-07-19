/**
 * LetterAvatar — first-letter avatar for vault entries / platform chips.
 * Background color hashed from the name into a curated 8-color dark-safe
 * palette (design.md §9). No third-party logos needed anywhere.
 */

import { cn } from '@/lib/utils';

const PALETTE = ['#35F0A1', '#38E1FF', '#8B7CFF', '#FFB84D', '#FF7AB8', '#7CE3F7', '#A3E635', '#F2A35E'];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function LetterAvatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const color = avatarColor(name);
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        color,
        backgroundColor: `${color}26`,
        border: `1px solid ${color}40`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
