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
        title="Latest Launches"
        description="The newest tokens launched through TwinPad's two routes — Pump.fun and Raydium LaunchLab — with verified lifecycle state from the launch registry. TwinPad launches appear here first."
        icon="rocket"
      />
      <LaunchMarket initialFilter={initialFilter as "all" | "graduated" | "pump" | "launchlab"} />
    </div>
  );
}
