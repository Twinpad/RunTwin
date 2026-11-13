/**
 * TwinPad brand marks — the OFFICIAL artwork from the "Twinpad Logo" folder
 * (mirrored into /public/branding, originals preserved untouched).
 *
 *  - TwinMark     → the official twin-ring icon (cropped square PNG)
 *  - TwinWordmark → typography styled to match the official wordmark
 *                   ("Twin" ink/white + "Pad" in the official ring-02 orchid)
 *  - TwinBanner   → the official wide banner (2760×1000 transparent PNG)
 *  - TwinSparkle  → the official 4-point gold sparkle, as a UI motif
 *  - TwinRings    → outline twin-ring watermark derived from the official art
 *
 * The mark is a raster image, so it renders pixel-identical everywhere and
 * keeps its transparent background in both themes. Never recolor, stretch
 * or crop the artwork — sizing happens via width/height only.
 */
import Image from "next/image";

const ICON_SRC = "/branding/twinpad-icon-512.png";

export function TwinMark({ size = 32, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={ICON_SRC}
      alt="TwinPad logo"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** TwinPad wordmark — typography: "Twin" ink + official-orchid "Pad".
 *  tone="light" forces a white "Twin" for placements on the branded indigo
 *  stage (footer, hero) where the theme's ink color would vanish. */
export function TwinWordmark({
  height = 30,
  className = "",
  tone = "auto",
}: {
  height?: number;
  className?: string;
  tone?: "auto" | "light";
}) {
  return (
    <span
      className={`inline-flex select-none items-baseline font-display font-extrabold leading-none tracking-tight ${className}`}
      style={{ fontSize: height }}
      aria-label="TwinPad"
    >
      <span className={tone === "light" ? "text-white" : "text-ink dark:text-white"}>Twin</span>
      <span className="bg-gradient-to-r from-bloom-500 via-bloom-400 to-bloom-500 bg-clip-text text-transparent">
        Pad
      </span>
    </span>
  );
}

/** Compact lockup: official mark + wordmark (small UI, mobile drawer, footer). */
export function TwinPadLockup({
  size = 26,
  className = "",
  tone = "auto",
}: {
  size?: number;
  className?: string;
  tone?: "auto" | "light";
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <TwinMark size={size} />
      <TwinWordmark height={Math.max(14, Math.round(size * 0.62))} tone={tone} />
    </span>
  );
}

/** The official wide banner (aspect 2760:1000). Serve via next/image. */
export function TwinBanner({
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 880px",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src="/branding/twinpad-banner.png"
      alt="TwinPad — One Launchpad. Two Routes."
      width={2760}
      height={1000}
      priority={priority}
      sizes={sizes}
      className={`h-auto w-full ${className}`}
    />
  );
}

/** The official 4-point sparkle star (gold), as a decorative UI motif. */
export function TwinSparkle({
  size = 16,
  className = "",
  color = "var(--tp-k400)",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 1.5 L14.4 9.6 L22.5 12 L14.4 14.4 L12 22.5 L9.6 14.4 L1.5 12 L9.6 9.6 Z" fill={color} />
    </svg>
  );
}

/**
 * Twin-ring watermark — the official mark simplified to outlines, for
 * faint background decoration on cards, empty states and stage sections.
 * Colors default to the two official rings at low opacity.
 */
export function TwinRings({
  size = 120,
  className = "",
  opacity = 0.14,
}: {
  size?: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size * (90 / 128)}
      viewBox="0 0 128 90"
      className={`shrink-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="46" cy="45" r="33" fill="none" stroke="#2CD4C0" strokeWidth="9" />
      <circle cx="82" cy="45" r="33" fill="none" stroke="#D848F0" strokeWidth="9" />
      <path d="M64 34 L66.4 42.6 L75 45 L66.4 47.4 L64 56 L61.6 47.4 L53 45 L61.6 42.6 Z" fill="#F8CC14" />
    </svg>
  );
}
