import { NextResponse } from "next/server";
import { z } from "zod";
import { genAI, getGenAI } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { createDiagnosticAssessmentSnapshot } from "@/lib/diagnostic-assessment-sessions";
import {
  DIAGNOSTIC_LEVELS,
  diagnosticTaxonomy,
  getDiagnosticConcept,
  getDiagnosticSkill,
  getDiagnosticTopic,
  type DiagnosticLevelId,
  type DiagnosticTopicId,
} from "@/lib/diagnostic-taxonomy";
import {
  getDiagnosticBlueprint,
  type DiagnosticBlueprint,
  type DiagnosticQuestionType,
} from "@/lib/diagnostic-blueprints";

interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  skillKey: string;
  conceptKey: string;
  questionType: DiagnosticQuestionType;
  skillArea: string;
}

interface LegacyAssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  skillArea: string;
}

const diagnosticTopicIds = new Set<DiagnosticTopicId>(
  diagnosticTaxonomy.map((topic) => topic.id as DiagnosticTopicId),
);
const diagnosticLevelIds = new Set<DiagnosticLevelId>(
  DIAGNOSTIC_LEVELS.map((level) => level.id),
);

function resolveDiagnosticSelection(topicId: unknown, levelId: unknown) {
  if (
    typeof topicId !== "string" ||
    !diagnosticTopicIds.has(topicId as DiagnosticTopicId) ||
    typeof levelId !== "string" ||
    !diagnosticLevelIds.has(levelId as DiagnosticLevelId)
  ) {
    throw new Error("A valid diagnostic topicId and levelId are required.");
  }

  const resolvedTopicId = topicId as DiagnosticTopicId;
  const resolvedLevelId = levelId as DiagnosticLevelId;
  return {
    topicId: resolvedTopicId,
    levelId: resolvedLevelId,
    topic: getDiagnosticTopic(resolvedTopicId),
    level: DIAGNOSTIC_LEVELS.find((item) => item.id === resolvedLevelId)!,
    blueprint: getDiagnosticBlueprint(resolvedTopicId, resolvedLevelId),
  };
}

function getBlueprintSlots(blueprint: DiagnosticBlueprint) {
  return blueprint.allocations.flatMap((allocation) =>
    Array.from({ length: allocation.questionCount }, () => allocation),
  );
}

function validateGeneratedQuestions(
  value: unknown,
  blueprint: DiagnosticBlueprint,
): AssessmentQuestion[] {
  let list: any[] = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (value && typeof value === "object" && Array.isArray((value as any).questions)) {
    list = (value as any).questions;
  } else {
    throw new Error("Invalid response structure from AI model.");
  }

  const slots = getBlueprintSlots(blueprint);
  if (list.length < blueprint.totalQuestions) {
    throw new Error(`Expected ${blueprint.totalQuestions} questions, received ${list.length}.`);
  }

  return slots.map((slot, index) => {
    const item = list[index];
    if (!item || typeof item.question !== "string") {
      throw new Error(`Question ${index + 1} is missing text.`);
    }

    if (!Array.isArray(item.options) || item.options.length !== 4) {
      throw new Error(`Question ${index + 1} must have exactly 4 options.`);
    }

    const options = item.options.map((opt: any) => String(opt).trim());
    if (new Set(options).size !== 4) {
      throw new Error(`Question ${index + 1} options must be distinct.`);
    }

    let correctAnswer = Number(item.correctAnswer);
    if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
      correctAnswer = 0;
    }

    return {
      id: index + 1,
      question: item.question.trim(),
      options,
      correctAnswer,
      explanation: typeof item.explanation === "string" && item.explanation.trim().length > 0
        ? item.explanation.trim()
        : `The correct option is: ${options[correctAnswer]}`,
      skillKey: slot.skillKey,
      conceptKey: slot.conceptKey,
      questionType: slot.questionType,
      skillArea: getDiagnosticSkill(slot.skillKey)?.label || slot.skillKey,
    };
  });
}

