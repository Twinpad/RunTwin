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
  purple: "#8B5CF6",
  purpleDeep: "#6D28D9",
  cyan: "#22D3EE",
  cyanDeep: "#06B6D4",
  pink: "#F472B6",
  orange: "#FB923C",
  yellow: "#FDE047",
  gold: "#F59E0B",
  sky: "#7DD3FC",
  grass: "#7EE0A3",
  rock: "#A78BFA",
  cloud: "#FFFFFF",
  ink: "#2A1E4F",
  flame: "#FB923C",
} as const;

/** Portal colorways — Route 01 (Pump.fun) vs Route 02 (LaunchLab). */
export const PORTAL_COLORS = {
  pump: { ring: TP3D.cyan, glow: TP3D.cyan, accent: "#4ADE80" },
  launchlab: { ring: TP3D.purple, glow: TP3D.purple, accent: TP3D.pink },
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
