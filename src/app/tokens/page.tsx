import { ExplorePanel } from "@/components/discovery/explore-panel";

export const metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; creator?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="animate-fade-up">
      <header className="mb-4">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
          Explore Tokens
          <span className="ml-2 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-mint-500 align-middle animate-pulse-soft" aria-hidden title="Live" />
        </h1>
        <p className="mt-0.5 text-2xs text-night-500">
          One feed for the whole ecosystem: Pump.fun curves &&apos; PumpSwap pools, Raydium
          LaunchLab &&apos; CPMM, plus verified TwinPad launches. Numbers appear only
          when they can be verified. Otherwise you will see N/A.
        </p>
      </header>
      <ExplorePanel initialSearch={params.creator ?? params.q ?? ""} />
    </div>
  );
}
