import {
  diagnosticTaxonomy,
  DIAGNOSTIC_LEVELS,
  DIAGNOSTIC_TAXONOMY_VERSION,
  type DiagnosticLevelId,
  type DiagnosticTopic,
  type DiagnosticTopicId,
} from "@/lib/diagnostic-taxonomy";

export const DIAGNOSTIC_BLUEPRINT_VERSION = "diagnostic-blueprint-v1.0.0" as const;
export const DIAGNOSTIC_QUESTION_COUNT = 10 as const;

export type DiagnosticQuestionType = "conceptual" | "code" | "debugging" | "scenario" | "complexity";

export interface DiagnosticConceptAllocation {
  readonly skillKey: string;
  readonly conceptKey: string;
  readonly questionCount: number;
  readonly questionType: DiagnosticQuestionType;
}

export interface DiagnosticBlueprint {
  readonly blueprintId: string;
  readonly taxonomyVersion: typeof DIAGNOSTIC_TAXONOMY_VERSION;
  readonly blueprintVersion: typeof DIAGNOSTIC_BLUEPRINT_VERSION;
  readonly topicId: DiagnosticTopicId;
  readonly levelId: DiagnosticLevelId;
  readonly totalQuestions: typeof DIAGNOSTIC_QUESTION_COUNT;
  readonly allocations: readonly DiagnosticConceptAllocation[];
}

type AllocationPlan = readonly [string, number, DiagnosticQuestionType];

