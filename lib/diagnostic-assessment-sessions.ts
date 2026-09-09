import "server-only";

import type { DiagnosticQuestionType } from "@/lib/diagnostic-blueprints";

export interface AuthoritativeDiagnosticQuestion {
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

export interface DiagnosticAssessmentSnapshot {
  id: string;
  userId: string;
  topicId: string;
  levelId: string;
  blueprintId: string;
  questions: AuthoritativeDiagnosticQuestion[];
  expiresAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var diagnosticAssessmentSnapshots: Map<string, DiagnosticAssessmentSnapshot> | undefined;
}

const snapshots = globalThis.diagnosticAssessmentSnapshots ?? new Map<string, DiagnosticAssessmentSnapshot>();
globalThis.diagnosticAssessmentSnapshots = snapshots;

function purgeExpiredSnapshots(now = Date.now()) {
  for (const [id, snapshot] of Array.from(snapshots.entries())) {
    if (snapshot.expiresAt <= now) snapshots.delete(id);
  }
}

export function createDiagnosticAssessmentSnapshot(
  snapshot: Omit<DiagnosticAssessmentSnapshot, "id" | "expiresAt">,
) {
  purgeExpiredSnapshots();
  const id = crypto.randomUUID();
  snapshots.set(id, { ...snapshot, id, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
}

export function getDiagnosticAssessmentSnapshot(id: string) {
  purgeExpiredSnapshots();
  return snapshots.get(id) ?? null;
}
