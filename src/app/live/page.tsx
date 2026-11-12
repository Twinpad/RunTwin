import { PulseWall, LaunchTimeline, NewPairsStrip } from "@/components/live/live-universe";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Live Activity" };

export default function LivePage() {
  return (
    <div className="animate-fade-up space-y-8">
      <SectionHeading
        eyebrow="Live universe"
        title="Live Market Universe"
        description="Watch TwinPad breathe: live buy and sell pressure on one side, every verified launch step on the other, and fresh pairs appearing as the chain confirms them."
        icon="activity"
      />
      <PulseWall />
      <LaunchTimeline />
      <NewPairsStrip />
    </div>
  );
}
