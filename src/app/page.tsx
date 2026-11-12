import Link from "next/link";
import { Hero3D } from "@/components/three/hero-3d";
import { LaunchPortals } from "@/components/home/launch-portals";
import {
  TrendingUniversePreview,
  LiveTicker,
  LeaderboardTeaser,
  LatestLaunchesPreview,
} from "@/components/home/home-sections";
import { OfficialTokenCard } from "@/components/official/official-token-card";
import { getOfficialTokenConfig } from "@/lib/official-token/config";
import { officialTokenView } from "@/lib/official-token/token-display";

/**
 * TwinPad home — the entry point of the launch universe.
 * Hero: the real 3D scene behind the "One Launchpad. Two Routes." headline
 * (CSS fallback for reduced-motion / weak devices). Below: launch stations,
 * trending preview, live ticker, creator podium and the newest launches —
 * every section fed by real backend endpoints with honest empty states.
 * Force-dynamic: the Official $TWIN address must reflect the CURRENT
 * TWINPAD_OFFICIAL_MINT configuration on every request.
 */
export const dynamic = "force-dynamic";

export default function TwinPadHomePage() {
  const officialToken = officialTokenView(getOfficialTokenConfig());
  return (
    <div className="animate-fade-up space-y-8">
      {/* Hero — the 3D launch universe */}
      <section className="relative overflow-hidden rounded-3xl border border-deep/40 bg-gradient-to-br from-deep via-[#3B1D8F] to-[#155E9C] shadow-panel">
        <Hero3D dark={false} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_120%,rgba(6,182,212,0.22),transparent_60%)]" />
        <div className="relative z-10 px-6 py-14 text-center sm:px-12 sm:py-20 lg:py-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-2xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan-300" />
            Solana · Two launch routes · Zero custody
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
            One Launchpad.
            <br />
            <span className="tp-gradient-text">Two Routes.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Discover new tokens, explore the Solana ecosystem, and launch your
            next big idea.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tokens"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-[#2A1E4F] shadow-[0_14px_34px_-10px_rgba(255,255,255,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100"
            >
              Explore Tokens
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-extrabold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
            >
              Launch Token
            </Link>
          </div>
        </div>
      </section>


      {/* Two launch stations */}
      <LaunchPortals />
      <p className="text-center text-2xs leading-relaxed text-night-400">
        Pump.fun and Raydium are independent Solana protocols. TwinPad builds each
        route&apos;s transactions with the protocols&apos; official SDKs and is not
        affiliated with, endorsed by, or sponsored by either of them.
      </p>

      {/* Trending universe preview */}
      <section aria-label="Trending preview">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-mint-400/25 bg-gradient-to-r from-violet-500/10 to-cyan-400/10 px-3 py-1 text-2xs font-bold uppercase tracking-[0.16em] text-mint-600 dark:text-mint-300">
              🔥 Live market
            </p>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              Trending in the universe
            </h2>
          </div>
          <Link
            href="/trending"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-night-700 bg-paper px-4 py-2 text-xs font-bold text-night-400 transition-all duration-200 hover:border-mint-500/50 hover:text-ink"
          >
            All trending
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <TrendingUniversePreview />
      </section>

      {/* Live ticker + creator podium */}
      <section aria-label="Live activity and leaderboard" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LiveTicker />
        <LeaderboardTeaser />
      </section>

      {/* Newest launches */}
      <section aria-label="Latest launches">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-mint-400/25 bg-gradient-to-r from-violet-500/10 to-cyan-400/10 px-3 py-1 text-2xs font-bold uppercase tracking-[0.16em] text-mint-600 dark:text-mint-300">
              🚀 Fresh from the pad
            </p>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Latest launches</h2>
          </div>
          <Link
            href="/launches"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-night-700 bg-paper px-4 py-2 text-xs font-bold text-night-400 transition-all duration-200 hover:border-mint-500/50 hover:text-ink"
          >
            Launch marketplace
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <LatestLaunchesPreview />
      </section>

      {/* Official $TWIN token — public CA display with honest status */}
      <section aria-label="Official $TWIN token" className="pt-2">
        <OfficialTokenCard initialView={officialToken} />
      </section>
    </div>
  );
}

