import { LeaderboardArena } from "@/components/leaderboard/leaderboard-arena";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <div className="animate-fade-up">
      <SectionHeading
        eyebrow="Ranked arena"
        title="Leaderboard"
        description="A running score of who's shipping launches and which tokens everyone is watching — creators come from our own registry, token boards from live trades. Nothing invented."
        icon="trophy"
      />
      <LeaderboardArena />
    </div>
  );
}
