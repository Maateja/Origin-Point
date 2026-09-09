import { z } from "zod";

const optionalText = (max) =>
  z.string().trim().max(max).optional().default("");

export const onboardingSchema = z.object({
  institution: optionalText(200),
  department: optionalText(200),
  academic_year: optionalText(100),
  location: optionalText(200),
  selectedSkills: z
    .array(z.string().trim().min(1).max(100))
    .max(50)
    .default([]),
  selectedGoals: z
    .array(z.string().trim().min(1).max(100))
    .max(20)
    .default([]),
});