const plans: Record<DiagnosticTopicId, Record<DiagnosticLevelId, readonly AllocationPlan[]>> = {
  dsa: {
    "very-beginner": [["dsa.programming-fundamentals", 6, "conceptual"], ["dsa.linear-data-structures", 4, "conceptual"]],
    beginner: [["dsa.programming-fundamentals", 2, "code"], ["dsa.linear-data-structures", 3, "code"], ["dsa.searching-and-sorting", 3, "code"], ["dsa.complexity-analysis", 2, "complexity"]],
    intermediate: [["dsa.linear-data-structures", 2, "code"], ["dsa.searching-and-sorting", 2, "complexity"], ["dsa.trees-and-graphs", 2, "code"], ["dsa.algorithmic-techniques", 2, "scenario"], ["dsa.complexity-analysis", 2, "complexity"]],
    advanced: [["dsa.searching-and-sorting", 2, "complexity"], ["dsa.trees-and-graphs", 3, "scenario"], ["dsa.algorithmic-techniques", 3, "scenario"], ["dsa.complexity-analysis", 2, "complexity"]],
  },
  "web-dev": {
    "very-beginner": [["web-dev.web-foundations", 6, "conceptual"], ["web-dev.javascript", 4, "conceptual"]],
    beginner: [["web-dev.web-foundations", 2, "code"], ["web-dev.javascript", 3, "code"], ["web-dev.components-and-state", 3, "code"], ["web-dev.http-and-api-contracts", 2, "conceptual"]],
    intermediate: [["web-dev.web-foundations", 1, "debugging"], ["web-dev.javascript", 2, "debugging"], ["web-dev.components-and-state", 3, "code"], ["web-dev.http-and-api-contracts", 2, "scenario"], ["web-dev.accessibility-and-production", 2, "scenario"]],
    advanced: [["web-dev.components-and-state", 3, "scenario"], ["web-dev.http-and-api-contracts", 3, "scenario"], ["web-dev.accessibility-and-production", 4, "scenario"]],
  },
  "db-sql": {
    "very-beginner": [["db-sql.relational-foundations", 6, "conceptual"], ["db-sql.querying", 4, "code"]],
    beginner: [["db-sql.relational-foundations", 2, "conceptual"], ["db-sql.querying", 4, "code"], ["db-sql.performance", 2, "conceptual"], ["db-sql.safe-access", 2, "code"]],
    intermediate: [["db-sql.relational-foundations", 1, "scenario"], ["db-sql.querying", 3, "code"], ["db-sql.performance", 2, "complexity"], ["db-sql.transactions", 2, "scenario"], ["db-sql.safe-access", 2, "debugging"]],
    advanced: [["db-sql.querying", 3, "code"], ["db-sql.performance", 2, "complexity"], ["db-sql.transactions", 3, "scenario"], ["db-sql.safe-access", 2, "scenario"]],
  },
  "system-design": {
    "very-beginner": [["system-design.architecture-foundations", 10, "conceptual"]],
    beginner: [["system-design.architecture-foundations", 3, "conceptual"], ["system-design.scalability", 2, "scenario"], ["system-design.async-processing", 3, "conceptual"], ["system-design.reliability", 2, "scenario"]],
    intermediate: [["system-design.architecture-foundations", 1, "scenario"], ["system-design.scalability", 3, "scenario"], ["system-design.async-processing", 2, "scenario"], ["system-design.consistency-and-data", 2, "scenario"], ["system-design.reliability", 2, "debugging"]],
    advanced: [["system-design.scalability", 3, "scenario"], ["system-design.async-processing", 2, "scenario"], ["system-design.consistency-and-data", 3, "scenario"], ["system-design.reliability", 2, "scenario"]],
  },
  "ai-ml": {
    "very-beginner": [["ai-ml.ml-foundations", 10, "conceptual"]],
    beginner: [["ai-ml.ml-foundations", 4, "conceptual"], ["ai-ml.evaluation", 3, "conceptual"], ["ai-ml.generative-ai", 3, "conceptual"]],
    intermediate: [["ai-ml.ml-foundations", 2, "scenario"], ["ai-ml.evaluation", 2, "scenario"], ["ai-ml.training", 2, "complexity"], ["ai-ml.deep-learning", 2, "conceptual"], ["ai-ml.generative-ai", 2, "scenario"]],
    advanced: [["ai-ml.evaluation", 2, "scenario"], ["ai-ml.training", 2, "scenario"], ["ai-ml.deep-learning", 3, "scenario"], ["ai-ml.generative-ai", 3, "scenario"]],
  },
  "cloud-devops": {
    "very-beginner": [["cloud-devops.infrastructure", 8, "conceptual"], ["cloud-devops.versioned-delivery", 2, "conceptual"]],
    beginner: [["cloud-devops.infrastructure", 2, "conceptual"], ["cloud-devops.versioned-delivery", 3, "conceptual"], ["cloud-devops.containers", 3, "code"], ["cloud-devops.operations", 2, "conceptual"]],
    intermediate: [["cloud-devops.infrastructure", 2, "scenario"], ["cloud-devops.versioned-delivery", 2, "scenario"], ["cloud-devops.containers", 2, "debugging"], ["cloud-devops.operations", 2, "debugging"], ["cloud-devops.security", 2, "scenario"]],
    advanced: [["cloud-devops.infrastructure", 2, "scenario"], ["cloud-devops.versioned-delivery", 2, "scenario"], ["cloud-devops.containers", 2, "scenario"], ["cloud-devops.operations", 2, "scenario"], ["cloud-devops.security", 2, "scenario"]],
  },
  cybersecurity: {
    "very-beginner": [["cybersecurity.security-foundations", 10, "conceptual"]],
    beginner: [["cybersecurity.security-foundations", 3, "conceptual"], ["cybersecurity.identity", 3, "conceptual"], ["cybersecurity.application-security", 2, "conceptual"], ["cybersecurity.cryptography-and-network", 2, "conceptual"]],
    intermediate: [["cybersecurity.security-foundations", 2, "scenario"], ["cybersecurity.identity", 2, "scenario"], ["cybersecurity.application-security", 3, "debugging"], ["cybersecurity.cryptography-and-network", 2, "scenario"], ["cybersecurity.detection-and-response", 1, "scenario"]],
    advanced: [["cybersecurity.identity", 2, "scenario"], ["cybersecurity.application-security", 2, "scenario"], ["cybersecurity.cryptography-and-network", 2, "scenario"], ["cybersecurity.detection-and-response", 4, "scenario"]],
  },
  "os-systems": {
    "very-beginner": [["os-systems.processes-and-calls", 5, "conceptual"], ["os-systems.storage-and-io", 5, "conceptual"]],
    beginner: [["os-systems.processes-and-calls", 3, "conceptual"], ["os-systems.memory", 3, "conceptual"], ["os-systems.storage-and-io", 2, "conceptual"], ["os-systems.concurrency", 2, "conceptual"]],
    intermediate: [["os-systems.processes-and-calls", 2, "scenario"], ["os-systems.memory", 2, "scenario"], ["os-systems.concurrency", 3, "debugging"], ["os-systems.synchronization", 2, "debugging"], ["os-systems.storage-and-io", 1, "scenario"]],
    advanced: [["os-systems.memory", 3, "scenario"], ["os-systems.concurrency", 2, "scenario"], ["os-systems.synchronization", 3, "scenario"], ["os-systems.storage-and-io", 2, "scenario"]],
  },
};

