// Curated naming aliases, not sample user data or inferred skill equivalence.
// Keep the database function in migration 202609220002 in sync (parity tested).
export const SKILL_TAXONOMY = [
  { name: "React", aliases: ["react.js", "reactjs"] },
  { name: "JavaScript", aliases: ["js", "ecmascript"] },
  { name: "TypeScript", aliases: ["ts"] },
  { name: "Node.js", aliases: ["nodejs", "node js"] },
  { name: "Next.js", aliases: ["nextjs", "next js"] },
  { name: "PostgreSQL", aliases: ["postgres", "postgres sql"] },
  { name: "Python", aliases: [] },
  { name: "SQL", aliases: [] },
  { name: "HTML", aliases: ["html5"] },
  { name: "CSS", aliases: ["css3"] },
  { name: "Git", aliases: [] },
  { name: "Docker", aliases: [] },
  { name: "Kubernetes", aliases: ["k8s"] },
  { name: "C++", aliases: ["cpp"] },
  { name: "C#", aliases: ["csharp", "c sharp"] },
];
const clean = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
const names = new Map(
  SKILL_TAXONOMY.flatMap(({ name, aliases }) =>
    [name, ...aliases].map((alias) => [clean(alias), name]),
  ),
);
export function skillKey(value) {
  const key = clean(value);
  return clean(names.get(key) ?? key);
}
export function skillName(value) {
  return names.get(clean(value)) ?? value.trim().replace(/\s+/g, " ");
}
export function uniqueSkills(values) {
  return [
    ...new Map(
      values.filter((v) => v.trim()).map((v) => [skillKey(v), skillName(v)]),
    ).values(),
  ];
}
export function skillMatch(required, candidate = []) {
  const skills = uniqueSkills(required);
  const claims = new Set(candidate.map(skillKey));
  const matched = skills.filter((s) => claims.has(skillKey(s)));
  const missing = skills.filter((s) => !claims.has(skillKey(s)));
  return {
    matched,
    missing,
    score: skills.length
      ? Math.round((100 * matched.length) / skills.length)
      : 0,
  };
}
