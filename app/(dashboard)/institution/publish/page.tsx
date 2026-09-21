import { OpportunityWorkspace } from "@/components/platform/opportunities";
export default function Page() {
  return (
    <OpportunityWorkspace
      role="institution"
      compose
      types={["Research", "Live Project", "Workshop", "FDP", "Training"]}
      title="Publish collaboration"
    />
  );
}
