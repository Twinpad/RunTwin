import { TrendingBoard } from "@/components/trending/trending-board";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Trending" };
export const dynamic = "force-dynamic";

export default function TrendingPage() {
  return (
    <div className="animate-fade-up">
      <SectionHeading
        eyebrow="Live market"
        title="Trending Universe"
        description="Real trades, ranked live. See which tokens are pulling volume, gaining ground, or heating up on Pump.fun — updated as the trades happen."
        icon="flame"
      />
      <TrendingBoard />
    </div>
  );
}
