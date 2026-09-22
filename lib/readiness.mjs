import { skillKey, uniqueSkills } from "./skill-taxonomy.mjs";
// Naming aliases only. No inferred proficiency or invented eligibility rules.
export function explainReadiness(required, declared, evidence) {
  const normalise = skillKey;
  const claims = new Set(declared.map(normalise));
  const unique = new Map(
    uniqueSkills(required)
      .map((skill) => [normalise(skill), skill.trim()])
      .filter(([key]) => key),
  );
  return [...unique].map(([key, skill]) => {
    const latest = evidence
      .filter((item) => normalise(item.skill) === key)
      .sort(
        (a, b) =>
          b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
      )[0];
    return {
      skill,
      declared: claims.has(key),
      evidence: latest || null,
      status: latest
        ? latest.score >= latest.threshold
          ? "Assessment-backed"
          : "Below assessment target"
        : claims.has(key)
          ? "Self-declared"
          : "No evidence",
    };
  });
}
