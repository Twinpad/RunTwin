"use client";

/**
 * TwinPad 3D scene support — shared palette, availability detection and
 * quality heuristics for the decorative hero universe.
 *
 * Ground rules (performance + accessibility):
 * - `useSceneAvailability()` returns false when the visitor prefers reduced
 *    motion, when Device Memory/HW concurrency indicate a weak device, or on
 *    small touch-first screens — those visitors get the CSS-only hero.
 * - The canvas never captures the pointer (decorative only), so buttons and
 *     links above it stay fully interactive.
 */

import { useEffect, useState } from "react";

export const TP3D = {
  purple: "#A855F7", // halo violet
  purpleDeep: "#7C3AED",
  cyan: "#2CD4C0", // official lagoon ring
  cyanDeep: "#16B3A0",
  pink: "#D848F0", // official orchid ring
  orange: "#F8CC14", // official spark gold
  yellow: "#F8CC14",
  gold: "#F8CC14",
  sky: "#68E8F8", // official sky-cyan satellites
  grass: "#2CD4C0",
  rock: "#C4B5FD",
  cloud: "#FFFFFF",
  ink: "#20124D",
  flame: "#F8CC14",
} as const;

/** Portal colorways — Route 01 (Pump.fun) vs Route 02 (LaunchLab). */
export const PORTAL_COLORS = {
  pump: { ring: TP3D.cyan, glow: TP3D.cyan, accent: "#98E8E0" },
  launchlab: { ring: TP3D.pink, glow: TP3D.pink, accent: TP3D.sky },
} as const;

export type PortalVariant = keyof typeof PORTAL_COLORS;

interface SceneAvailability {
  /** True when the full R3F scene may render. */
  allow3D: boolean;
  /** True while detectors are still sampling (SSR + first paint). */
  decided: boolean;
}

/**
 * Decides once per mount whether the device should get the full 3D scene.
 * Deliberately conservative: 3D is decoration, never worth a janky page.
 */
export function useSceneAvailability(): SceneAvailability {
  const [state, setState] = useState<SceneAvailability>({ allow3D: false, decided: false });

  useEffect(() => {
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reducedMotion = false;
    }

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      maxTouchPoints?: number;
    };
    const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 640;
    const weak = memory <= 2 || cores <= 2 || (coarse && smallScreen);

    setState({ allow3D: !reducedMotion && !weak, decided: true });
  }, []);

  return state;
}
