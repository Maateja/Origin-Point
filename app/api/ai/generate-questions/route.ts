import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation: string;
  skillArea: string;
  category: "Technical" | "Aptitude" | "Soft skills";
}

function getFallbackQuestions(title: string, skills: string[]): GeneratedQuestion[] {
  const primarySkill = skills[0] || "Software Engineering";
  const secondarySkill = skills[1] || "Problem Solving";

  return [
    {
      question: `In production ${primarySkill} systems, which practice best ensures reliability and maintainability?`,
      options: [
        "Modular architecture with automated test coverage and clear separation of concerns",
        "Writing monolithic functions to minimize network hops and file overhead",
        "Skipping input validation when running inside an internal network",
        "Storing configuration secrets directly inside client-side source code",
      ],
      correctAnswer: 0,
      explanation:
        "Modular architecture combined with automated test coverage isolates domain logic and prevents regression bugs in production.",
      skillArea: primarySkill,
      category: "Technical",
    },
    {
      question: `When optimizing application performance involving ${primarySkill} and ${secondarySkill}, what is the recommended diagnostic approach?`,
      options: [
        "Measure baseline metrics using profiling tools before and after isolating bottlenecks",
        "Immediately add in-memory caching to every database and network request",
        "Rewrite the entire application stack in a low-level language",
        "Increase server instance count without inspecting query execution plans",
      ],
      correctAnswer: 0,
      explanation:
        "Profiling and baseline metric measurement ensures optimizations target genuine bottlenecks rather than introducing premature complexity.",
      skillArea: secondarySkill,
      category: "Technical",
    },
    {
      question: `What is the most effective strategy when handling concurrent operations and state synchronization in modern applications?`,
      options: [
        "Use atomic transactions or optimistic locking to prevent race conditions and data corruption",
        "Rely on client-side timestamps without database validation",
        "Allow concurrent writes and accept the last write without conflict detection",
        "Disable database constraints during peak traffic hours",
      ],
      correctAnswer: 0,
      explanation:
        "Atomic transactions and optimistic concurrency control protect data integrity against simultaneous write conflicts.",
      skillArea: primarySkill,
      category: "Technical",
    },
    {
      question: `A critical API integration fails intermittently during peak hours. How should the engineering team respond?`,
      options: [
        "Implement exponential backoff with jitter and circuit breaker patterns, supported by structured logs",
        "Retry the failed request continuously in a tight loop until it succeeds",
        "Silently catch the exception and return an empty response to the user",
        "Restart the primary database server every hour automatically",
      ],
      correctAnswer: 0,
      explanation:
        "Exponential backoff with jitter prevents thundering herd problems, and circuit breakers protect upstream systems from cascading failure.",
      skillArea: "System Design",
      category: "Technical",
    },
    {
      question: `Which approach aligns best with industry standards for secure credential and environment configuration?`,
      options: [
        "Inject secrets via environment variables or managed secrets stores, never committed to version control",
        "Embed API tokens inside repository README markdown files for team convenience",
        "Share production database credentials via unencrypted team chat channels",
        "Hardcode fallback credentials inside client component definitions",
      ],
      correctAnswer: 0,
      explanation:
        "Managed secret vaults and environment variable injection prevent secret leaks and maintain audit trails across environments.",
      skillArea: "Security",
      category: "Technical",
    },
  ];
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title = "Software Role",
      skills = [],
      description = "",
      difficulty = "Mid-Level",
      categoryFocus = "Balanced",
      customTopics = "",
      count = 5,
    } = body;
    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
        ? skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    const effectiveCount = Math.min(Math.max(Number(count) || 5, 1), 15);

    try {
      const model = getGeminiModel();
      const prompt = `You are a Principal Engineering Recruiter and Technical Assessor at a top-tier tech firm.
Generate exactly ${effectiveCount} high-caliber, practical multiple-choice questions for the following hiring mandate:

Target Role: "${title}"
Required Competencies & Skills: "${skillsList.join(", ") || "Fullstack Software Engineering"}"
Target Experience & Difficulty Level: "${difficulty}"
Assessment Focus Area: "${categoryFocus}"
Job Description / Topics to Test:
"""
${(customTopics || description || "General technical depth and practical problem solving").slice(0, 2500)}
"""

Guidelines:
1. Questions must be realistic, scenario-based, and test genuine understanding—NOT trivial syntax or trivia.
2. Formulate 4 plausible, high-quality answer choices (A, B, C, D) with no giveaway options or "all of the above".
3. Provide a clear, educational rationale for why the chosen answer is superior.
4. Categorize each question accurately as "Technical", "Aptitude", or "Soft skills".

Return ONLY a valid JSON array of objects with NO surrounding markdown backticks or commentary:
[
  {
    "question": "Realistic scenario or problem statement (20-300 chars)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0, // 0, 1, 2, or 3
    "explanation": "Clear architectural or engineering rationale (20-400 chars)",
    "skillArea": "Specific skill tested (e.g. Next.js, PostgreSQL, Concurrency)",
    "category": "Technical"
  }
]`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }

      const parsed: GeneratedQuestion[] = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validated = parsed.slice(0, effectiveCount).map((q, idx) => ({
          question: String(q.question || `Question ${idx + 1}`),
          options: (Array.isArray(q.options) && q.options.length === 4
            ? q.options.map(String)
            : ["Option A", "Option B", "Option C", "Option D"]) as [string, string, string, string],
          correctAnswer: ([0, 1, 2, 3].includes(Number(q.correctAnswer)) ? Number(q.correctAnswer) : 0) as 0 | 1 | 2 | 3,
          explanation: String(q.explanation || "Correct based on engineering best practices."),
          skillArea: String(q.skillArea || skillsList[0] || "Engineering"),
          category: (["Technical", "Aptitude", "Soft skills"].includes(q.category) ? q.category : "Technical") as "Technical" | "Aptitude" | "Soft skills",
        }));
        return NextResponse.json({ questions: validated, source: "ai" });
      }
    } catch (aiErr) {
      console.warn("Gemini question generation fallback:", aiErr);
    }

    // Fallback if AI unavailable
    return NextResponse.json({
      questions: getFallbackQuestions(title, skillsList),
      source: "template",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate assessment questions" },
      { status: 500 }
    );
  }
}
