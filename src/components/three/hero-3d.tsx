"use client";

/**
 * Hero3D — decides between the full R3F universe and the CSS-only fallback.
 *
 * The R3F scene is code-split (next/dynamic, ssr:false) so three.js never
 * lands in the initial bundle, and weak devices / reduced-motion visitors get
 * an animated CSS hero instead. Both variants are pointer-transparent
 * decoration layers behind real HTML content.
 */

import dynamic from "next/dynamic";
import { useSceneAvailability } from "./scene-support";
import { HeroFallback } from "./hero-fallback";

const TwinUniverse = dynamic(
  () => import("./twin-universe").then((m) => m.TwinUniverse),
  {
    ssr: false,
    loading: () => <HeroFallback quiet />,
  },
);

export function Hero3D({ dark }: { dark: boolean }) {
  const { allow3D, decided } = useSceneAvailability();

  if (!decided) return <HeroFallback quiet />;
  if (!allow3D) return <HeroFallback />;

  return <TwinUniverse dark={dark} />;
}
