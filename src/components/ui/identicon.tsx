/**
 * Identicon — deterministic, dependency-free wallet avatar.
 * A stable hash of the address picks two gradient hues and the positions of
 * three floating orbs, so every wallet gets a unique, reproducible mark.
 * Used by Live Activity and the Leaderboard (no external images, no deps).
 */
function hash32(input: string, seed = 0): number {
  let h = seed ^ 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function Identicon({ value, size = 32, className = "" }: { value: string; size?: number; className?: string }) {
  const h1 = hash32(value);
  const h2 = hash32(value, 0x9e3779b9);
  const hueA = h1 % 360;
  const hueB = (h1 / 7 + 140 + (h2 % 80)) % 360;
  const uid = `idn-${hueA}-${hueB}`;
  const orbs = [
    { cx: 20 + (h2 % 24), cy: 14 + (h1 % 20), r: 6 + (h2 % 5) },
    { cx: 12 + (h1 % 30), cy: 26 + (h2 % 14), r: 4 + (h1 % 4) },
    { cx: 30 + (h1 % 16), cy: 30 + (h2 % 12), r: 3 + (h2 % 4) },
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`shrink-0 rounded-xl ${className}`}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hueA} 85% 62%)`} />
          <stop offset="100%" stopColor={`hsl(${hueB} 80% 55%)`} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${uid})`} opacity="0.92" />
      {orbs.map((o, i) => (
        <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill="rgba(255,255,255,0.55)" />
      ))}
      <circle cx="24" cy="24" r="9" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}