function buildFallbackQuestions(
  topicTitle: string,
  blueprint: DiagnosticBlueprint,
): AssessmentQuestion[] {
  return getBlueprintSlots(blueprint).map((allocation, index) => {
    const concept = getDiagnosticConcept(allocation.conceptKey);
    const conceptLabel = concept?.label || allocation.conceptKey;
    const correctStatement = concept?.description || `A core mechanism and foundational principle of ${conceptLabel}.`;

    const distractorBank = [
      `Bypasses memory allocation checks, executing directly in kernel mode without safeguards.`,
      `Acts strictly as a static visual styling rule, having no influence on runtime logic.`,
      `Requires synchronous single-threaded blocking across all distributed nodes.`,
      `Stores state in an ephemeral hardware cache that is cleared upon function completion.`,
      `Forces a compile-time assertion that disables asynchronous network requests.`,
      `Directs hardware bus arbitration for local peripheral devices.`,
      `Treats all input arguments as immutable bitmasks with no type safety.`,
      `Restricts execution to background tasks, disallowing interactive user invocation.`,
    ];

    const d1 = distractorBank[(index * 2) % distractorBank.length];
    const d2 = distractorBank[(index * 2 + 1) % distractorBank.length];
    const d3 = distractorBank[(index * 2 + 3) % distractorBank.length];

    const options = [correctStatement, d1, d2, d3];
    const correctPos = (index + 1) % 4;
    const temp = options[correctPos];
    options[correctPos] = options[0];
    options[0] = temp;

    const questionTemplates = [
      `In ${topicTitle}, what is the primary purpose and behavior of ${conceptLabel}?`,
      `When working with ${conceptLabel} in ${topicTitle}, which of the following statements is accurate?`,
      `Which of the following best describes how ${conceptLabel} functions within an application?`,
      `What architectural role does ${conceptLabel} fulfill in modern ${topicTitle} systems?`,
    ];
    const question = questionTemplates[index % questionTemplates.length];

    return {
      id: index + 1,
      question,
      options,
      correctAnswer: correctPos,
      explanation: `${conceptLabel}: ${correctStatement}`,
      skillKey: allocation.skillKey,
      conceptKey: allocation.conceptKey,
      questionType: allocation.questionType,
      skillArea: getDiagnosticSkill(allocation.skillKey)?.label || allocation.skillKey,
    };
  });
}

function parseGeneratedJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

