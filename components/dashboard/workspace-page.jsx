import { OpportunityWorkspace } from "@/components/platform/opportunities";
import { InstitutionWorkspace } from "@/components/platform/institution";
import { ApplicationsWorkspace } from "@/components/platform/applications";
export function WorkspacePage({ role, pageKey }) {
  if (role === "institution")
    return <InstitutionWorkspace view={pageKey.split("/")[1]} />;
  if (pageKey === "industry/programs")
    return (
      <OpportunityWorkspace
        role={role}
        compose
        types={["Training", "Workshop", "Mentorship", "FDP"]}
        title="Learning programs"
      />
    );
  if (pageKey === "academician/fdps")
    return (
      <OpportunityWorkspace
        role={role}
        types={["FDP", "Training", "Workshop", "Mentorship"]}
        title="Faculty development"
      />
    );
  if (pageKey === "academician/internships")
    return (
      <OpportunityWorkspace
        role={role}
        types={["Faculty Internship", "Internship", "Apprenticeship"]}
        title="Faculty internships"
      />
    );
  if (pageKey === "academician/consultancy")
    return (
      <OpportunityWorkspace
        role={role}
        types={["Consultancy"]}
        title="Consultancy"
      />
    );
  if (pageKey === "academician/research")
    return (
      <OpportunityWorkspace
        role={role}
        types={["Research", "Live Project"]}
        title="Research collaborations"
      />
    );
  return <ApplicationsWorkspace role={role} recruiter />;
}
