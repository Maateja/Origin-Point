import { LearningPlan } from "@/components/platform/learning-plan";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  return (
    <LearningPlan initialTarget={typeof target === "string" ? target : ""} />
  );
}