// Curated high quality technical fallback questions strictly tailored by level
function getCuratedQuestions(topic: string, level: string): LegacyAssessmentQuestion[] {
  const normalizedLevel = level.toLowerCase();

  // 1. VERY BEGINNER: Very very basic definitions, terminology, simple 1-line syntax
  if (normalizedLevel.includes("very") || normalizedLevel.includes("level 1")) {
    return [
      {
        id: 1,
        question: `What does the term "${topic}" fundamentally deal with in computing?`,
        options: [
          `Writing software instructions, structuring logic, and organizing digital information`,
          `Manufacturing physical silicon microchips inside hardware factories`,
          `Regulating electricity voltages in electrical power plants`,
          `Replacing monitor screens when broken`,
        ],
        correctAnswer: 0,
        explanation: `${topic} is about software development, data organization, and computing logic.`,
        skillArea: "Basics & Terminology",
      },
      {
        id: 2,
        question: `Which of the following is a primary building block used to store a value in code?`,
        options: [
          `A variable`,
          `A computer mouse`,
          `A browser bookmark`,
          `A power cable`,
        ],
        correctAnswer: 0,
        explanation: `Variables are named containers used to store and retrieve data values in programming.`,
        skillArea: "Syntax & Variables",
      },
      {
        id: 3,
        question: `What data type would you use to store whether a condition is true or false?`,
        options: [
          `Boolean`,
          `Integer`,
          `String`,
          `Float`,
        ],
        correctAnswer: 0,
        explanation: `A Boolean represents one of two values: true or false.`,
        skillArea: "Data Types",
      },
      {
        id: 4,
        question: `Which programming construct is used to execute a block of instructions repeatedly?`,
        options: [
          `A loop (such as for or while)`,
          `A comment`,
          `A print statement`,
          `An exit command`,
        ],
        correctAnswer: 0,
        explanation: `Loops iterate and repeat code execution until a specific condition is met.`,
        skillArea: "Control Flow",
      },
      {
        id: 5,
        question: `What is the output or purpose of an "if-else" statement in basic programming?`,
        options: [
          `To make decisions and run specific code branches based on conditions`,
          `To turn off the computer system`,
          `To print the screen onto physical paper`,
          `To delete files from the hard drive automatically`,
        ],
        correctAnswer: 0,
        explanation: `Conditional statements allow programs to choose different execution paths based on true/false conditions.`,
        skillArea: "Conditionals",
      },
      {
        id: 6,
        question: `What is an "array" or "list" primarily used for in ${topic}?`,
        options: [
          `To hold an ordered collection of multiple items under a single variable name`,
          `To connect the computer to the internet`,
          `To format the computer hard drive`,
          `To change the desktop wallpaper`,
        ],
        correctAnswer: 0,
        explanation: `Arrays and lists store multiple items sequentially in memory accessible by an index.`,
        skillArea: "Collections",
      },
      {
        id: 7,
        question: `What does the term "function" or "method" mean for a beginner in ${topic}?`,
        options: [
          `A reusable block of code that performs a specific task when called`,
          `A key on the keyboard that cannot be pressed`,
          `A physical cord attached to the screen`,
          `A software bug that cannot be fixed`,
        ],
        correctAnswer: 0,
        explanation: `Functions bundle reusable logic that can accept inputs, execute operations, and return results.`,
        skillArea: "Functions",
      },
      {
        id: 8,
        question: `In text representations, what is a sequence of characters enclosed in quotes called?`,
        options: [
          `A string`,
          `A boolean`,
          `A pointer`,
          `A thread`,
        ],
        correctAnswer: 0,
        explanation: `Text characters inside quotes (like "Hello World") are classified as strings.`,
        skillArea: "Data Types",
      },
      {
        id: 9,
        question: `What does "debugging" mean when working on a project in ${topic}?`,
        options: [
          `Finding and fixing mistakes or errors in code`,
          `Cleaning dust off the computer keyboard`,
          `Buying a faster internet connection`,
          `Deleting all code and starting over`,
        ],
        correctAnswer: 0,
        explanation: `Debugging is the routine process of detecting and removing bugs or logic errors.`,
        skillArea: "Fundamentals",
      },
      {
        id: 10,
        question: `Why do programmers write comments inside their code?`,
        options: [
          `To explain what the code does for humans reading it; the computer ignores them`,
          `To make the computer run faster`,
          `To send secret emails over the network`,
          `To create internet passwords`,
        ],
        correctAnswer: 0,
        explanation: `Comments are explanatory notes in source code intended for developers, ignored by interpreters and compilers.`,
        skillArea: "Code Readability",
      },
    ];
  }

  // 2. BEGINNER: Everyday problem solving, simple functions, common data structures
  if (normalizedLevel.includes("beginner") && !normalizedLevel.includes("very")) {
    return [
      {
        id: 1,
        question: `In ${topic}, what is the main benefit of modularizing code into functions?`,
        options: [
          `Improving readability, reusability, and reducing code duplication`,
          `Forcing the operating system to allocate infinite RAM`,
          `Preventing other developers from seeing your variables`,
          `Speeding up the internet download speed`,
        ],
        correctAnswer: 0,
        explanation: `Functions promote DRY (Don't Repeat Yourself) design and modular maintainability.`,
        skillArea: "Modularity",
      },
      {
        id: 2,
        question: `What happens when you access an index beyond the length of an array in most languages?`,
        options: [
          `An "Index Out of Bounds" error or undefined value is returned`,
          `The computer reboots immediately`,
          `The array automatically doubles without warning`,
          `The internet connection is severed`,
        ],
        correctAnswer: 0,
        explanation: `Accessing out-of-range indices triggers boundary exceptions or returns undefined.`,
        skillArea: "Arrays & Bounds",
      },
      {
        id: 3,
        question: `What is the expected time complexity to access an element by index in a standard array?`,
        options: [
          `O(1) - Constant time`,
          `O(N) - Linear time`,
          `O(N^2) - Quadratic time`,
          `O(log N) - Logarithmic time`,
        ],
        correctAnswer: 0,
        explanation: `Direct memory address offsets allow O(1) instantaneous array lookups by index.`,
        skillArea: "Complexity Basics",
      },
      {
        id: 4,
        question: `Which data structure follows the "Last In, First Out" (LIFO) principle?`,
        options: [
          `Stack`,
          `Queue`,
          `Linked List`,
          `Hash Map`,
        ],
        correctAnswer: 0,
        explanation: `A Stack pushes and pops items from the top in LIFO order.`,
        skillArea: "Data Structures",
      },
      {
        id: 5,
        question: `Which data structure follows the "First In, First Out" (FIFO) principle?`,
        options: [
          `Queue`,
          `Stack`,
          `Binary Tree`,
          `Heap`,
        ],
        correctAnswer: 0,
        explanation: `A Queue enqueues at the back and dequeues from the front in FIFO order.`,
        skillArea: "Data Structures",
      },
      {
        id: 6,
        question: `What is the difference between '=' and '==' in many programming languages?`,
        options: [
          `'=' is used for assignment, while '==' is used for equality comparison`,
          `'=' is for multiplication and '==' is for division`,
          `They are completely interchangeable with no difference`,
          `'==' deletes a variable from memory`,
        ],
        correctAnswer: 0,
        explanation: `'=' assigns a value to a variable; '==' checks if two expressions evaluate to equal values.`,
        skillArea: "Operators",
      },
      {
        id: 7,
        question: `What is a key-value store commonly called in ${topic}?`,
        options: [
          `Dictionary, Hash Map, or Object`,
          `Array pointer`,
          `Stack pointer`,
          `Binary operator`,
        ],
        correctAnswer: 0,
        explanation: `Hash maps or dictionaries map unique keys directly to corresponding values.`,
        skillArea: "Hash Maps",
      },
      {
        id: 8,
        question: `How does basic error handling with 'try-catch' help a program?`,
        options: [
          `It intercepts runtime exceptions gracefully and prevents the application from crashing`,
          `It corrects syntax errors before code runs`,
          `It optimizes database queries automatically`,
          `It turns off error warnings completely`,
        ],
        correctAnswer: 0,
        explanation: `Try-catch blocks catch runtime exceptions so programs can recover or log errors cleanly.`,
        skillArea: "Error Handling",
      },
      {
        id: 9,
        question: `What does "scope" refer to regarding a variable in ${topic}?`,
        options: [
          `The region of code where the variable is recognized and accessible`,
          `The maximum byte size the variable can hold`,
          `The font color of the variable in the editor`,
          `The speed at which the variable is compiled`,
        ],
        correctAnswer: 0,
        explanation: `Scope defines the visibility and lifetime of variable declarations across blocks and functions.`,
        skillArea: "Scope & Closures",
      },
      {
        id: 10,
        question: `In modern ${topic}, what is version control (like Git) used for?`,
        options: [
          `Tracking changes in source code and collaborating with teammates over time`,
          `Testing computer hardware speeds`,
          `Hosting website domains for free`,
          `Writing documentation essays`,
        ],
        correctAnswer: 0,
        explanation: `Git tracks revisions, branches features, and merges collaborative work cleanly.`,
        skillArea: "Developer Tools",
      },
    ];
  }

  // 3. INTERMEDIATE: Optimization, trade-offs, state management, asynchronous flow
  if (normalizedLevel.includes("intermediate")) {
    return [
      {
        id: 1,
        question: `In ${topic}, what is the time complexity difference between Binary Search and Linear Search on a sorted array?`,
        options: [
          `Binary search is O(log N) while linear search is O(N)`,
          `Binary search is O(N^2) while linear search is O(N)`,
          `Both are identical at O(1)`,
          `Linear search is faster because it does not require halving`,
        ],
        correctAnswer: 0,
        explanation: `Binary search eliminates half the remaining elements per iteration, yielding O(log N) time.`,
        skillArea: "Search Algorithms",
      },
      {
        id: 2,
        question: `What is the primary benefit of using a Hash Map for lookup operations in ${topic}?`,
        options: [
          `Average O(1) constant time lookups by hashing keys directly`,
          `Guaranteed sorted order of all stored keys`,
          `Zero memory overhead compared to raw arrays`,
          `Automatic multithreaded synchronization`,
        ],
        correctAnswer: 0,
        explanation: `Hash maps compute bucket indices from keys, achieving O(1) average lookup performance.`,
        skillArea: "Data Structures",
      },
      {
        id: 3,
        question: `What problem does an asynchronous non-blocking event loop solve in ${topic}?`,
        options: [
          `It handles multiple concurrent I/O operations without locking the execution thread`,
          `It executes CPU-intensive matrix operations without utilizing the CPU`,
          `It bypasses network security protocols`,
          `It eliminates memory allocation needs`,
        ],
        correctAnswer: 0,
        explanation: `Non-blocking event loops delegate I/O tasks and process callbacks when data arrives.`,
        skillArea: "Concurrency & Async",
      },
      {
        id: 4,
        question: `When designing database queries in ${topic}, why are B-tree indexes added to columns?`,
        options: [
          `To speed up filtering and lookups from full table scans O(N) to O(log N)`,
          `To encrypt all records stored in the database`,
          `To automatically compress image assets`,
          `To prevent write operations completely`,
        ],
        correctAnswer: 0,
        explanation: `B-tree indexes provide sorted logarithmic traversal paths for fast query matching.`,
        skillArea: "Databases & Indexing",
      },
      {
        id: 5,
        question: `What is "idempotency" in RESTful APIs and distributed systems?`,
        options: [
          `An operation that produces identical results regardless of how many times it is repeated`,
          `An API that only handles one request per second`,
          `A database that cannot be updated`,
          `An authentication token that never expires`,
        ],
        correctAnswer: 0,
        explanation: `Idempotent operations (like HTTP PUT or GET) leave the system in the same state if retried.`,
        skillArea: "API Design",
      },
      {
        id: 6,
        question: `What is a common trade-off when implementing caching tiers (e.g. Redis) in ${topic}?`,
        options: [
          `Trading additional RAM and cache invalidation complexity for reduced database read latency`,
          `Trading disk space for slower CPU clock speed`,
          `Eliminating security encryption to boost speed`,
          `Replacing the primary database completely`,
        ],
        correctAnswer: 0,
        explanation: `Caching reduces latency but introduces cache invalidation challenges and memory costs.`,
        skillArea: "System Performance",
      },
      {
        id: 7,
        question: `How does optimistic locking differ from pessimistic locking when handling concurrent updates?`,
        options: [
          `Optimistic checks version timestamps before writing; pessimistic locks rows during reading`,
          `Pessimistic assumes no collisions will ever happen`,
          `Optimistic locks the entire database server`,
          `Neither locking mechanism protects against race conditions`,
        ],
        correctAnswer: 0,
        explanation: `Optimistic locking verifies versions at commit time; pessimistic locking holds locks throughout.`,
        skillArea: "Concurrency & Transactions",
      },
      {
        id: 8,
        question: `What is the difference between debounce and throttle in front-end and event programming?`,
        options: [
          `Debounce delays execution until inactivity; throttle limits execution to once every interval`,
          `Debounce speeds up animations; throttle deletes event listeners`,
          `They are identical terms for multithreading`,
          `Throttle only applies to database queries`,
        ],
        correctAnswer: 0,
        explanation: `Debounce waits for silence; throttle enforces a steady maximum firing rate.`,
        skillArea: "Performance Patterns",
      },
      {
        id: 9,
        question: `What causes an application memory leak in garbage-collected environments like Node.js or browsers?`,
        options: [
          `Retaining lingering references in global caches, uncleaned intervals, or detached DOM nodes`,
          `Allocating primitive integers inside function scopes`,
          `Using too many CSS styles`,
          `Restarting the server daily`,
        ],
        correctAnswer: 0,
        explanation: `Garbage collectors cannot reclaim objects that are still reachable from active roots.`,
        skillArea: "Memory Management",
      },
      {
        id: 10,
        question: `Why is parameterization critical when executing SQL queries with user inputs?`,
        options: [
          `It treats inputs strictly as literal data, preventing SQL Injection vulnerabilities`,
          `It speeds up database CPU clock rates`,
          `It formats JSON strings automatically`,
          `It bypasses foreign key constraints`,
        ],
        correctAnswer: 0,
        explanation: `Parameterized queries separate query logic from user data, neutralizing injection exploits.`,
        skillArea: "Security",
      },
    ];
  }

  // 4. ADVANCED: High scale, distributed systems, deep memory, race conditions, architecture
  return [
    {
      id: 1,
      question: `Under CAP theorem in distributed systems, how does partition tolerance impact consistency and availability?`,
      options: [
        `During network partitions, a system must trade off between returning stale reads (AP) vs rejecting writes to preserve consistency (CP)`,
        `A distributed system can achieve 100% C, A, and P simultaneously across global networks`,
        `Partition tolerance is avoidable by adding more memory to nodes`,
        `Consistency requires turning off database replication`,
      ],
      correctAnswer: 0,
      explanation: `Network partitions are inevitable; distributed architectures must choose CP or AP semantics.`,
      skillArea: "Distributed Systems",
    },
    {
      id: 2,
      question: `In high-throughput microservices, how does the Circuit Breaker pattern prevent cascading failures?`,
      options: [
        `It trips open after consecutive downstream errors, failing fast and allowing the dependency to recover`,
        `It retries failed network calls indefinitely with zero backoff`,
        `It terminates all consumer processes upon first error`,
        `It encrypts incoming TCP packets`,
      ],
      correctAnswer: 0,
      explanation: `Circuit breakers fail fast when downstream services struggle, protecting caller threads.`,
      skillArea: "Fault Tolerance",
    },
    {
      id: 3,
      question: `What is the core distinction between strong consistency and eventual consistency in distributed databases?`,
      options: [
        `Strong consistency guarantees all nodes read the latest write immediately; eventual guarantees convergence over time`,
        `Eventual consistency guarantees zero network latency`,
        `Strong consistency requires no synchronization between replicas`,
        `Eventual consistency never updates secondary replicas`,
      ],
      correctAnswer: 0,
      explanation: `Eventual consistency trades instantaneous synchronization for high write availability and low latency.`,
      skillArea: "Database Systems",
    },
    {
      id: 4,
      question: `Which memory model primitive prevents compiler instruction reordering and CPU cache incoherence in multithreading?`,
      options: [
        `Memory fences / barriers and volatile/atomic semantics`,
        `Standard local variable declarations`,
        `Increasing system swap space`,
        `Garbage collection cycles`,
      ],
      correctAnswer: 0,
      explanation: `Memory fences enforce hardware and compiler ordering constraints across processor cores.`,
      skillArea: "Low-Level Concurrency",
    },
    {
      id: 5,
      question: `What architectural strategy best resolves write contention bottlenecks on hot partition keys in distributed storage?`,
      options: [
        `Key salting / hashing combined with asynchronous append-only event sourcing`,
        `Locking the master database row for all concurrent transactions`,
        `Writing all updates synchronously to a single file on disk`,
        `Disabling replication to single instances`,
      ],
      correctAnswer: 0,
      explanation: `Salting distributes write traffic across multiple partition shards to eliminate hotspots.`,
      skillArea: "Scalability & Storage",
    },
    {
      id: 6,
      question: `In modern container orchestration (e.g. Kubernetes), what is the role of readiness vs liveness probes?`,
      options: [
        `Liveness restarts crashed pods; readiness controls whether traffic is routed to the pod`,
        `Readiness restarts pods; liveness routes internet traffic`,
        `Both probes execute identical operating system reboot sequences`,
        `Probes are only used for logging disk space`,
      ],
      correctAnswer: 0,
      explanation: `Liveness detects deadlocks to trigger restarts; readiness ensures dependencies are ready before taking traffic.`,
      skillArea: "DevOps & Infrastructure",
    },
    {
      id: 7,
      question: `What mathematical guarantee does Raft or Paxos consensus provide to distributed state machines?`,
      options: [
        `Safety: all non-faulty nodes agree on identical log entries in the same sequence despite network delays and dropouts`,
        `Instantaneous zero-millisecond transaction finality globally`,
        `Ability to continue normal voting with fewer than a minority quorum of nodes`,
        `Total elimination of CPU clock drift`,
      ],
      correctAnswer: 0,
      explanation: `Consensus algorithms ensure deterministic, linearized log replication across majorities.`,
      skillArea: "Consensus Protocols",
    },
    {
      id: 8,
      question: `When tuning garbage collection for low-latency trading or real-time pipelines, what is the key mitigation for Stop-The-World pauses?`,
      options: [
        `Off-heap memory allocation, object pooling, and concurrent/generational collectors (e.g. ZGC)`,
        `Triggering System.gc() after every user transaction`,
        `Disabling garbage collection and letting processes crash`,
        `Increasing thread count indefinitely`,
      ],
      correctAnswer: 0,
      explanation: `Off-heap memory and concurrent collectors minimize pause times in latency-critical workloads.`,
      skillArea: "Runtime Performance",
    },
    {
      id: 9,
      question: `How does CQRS (Command Query Responsibility Segregation) optimize high-scale transactional systems?`,
      options: [
        `It separates write data models from read projection models, enabling independent scaling and specialized indexing`,
        `It combines all reads and writes into a single synchronous SQL table`,
        `It deprecates relational database engines in favor of flat text files`,
        `It forces clients to query backend services via raw sockets`,
      ],
      correctAnswer: 0,
      explanation: `CQRS decouples write throughput from read query complexity, allowing tailored data representations.`,
      skillArea: "Architectural Patterns",
    },
    {
      id: 10,
      question: `What security threat does Mutual TLS (mTLS) solve in service-to-service microservice meshes?`,
      options: [
        `Bi-directional cryptographic verification of both client and server identity alongside transit encryption`,
        `Client-side SQL injection mitigation`,
        `DDoS attack prevention at DNS level`,
        `Automated code linting during builds`,
      ],
      correctAnswer: 0,
      explanation: `mTLS requires both parties to present verified certificates, ensuring zero-trust transport security.`,
      skillArea: "Security & Zero Trust",
    },
  ];
}

