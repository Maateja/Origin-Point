import { SKILL_TAXONOMY } from "@/lib/skill-taxonomy.mjs";

// Suggestions are curated vocabulary, not seeded profiles or claimed skills.
export function SkillSuggestions({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {SKILL_TAXONOMY.flatMap(({ name, aliases }) =>
        [name, ...aliases].map((value) => (
          <option key={value} value={value}>
            {name}
          </option>
        )),
      )}
    </datalist>
  );
}
