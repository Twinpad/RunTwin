"use client";

/**
 * HeroFallback — the CSS-only TwinPad hero scene.
 *
 * Renders for reduced-motion visitors, weak devices and small touch screens,
 * and doubles as the loading state while the R3F bundle streams in. Pure CSS
 * + inline SVG (no images, no canvas), so it is essentially free — and the
 * global reduced-motion rule in globals.css freezes its animations for
 * visitors who asked for stillness.
 */

interface HeroFallbackProps {
  /** Quiet mode = loading placeholder: same scene, softer motion. */
  quiet?: boolean;
}

function FallbackCoin({ className, delay, tint }: { className: string; delay: string; tint: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`tp-float absolute ${className}`}
      style={{ animationDelay: delay }}
    >
      <circle cx="24" cy="24" r="20" fill={tint} opacity="0.9" />
      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="3" />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="inherit"
      >
        $
      </text>
    </svg>
  );
}

function FallbackCloud({ className, delay }: { className: string; delay: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      aria-hidden="true"
      className={`tp-drift absolute ${className}`}
      style={{ animationDelay: delay }}
    >
      <g fill="#FFFFFF" opacity="0.9">
        <circle cx="38" cy="34" r="18" />
        <circle cx="62" cy="28" r="22" />
        <circle cx="86" cy="36" r="16" />
        <rect x="30" y="34" width="64" height="18" rx="9" />
      </g>
    </svg>
  );
}

function FallbackRocket({ className, delay, tilt = "-8deg" }: { className: string; delay: string; tilt?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`tp-float absolute ${className}`}
      style={{ animationDelay: delay, rotate: tilt }}
    >
      <g>
        <path d="M32 6c8 8 11 20 11 30H21c0-10 3-22 11-30z" fill="#FFFFFF" />
        <path d="M32 6c8 8 11 20 11 30h-7c0-10-1-22-4-30z" fill="#201060" />
        <circle cx="32" cy="28" r="5" fill="#2CD4C0" stroke="#20124D" strokeWidth="2" />
        <path d="M21 36l-7 12 10-4zM43 36l7 12-10-4z" fill="#D848F0" />
        <path d="M28 40h8l-4 14z" fill="#F8CC14" />
      </g>
    </svg>
  );
}

/** Twinny's 2D stand-in — round buddy with a jet pack. */
function FallbackMascot({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={`tp-bob absolute ${className}`}>
      {/* jet flames */}
      <path d="M44 96q4 14 8 0zM68 96q4 14 8 0z" fill="#F8CC14" opacity="0.85" />
      {/* jet pack */}
      <rect x="36" y="74" width="14" height="24" rx="7" fill="#201060" />
      <rect x="70" y="74" width="14" height="24" rx="7" fill="#201060" />
      {/* body */}
      <circle cx="60" cy="58" r="36" fill="#F5F3FF" />
      {/* visor */}
      <ellipse cx="60" cy="54" rx="18" ry="14" fill="#20124D" />
      <circle cx="53" cy="52" r="3.4" fill="#2CD4C0" />
      <circle cx="67" cy="52" r="3.4" fill="#2CD4C0" />
      {/* cheeks */}
      <circle cx="42" cy="66" r="4.5" fill="#D848F0" opacity="0.8" />
      <circle cx="78" cy="66" r="4.5" fill="#D848F0" opacity="0.8" />
      {/* antenna */}
      <line x1="60" y1="22" x2="60" y2="12" stroke="#201060" strokeWidth="3" />
      <circle cx="60" cy="10" r="4.5" fill="#2CD4C0" />
    </svg>
  );
}

function MiniPortal({ className, from, to, label }: {
  className: string;
  from: string;
  to: string;
  label: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className="tp-portal-spin h-full w-full rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${from}, ${to}, ${from})` }}
      >
        <div className="absolute inset-[14%] rounded-full bg-white/80 backdrop-blur-sm dark:bg-[#1A1150]/80" />
      </div>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-widest text-[#20124D] dark:text-white">
        {label}
      </span>
    </div>
  );
}

export function HeroFallback({ quiet = false }: HeroFallbackProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${quiet ? "opacity-60" : ""}`}
    >
      {/* sky glow */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_10%,rgba(44,212,192,0.18),transparent_60%),radial-gradient(55%_55%_at_20%_20%,rgba(196,69,232,0.2),transparent_60%)]" />

      <FallbackCloud className="left-[4%] top-[12%] w-36" delay="0s" />
      <FallbackCloud className="right-[6%] top-[24%] w-28" delay="-6s" />
      <FallbackCloud className="bottom-[18%] left-[18%] w-24" delay="-11s" />

      <FallbackCoin className="left-[16%] top-[38%] w-10" delay="0s" tint="#F8CC14" />
      <FallbackCoin className="right-[22%] top-[16%] w-8" delay="-1.4s" tint="#2CD4C0" />
      <FallbackCoin className="right-[34%] bottom-[24%] w-9" delay="-2.2s" tint="#D848F0" />
      <FallbackCoin className="left-[30%] bottom-[12%] w-7" delay="-0.8s" tint="#F8CC14" />

      <FallbackRocket className="right-[10%] top-[42%] w-12" delay="-0.6s" />
      <FallbackRocket className="left-[8%] bottom-[30%] w-9" delay="-2s" tilt="10deg" />

      <MiniPortal className="left-[10%] top-[54%] h-16 w-16" from="#2CD4C0" to="#98E8E0" label="01" />
      <MiniPortal className="right-[12%] top-[58%] h-16 w-16" from="#A855F7" to="#D848F0" label="02" />

      <FallbackMascot className="left-1/2 top-[16%] w-24 -translate-x-1/2 lg:left-[44%]" />
    </div>
  );
}