async function legacyAssessmentQuestions(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const {
      topicTitle = "Programming & DSA",
      levelTitle = "Beginner",
      numQuestions = 10,
    } = body || {};

    // 1. Try OpenAI API
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: `You are an expert technical educator and interviewer.
Generate exactly ${numQuestions} multiple choice questions for the topic "${topicTitle}" calibrated STRICTLY to the difficulty level "${levelTitle}".

Difficulty calibration rules (MUST follow):
- Very Beginner: Extremely simple questions about basic terminology, what is a variable, what is a loop, what is a function. No jargon. Suitable for someone who has never programmed.
- Beginner: Simple everyday programming concepts — arrays, functions, scope, basic data structures like stacks and queues. Avoid complex algorithms.
- Intermediate: Real-world problems — time complexity, async/await, database indexes, caching, API design, state management. Moderate difficulty requiring hands-on experience.
- Advanced: Deep architectural, distributed systems, CAP theorem, consensus protocols, memory models, high-scale tradeoffs. Requires 3+ years of engineering experience.

Each question must have 4 distinct options, exactly 1 correct answer (index 0, 1, 2, or 3), a concise explanation, and a skillArea tag.
Return ONLY a raw JSON array. No markdown. No backticks. Valid JSON only:
[
  {
    "id": 1,
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct",
    "skillArea": "Basics & Terminology"
  }
]`,
              },
              {
                role: "user",
                content: `Generate ${numQuestions} questions for topic: "${topicTitle}", difficulty: "${levelTitle}". Follow the difficulty calibration rules strictly.`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length >= 5) {
            return NextResponse.json({
              source: "openai",
              topicTitle,
              levelTitle,
              questions: parsed.slice(0, numQuestions),
            });
          }
        }
      } catch (err) {
        console.warn("OpenAI API assessment question fetch error:", err);
      }
    }

    // 2. Try Gemini fallback
    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Generate exactly ${numQuestions} multiple choice questions for technical topic "${topicTitle}" at "${levelTitle}" level.
