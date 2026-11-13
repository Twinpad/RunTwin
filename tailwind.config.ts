import type { Config } from "tailwindcss";

/**
 * TwinPad theme tokens — CSS variables (RGB channel triplets) so the entire
 * palette switches between Light (Candy Cosmos) and Dark (Midnight Arcade)
 * by toggling a `.dark` class on <html>. `rgb(var(--tp-*) / <alpha-value>)`
 * keeps Tailwind opacity modifiers working. Values live in globals.css.
 *
 * Token names are stable internal API (night/mint/ice/sky/deep…) so the
 * existing component call sites keep compiling; the TwinPad identity is
 * carried entirely by the variable VALUES.
 */
const v = (name: string) => `rgb(var(--tp-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // night-* = surfaces/neutrals (lavender-tinted in light mode)
        night: {
          950: v("n950"), // page background
          900: v("n900"), // topbar / sidebar / modals
          850: v("n850"), // cards
          800: v("n800"), // recessed tint / hover fills
          700: v("n700"), // resting borders
          600: v("n600"), // hover borders
          500: v("n500"), // faint text / strong hover borders
          400: v("n400"), // secondary text
        },
        // mint-* = electric purple (primary accent)
        mint: {
          300: v("m300"), // accent text
          400: v("m400"), // secondary accent
          500: v("m500"), // primary purple
          600: v("m600"), // pressed / darker accent
          700: v("m700"), // accent text on tinted chips
        },
        // ice-* = bright cyan (highlight)
        ice: {
          300: v("i300"),
          400: v("i400"),
          500: v("i500"), // highlight
          600: v("i600"),
        },
        ink: v("ink"), // main typography
        paper: v("paper"), // card/chrome surface
        pale: v("pale"), // page background
        sky: {
          50: v("s50"), // faintest tint
          100: v("s100"), // chip fill
          200: v("s200"),
        },
        deep: v("deep"), // deep-violet stage sections (hero/footer)
        // Static brand constants — identical in both themes.
        snow: "#FFFFFF", // text on purple/deep fills
        frost: "#E9D5FF", // light-violet accent text on purple/deep fills
        // Status colors (theme-aware for contrast)
        danger: v("danger"),
        warn: v("warn"),
        // Performance colors (verified positive/negative only — data, not brand)
        up: v("up"),
        down: v("down"),
        // Official brand families (from the TwinPad logo/banner artwork)
        lagoon: {
          300: v("l300"), // light teal highlight
          400: v("l400"), // #2CD4C0 — official ring 01
          500: v("l500"),
          600: v("l600"),
          700: v("l700"),
        },
        bloom: {
          300: v("b300"), // light orchid highlight
          400: v("b400"), // #D848F0 — official ring 02 / "Pad"
          500: v("b500"),
          600: v("b600"),
          700: v("b700"),
        },
        spark: {
          300: v("k300"), // light gold
          400: v("k400"), // #F8CC14 — official sparkle star
          500: v("k500"),
          600: v("k600"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", "1rem"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Theme-aware elevation (values in globals.css)
        panel: "var(--tp-shadow-panel)",
        "glow-mint": "var(--tp-shadow-glow)",
        "glow-emerald": "var(--tp-shadow-glow-strong)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-up": "fade-up 0.25s ease-out both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
