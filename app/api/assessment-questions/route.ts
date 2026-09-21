import { startAssessment } from "@/lib/assessment-server";
export const maxDuration = 60;
export async function POST(req: Request) {
  return startAssessment(req);
}
