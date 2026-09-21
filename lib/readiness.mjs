// Transparent exact-name matching. No inferred proficiency or invented eligibility rules.
export function explainReadiness(required, declared, evidence) {
  const normalise = (value) => value.trim().toLocaleLowerCase("en");
  const claims = new Set(declared.map(normalise));
  const unique = new Map(
    required
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