function getTopic(topicId: DiagnosticTopicId): DiagnosticTopic {
  const topic = diagnosticTaxonomy.find((item) => item.id === topicId);
  if (!topic) throw new Error(`Unknown diagnostic topic: ${topicId}`);
  return topic;
}

function createBlueprint(
  topicId: DiagnosticTopicId,
  levelId: DiagnosticLevelId,
  plan: readonly AllocationPlan[],
): DiagnosticBlueprint {
  const topic = getTopic(topicId);
  let conceptOffset = 0;
  const allocations = plan.map(([skillKey, questionCount, questionType]) => {
    const skill = topic.skills.find((item) => item.key === skillKey);
    if (!skill) throw new Error(`Blueprint references unknown skill: ${skillKey}`);
    const concepts = skill.concepts.filter((concept) => concept.assessable && concept.levels.includes(levelId));
    if (concepts.length === 0) throw new Error(`No ${levelId} concept available for ${skillKey}`);
    const concept = concepts[conceptOffset % concepts.length];
    conceptOffset += 1;
    return {
      skillKey,
      conceptKey: concept.key,
      questionCount,
      questionType,
    };
  });

  return {
    blueprintId: `${topicId}.${levelId}`,
    taxonomyVersion: DIAGNOSTIC_TAXONOMY_VERSION,
    blueprintVersion: DIAGNOSTIC_BLUEPRINT_VERSION,
    topicId,
    levelId,
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    allocations,
  };
}

export const diagnosticBlueprints: readonly DiagnosticBlueprint[] = (
  Object.entries(plans) as [DiagnosticTopicId, Record<DiagnosticLevelId, readonly AllocationPlan[]>][]
).flatMap(([topicId, topicPlans]) =>
  DIAGNOSTIC_LEVELS.map(({ id: levelId }) => createBlueprint(topicId, levelId, topicPlans[levelId])),
);

export function getDiagnosticBlueprint(topicId: DiagnosticTopicId, levelId: DiagnosticLevelId): DiagnosticBlueprint {
  const blueprint = diagnosticBlueprints.find((item) => item.topicId === topicId && item.levelId === levelId);
  if (!blueprint) throw new Error(`Missing diagnostic blueprint: ${topicId}.${levelId}`);
  return blueprint;
}

export function validateDiagnosticBlueprints(
  blueprints: readonly DiagnosticBlueprint[] = diagnosticBlueprints,
): void {
  const expectedCount = diagnosticTaxonomy.length * DIAGNOSTIC_LEVELS.length;
  if (blueprints.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} diagnostic blueprints, received ${blueprints.length}`);
  }

  const seen = new Set<string>();
  for (const blueprint of blueprints) {
    const identity = `${blueprint.topicId}.${blueprint.levelId}`;
    if (seen.has(identity) || blueprint.blueprintId !== identity) {
      throw new Error(`Duplicate or invalid blueprint identity: ${identity}`);
    }
    seen.add(identity);

    const total = blueprint.allocations.reduce((sum, allocation) => sum + allocation.questionCount, 0);
    if (total !== DIAGNOSTIC_QUESTION_COUNT || blueprint.totalQuestions !== DIAGNOSTIC_QUESTION_COUNT) {
      throw new Error(`Blueprint ${identity} must allocate exactly 10 questions`);
    }

    const topic = getTopic(blueprint.topicId);
    const allocationConcepts = new Set<string>();
    for (const allocation of blueprint.allocations) {
      if (allocation.questionCount < 1 || allocationConcepts.has(allocation.conceptKey)) {
        throw new Error(`Invalid or duplicate concept allocation in ${identity}: ${allocation.conceptKey}`);
      }
      allocationConcepts.add(allocation.conceptKey);
      const skill = topic.skills.find((item) => item.key === allocation.skillKey);
      const concept = skill?.concepts.find((item) => item.key === allocation.conceptKey);
      if (!skill || !concept || !concept.assessable || !concept.levels.includes(blueprint.levelId)) {
        throw new Error(`Invalid concept reference in ${identity}: ${allocation.conceptKey}`);
      }
    }
  }
}

validateDiagnosticBlueprints();
