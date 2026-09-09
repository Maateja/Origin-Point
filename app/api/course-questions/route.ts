import { NextResponse } from "next/server";
import { genAI, getGenAI } from "@/lib/ai/gemini";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Fallback high-quality template generator for 10 questions per sub-topic
function generateQuestionsForSubtopic(
  courseTitle: string,
  moduleTitle: string,
  subTopicTitle: string
): Question[] {
  return [
    {
      id: 1,
      question: `What is the core primary objective of ${subTopicTitle} in ${moduleTitle}?`,
      options: [
        `Establishing fundamental principles and structured patterns in ${subTopicTitle}`,
        `Bypassing error checking to increase runtime throughput`,
        `Replacing all external storage systems completely`,
        `Disabling caching mechanisms during production deployments`,
      ],
      correctAnswer: 0,
      explanation: `${subTopicTitle} focuses on establishing correct architectural and structural patterns within ${moduleTitle}.`,
    },
    {
      id: 2,
      question: `Which of the following is considered a best practice when working with ${subTopicTitle}?`,
      options: [
        `Hardcoding configuration values directly in production components`,
        `Writing modular, decoupled, and testable implementations`,
        `Avoiding type safety and input validation altogether`,
        `Executing heavy synchronous blocking loops on the main thread`,
      ],
      correctAnswer: 1,
      explanation: `Modularity, loose coupling, and thorough testing ensure long-term maintainability for ${subTopicTitle}.`,
    },
    {
      id: 3,
      question: `How does ${subTopicTitle} handle state or data flow effectively?`,
      options: [
        `By mutating shared global state arbitrarily across threads`,
        `By enforcing predictable, deterministic state transformations`,
        `By storing sensitive credentials in browser local storage`,
        `By ignoring lifecycle events and teardown routines`,
      ],
      correctAnswer: 1,
      explanation: `Predictable state flow reduces bugs and race conditions in modern ${courseTitle} ecosystems.`,
    },
    {
      id: 4,
      question: `What is the typical time or resource complexity trade-off encountered in ${subTopicTitle}?`,
      options: [
        `Balancing memory footprint vs. execution speed and latency`,
        `Always using O(N^3) brute-force searches regardless of input size`,
        `Sacrificing security completely to gain minimal latency gains`,
        `Complexity is strictly irrelevant in modern cloud computing`,
      ],
      correctAnswer: 0,
      explanation: `Engineering trade-offs in ${subTopicTitle} prioritize balancing space and time complexity.`,
    },
    {
      id: 5,
      question: `When debugging an unexpected issue in ${subTopicTitle}, what is the recommended diagnostic approach?`,
      options: [
        `Restarting the machine without inspecting system traces`,
        `Analyzing error stack traces, logs, and isolating reproducing unit tests`,
        `Commenting out test assertions so CI pipelines turn green`,
        `Deploying directly to production to see if the issue persists`,
      ],
      correctAnswer: 1,
      explanation: `Systematic log inspection and isolated unit tests are standard industry debugging protocols.`,
    },
    {
      id: 6,
      question: `Which tool or mechanism is standard for monitoring and profiling ${subTopicTitle}?`,
      options: [
        `Telemetry, performance profilers, and structured logging`,
        `Manual paper tally logs`,
        `Overclocking hardware without benchmarking software metrics`,
        `Deleting error handling blocks to avoid warning traces`,
      ],
      correctAnswer: 0,
      explanation: `Automated telemetry and profilers provide deterministic insights into runtime behavior.`,
    },
    {
      id: 7,
      question: `How does ${subTopicTitle} contribute to scalability in large systems?`,
      options: [
        `By allowing horizontal scaling through stateless or modular separation`,
        `By requiring a single monolithic server with infinite RAM`,
        `By preventing concurrency and parallel background tasks`,
        `By disabling network caching headers`,
      ],
      correctAnswer: 0,
      explanation: `Statelessness and modular separation enable clusters to scale horizontally with load.`,
    },
    {
      id: 8,
      question: `Which security principle is crucial to observe within ${subTopicTitle}?`,
      options: [
        `Principle of Least Privilege and rigorous sanitization of untrusted inputs`,
        `Granting root / administrator permissions by default to all clients`,
        `Storing plaintext tokens inside version control repositories`,
        `Trusting all client-side inputs without server-side validation`,
      ],
      correctAnswer: 0,
      explanation: `Input sanitization and least privilege prevent injection and unauthorized access vulnerabilities.`,
    },
    {
      id: 9,
      question: `What is an anti-pattern to avoid when implementing ${subTopicTitle}?`,
      options: [
        `Creating circular dependencies and monolithic tightly-coupled modules`,
        `Implementing continuous integration with automated checks`,
        `Adding comprehensive documentation and descriptive variable names`,
        `Profiling performance bottlenecks before premature micro-optimizations`,
      ],
      correctAnswer: 0,
      explanation: `Tight coupling and circular dependencies impede refactoring and create subtle runtime crashes.`,
    },
    {
      id: 10,
      question: `What is the expected outcome after mastering ${subTopicTitle} in ${courseTitle}?`,
      options: [
        `Ability to architect robust, production-ready solutions and pass technical evaluations`,
        `Never needing to consult documentation or update system libraries again`,
        `Guaranteed zero-latency execution on any computational hardware`,
        `Total deprecation of all other software architectural paradigms`,
      ],
      correctAnswer: 0,
      explanation: `Mastering ${subTopicTitle} equips developers with practical competency and interview readiness.`,
    },
  ];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseTitle = searchParams.get("courseTitle") || "Full-Stack Web Development";
    const moduleTitle = searchParams.get("moduleTitle") || "Module 1";
    const subTopicTitle = searchParams.get("subTopicTitle") || "Core Concepts";

    const fallbackQuestions = generateQuestionsForSubtopic(courseTitle, moduleTitle, subTopicTitle);

    return NextResponse.json({
      source: "curated-library",
      courseTitle,
      moduleTitle,
      subTopicTitle,
      questions: fallbackQuestions,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const {
      courseTitle = "Full-Stack Web Development",
      moduleTitle = "Module 1",
      subTopicTitle = "Core Concepts",
    } = body || {};

    // Try OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You generate multiple-choice questions for technical courses. Return ONLY a valid JSON array of 10 questions with schema: [ { \"id\": 1, \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": 0, \"explanation\": \"...\" } ]. Do not wrap in markdown quotes.",
              },
              {
                role: "user",
                content: `Generate 10 multiple-choice questions for course: "${courseTitle}", module: "${moduleTitle}", subtopic: "${subTopicTitle}".`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          const content = openAiData.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length >= 10) {
            return NextResponse.json({
              source: "openai",
              courseTitle,
              moduleTitle,
              subTopicTitle,
              questions: parsed.slice(0, 10),
            });
          }
        }
      } catch (openAiError) {
        console.warn("OpenAI generation fallback:", openAiError);
      }
    }

    // Try Gemini AI if available
    const ai = getGenAI();
    if (ai) {
      try {
        const model = ai.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" },
        });
        const prompt = `Generate exactly 10 high-quality multiple choice questions (MCQs) for the course "${courseTitle}", module "${moduleTitle}", and subtopic "${subTopicTitle}".
Format the response strictly as a valid JSON array of objects with the following schema:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation why this is correct."
  }
]
Do not include markdown ticks or any extra text outside the JSON array.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return NextResponse.json({
            source: "gemini-ai",
            courseTitle,
            moduleTitle,
            subTopicTitle,
            questions: parsed.slice(0, 10),
          });
        }
      } catch (geminiError) {
        console.warn("Gemini question generation fallback:", geminiError);
      }
    }

    // Fallback deterministic questions
    const fallbackQuestions = generateQuestionsForSubtopic(courseTitle, moduleTitle, subTopicTitle);

    return NextResponse.json({
      source: "curated-library",
      courseTitle,
      moduleTitle,
      subTopicTitle,
      questions: fallbackQuestions,
    });
  } catch (error) {
    console.error("API error in course-questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions", details: String(error) },
      { status: 500 }
    );
  }
}