Output ONLY a JSON array of objects with keys: id, question, options (array of 4 strings), correctAnswer (index 0..3), explanation, skillArea.
Do not use markdown backticks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return NextResponse.json({
            source: "gemini-ai",
            topicTitle,
            levelTitle,
            questions: parsed.slice(0, numQuestions),
          });
        }
      } catch (err) {
        console.warn("Gemini assessment question fetch error:", err);
      }
    }

    // 3. High quality fallback
    const fallback = getCuratedQuestions(topicTitle, levelTitle);
    return NextResponse.json({
      source: "curated-library",
      topicTitle,
      levelTitle,
      questions: fallback.slice(0, numQuestions),
    });
  } catch (error) {
    console.error("Assessment questions endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to generate assessment questions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "student") {
      return NextResponse.json({ error: "Only students may take diagnostic assessments." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const selection = resolveDiagnosticSelection(body?.topicId, body?.levelId);
    const { topic, level, blueprint } = selection;
    const slots = getBlueprintSlots(blueprint);
    const allocationInstructions = blueprint.allocations.map((allocation) => {
      const concept = getDiagnosticConcept(allocation.conceptKey);
      return {
        skillKey: allocation.skillKey,
        conceptKey: allocation.conceptKey,
        concept: concept?.label,
        conceptDescription: concept?.description,
        questionCount: allocation.questionCount,
        questionType: allocation.questionType,
      };
    });
    const generationContract = JSON.stringify({
      topicId: selection.topicId,
      levelId: selection.levelId,
      totalQuestions: blueprint.totalQuestions,
      allocations: allocationInstructions,
    });
    const outputShape = `[
  {
    "id": 1,
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct",
    "skillKey": "${slots[0].skillKey}",
    "conceptKey": "${slots[0].conceptKey}",
    "questionType": "${slots[0].questionType}"
  }
]`;
    const systemPrompt = `You are a technical assessment question writer.
The application controls the topic, level, skill keys, concept keys, question counts, and question types.
Generate exactly ${blueprint.totalQuestions} questions in the allocation order below.
For every question, copy skillKey, conceptKey, and questionType exactly from its allocation. Never invent or rename them.
Each question must have exactly four distinct options and exactly one correct option.
Question type constraints: conceptual tests understanding; code uses a short code or implementation example; debugging diagnoses a defect; scenario presents an engineering situation; complexity asks about efficiency or trade-offs.
Return only a raw JSON array with no markdown.
Controlled assessment contract:
${generationContract}
Required object shape:
${outputShape}`;

    const userPrompt = `Generate the ${blueprint.totalQuestions} questions for ${topic.title} at ${level.title}. Use only the supplied allocations and keep the exact allocation order.`;

    const createQuestionResponse = (questions: AssessmentQuestion[], source: string) => {
      const assessmentId = createDiagnosticAssessmentSnapshot({
        userId: user.id,
        topicId: selection.topicId,
        levelId: selection.levelId,
        blueprintId: blueprint.blueprintId,
        questions,
      });
      return NextResponse.json({
        assessmentId,
        source,
        topicTitle: topic.title,
        levelTitle: level.title,
        // Correct answers remain in the server-side snapshot until submission.
        questions: questions.map(({ correctAnswer: _correctAnswer, ...question }) => question),
      });
    };
    const acceptProviderOutput = (value: unknown, source: string) =>
      createQuestionResponse(validateGeneratedQuestions(value, blueprint), source);

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,

          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim() || "";
          return acceptProviderOutput(parseGeneratedJson(content), "openai");
        }
      } catch (error) {
        console.warn("OpenAI output rejected; trying the next source:", error);
      }
    }

    const ai = getGenAI();
    if (ai) {
      try {
        const model = ai.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });
        const result = await model.generateContent(`${systemPrompt}\n${userPrompt}`);
        return acceptProviderOutput(parseGeneratedJson(result.response.text()), "gemini-ai");
      } catch (error) {
        console.warn("Gemini output rejected; using the deterministic fallback:", error);
      }
    }

    return createQuestionResponse(buildFallbackQuestions(topic.title, blueprint), "taxonomy-fallback");
  } catch (error) {
    console.error("Assessment questions endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate assessment questions" },
      { status: 400 },
    );
  }
}
