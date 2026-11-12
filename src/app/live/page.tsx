import { PulseWall, LaunchTimeline, NewPairsStrip } from "@/components/live/live-universe";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Live Activity" };

export default function LivePage() {
  return (
    <div className="animate-fade-up space-y-8">
      <SectionHeading
        eyebrow="Live universe"
        title="Live Market Universe"
        description="Real activity as it happens: the market pulse streams live buy/sell pressure through TwinPad's backend, the launch timeline tracks every verified lifecycle event, and new pools appear the moment they are confirmed on-chain."
        icon="activity"
      />
      <PulseWall />
      <LaunchTimeline />
      <NewPairsStrip />
    </div>
  );
}
