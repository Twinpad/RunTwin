import { LaunchMarket } from "@/components/launch/launch-market";
import { SectionHeading } from "@/components/ui/section";

export const metadata = { title: "Latest Launches" };
export const dynamic = "force-dynamic";

export default async function LaunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const raw = params.filter;
  const initialFilter = raw === "graduated" ? "graduated" : raw === "pump" ? "pump" : raw === "launchlab" ? "launchlab" : "all";
  return (
    <div className="animate-fade-up">
      <SectionHeading
        eyebrow="Launch marketplace"
        title="Fresh Launches"
        description="Straight from TwinPad's two destinations — tokens born on Pump.fun and Raydium LaunchLab, each tracked with its verified lifecycle from the launch registry."
        icon="rocket"
      />
      <LaunchMarket initialFilter={initialFilter as "all" | "graduated" | "pump" | "launchlab"} />
    </div>
  );
}
