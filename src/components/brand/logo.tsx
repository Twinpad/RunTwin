/**
 * TwinPad brand marks — original inline-SVG artwork, no image dependencies.
 *
 * The TwinMark is a gradient squircle with two mirrored rockets leaving
 * orbit trails (the "two paths" story); the wordmark is typography so it
 * stays crisp at any size and in any theme. Server-safe: renders identically
 * in the topbar, sidebar and drawer.
 */

export function TwinMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const uid = `twin-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="TwinPad logo"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={`${uid}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
      </defs>
      {/* rounded badge */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${uid}-bg)`} />
      {/* orbit ring */}
      <ellipse
        cx="32"
        cy="34"
        rx="22"
        ry="9"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.4"
        transform="rotate(-18 32 34)"
      />
      {/* twin rockets (mirrored) */}
      <g fill="#FFFFFF">
        <g transform="translate(24.5 34) rotate(-38)">
          <path d="M0 -11 C 4.6 -5.4, 4.6 4.4, 0 9 C -4.6 4.4, -4.6 -5.4, 0 -11 Z" />
          <circle cx="0" cy="-1.5" r="2.1" fill="#22D3EE" />
        </g>
        <g transform="translate(39.5 34) rotate(38)">
          <path d="M0 -11 C 4.6 -5.4, 4.6 4.4, 0 9 C -4.6 4.4, -4.6 -5.4, 0 -11 Z" />
          <circle cx="0" cy="-1.5" r="2.1" fill="#F472B6" />
        </g>
      </g>
      {/* twin flames */}
      <path d="M20.5 46 q 2 5 4 0 Z" fill={`url(#${uid}-flame)`} />
      <path d="M39.5 46 q 2 5 4 0 Z" fill={`url(#${uid}-flame)`} />
    </svg>
  );
}

/** TwinPad wordmark — pure typography: "Twin" ink + gradient "Pad". */
export function TwinWordmark({
  height = 30,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex select-none items-baseline font-display font-extrabold leading-none tracking-tight ${className}`}
      style={{ fontSize: height }}
      aria-label="TwinPad"
    >
      <span className="text-ink dark:text-white">Twin</span>
      <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
        Pad
      </span>
    </span>
  );
}

/** Compact lockup: mark + wordmark (small UI, mobile drawer, footer). */
export function TwinPadLockup({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <TwinMark size={size} />
      <TwinWordmark height={Math.max(14, Math.round(size * 0.62))} />
    </span>
  );
}
