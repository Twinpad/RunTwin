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
        description="Live Pump.fun rankings built from real trades streamed through TwinPad's backend — volume, price movement, buy pressure and migrations as they happen."
        icon="flame"
      />
      <TrendingBoard />
    </div>
  );
}
