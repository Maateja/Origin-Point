import { z } from "zod";
export const industryQuestionSchema = z.object({
  question: z.string().trim().min(10).max(2000),
  options: z
    .array(z.string().trim().min(1).max(800))
    .length(4)
    .refine(
      (options) => new Set(options.map((o) => o.toLowerCase())).size === 4,
      "Options must be distinct.",
    ),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(5).max(3000),
  skillArea: z.string().trim().min(2).max(100),
  category: z.enum(["Technical", "Aptitude", "Soft skills"]),
});
export const industryDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  supersedes: z.string().uuid().optional(),
  opportunity_id: z.string().uuid(),
  title: z.string().trim().min(4).max(160),
  summary: z.string().trim().min(20).max(4000),
  passing_score: z.number().int().min(1).max(100),
  publish: z.boolean(),
  questions: z.array(industryQuestionSchema).min(1).max(30),
});
export function assessmentDatabaseError(error: {
  code?: string;
  message?: string;
}) {
  if (["42P01", "42703", "PGRST202", "PGRST205"].includes(error.code || ""))
    return {
      error: "Industry assessments need the latest Supabase migration.",
      status: 503,
    };
  if (error.code === "23505")
    return {
      error: "A newer version already exists. Refresh the assessment list.",
      status: 409,
    };
  if (error.code === "P0001")
    return {
      error: error.message || "This assessment action is not allowed.",
      status: 400,
    };
  return {
    error: "The assessment could not be saved or loaded. Please retry.",
    status: 500,
  };
}
