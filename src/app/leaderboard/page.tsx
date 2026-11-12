import { LeaderboardArena } from "@/components/leaderboard/leaderboard-arena";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <div className="animate-fade-up">
      <SectionHeading
        eyebrow="Ranked arena"
        title="Leaderboard"
        description="Creator rankings are computed from TwinPad's launch registry (launch counts and on-chain-verified graduations only). Token boards come from the live Pump.fun engine — real trades, never simulated."
        icon="trophy"
      />
      <LeaderboardArena />
    </div>
  );
}
