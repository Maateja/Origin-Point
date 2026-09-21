import { OpportunityWorkspace } from "@/components/platform/opportunities";
export default function Page() {
  return (
    <OpportunityWorkspace
      role="academician"
      compose
      types={[
        "Research",
        "Consultancy",
        "Live Project",
        "Mentorship",
        "Workshop",
      ]}
      title="Publish collaboration"
    />
  );
}
