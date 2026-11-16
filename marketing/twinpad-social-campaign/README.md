# TwinPad Social Media Campaign

Official X (Twitter) campaign package: **15 original posts + 15 matching 1600×900 PNG banners**, visually built on TwinPad's official branding (logo, banner, palette, typography).

## Contents
```
twinpad-social-campaign/
├── README.md            ← this file
├── campaign-plan.md     ← strategy, message arc, verified claims
├── tweets.md            ← all 15 posts, ready for manual publication
├── banners/             ← 15 final PNGs (1600×900, 16:9)
│   ├── 01-introducing-twinpad.png
│   ├── 02-two-launch-routes.png
│   ├── 03-pump-fun.png
│   ├── 04-raydium-launchlab.png
│   ├── 05-token-discovery.png
│   ├── 06-technology.png
│   ├── 07-live-activity.png
│   ├── 08-built-for-creators.png
│   ├── 09-what-makes-twinpad-different.png
│   ├── 10-community-rewards.png
│   ├── 11-whats-coming-next.png
│   ├── 12-user-experience.png
│   ├── 13-infrastructure.png
│   ├── 14-solana-community.png
│   └── 15-twinpad-vision.png
└── source/              ← editable artwork
    ├── 01…15 *.svg      ← original vector compositions (self-contained)
    ├── fonts/           ← Baloo 2 + Nunito woff2 (the site's fonts)
    └── render/          ← HTML shells used to rasterize the SVGs
```

## How the banners were made
No AI image-generation service was available in this environment (per the campaign brief, the fallback was used): every banner is an **original SVG composition** — layered gradients, radial "planet halos", starfields, glossy 3D spheres, portals, rockets, lab glass, floating cards, node networks and pulse waves — rendered to PNG at exactly **1600×900** through headless Edge (CDP screenshot of the HTML shell). The **official TwinPad logo PNG is embedded unmodified** in every banner, and typography uses TwinPad's real webfonts (Baloo 2 + Nunito, embedded as data URIs at render time).

To edit a banner: open its `.svg` in `source/`, adjust, then re-render by deleting the matching PNG and running the render script (see below). Text lives in the HTML/SVG as real text — spell-check friendly.

## Regenerating
The render pipeline used during this campaign lives outside the repo (scratch tooling). To re-render after editing an SVG:
1. Wrap the SVG in a minimal HTML page (see any file in `source/render/` as the template; fonts are inlined via `@font-face` data URIs).
2. Screenshot at 1600×900 (deviceScaleFactor 1) with any Chromium-based browser.
3. Before capture, force font loading: `await document.fonts.load("800 74px 'Baloo 2'", 'TwinPad')` — headless browsers otherwise skip the Baloo face.

## Publication rules
- Replace every `[official link]` placeholder in `tweets.md` with the real URL.
- One banner per tweet, in order — the pairs are documented in `tweets.md`.
- Tweet 10 makes **no reward claims** (none are implemented). Its optional future variant requires explicit team approval before any publication.
- No automated posting: everything is copy-paste ready for a human.
