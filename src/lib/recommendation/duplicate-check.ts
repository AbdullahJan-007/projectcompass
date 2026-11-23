import type { DuplicateRiskLevel } from "@prisma/client";
import type { SimilarArchiveItem } from "@/types/actions";

export const MODERATE_DUPLICATE_THRESHOLD = 0.72;
export const HIGH_DUPLICATE_THRESHOLD = 0.82;

export interface DuplicateEvaluationResult {
  duplicateRisk: DuplicateRiskLevel;
  highestArchiveSimilarity: number;
  topMatches: SimilarArchiveItem[];
  requiresDifferentiation: boolean;
  defaultDifferentiationAngle: string | null;
}

/**
 * Evaluates cosine similarity against archived department FYP records.
 * - < 0.72 -> LOW
 * - 0.72..0.819 -> MODERATE
 * - >= 0.82 -> HIGH (mandatory differentiationAngle required)
 */
export function classifyDuplicateRisk(similarity: number): DuplicateRiskLevel {
  const rounded = Number(similarity.toFixed(4));
  if (rounded >= HIGH_DUPLICATE_THRESHOLD) {
    return "HIGH";
  }
  if (rounded >= MODERATE_DUPLICATE_THRESHOLD) {
    return "MODERATE";
  }
  return "LOW";
}

export function evaluateArchiveDuplicates(
  candidateTitle: string,
  candidateDomain: string,
  archiveMatches: readonly SimilarArchiveItem[]
): DuplicateEvaluationResult {
  const sorted = [...archiveMatches]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map((m) => ({
      ...m,
      similarity: Number(m.similarity.toFixed(4)),
    }));

  const highest = sorted[0]?.similarity ?? 0;
  const duplicateRisk = classifyDuplicateRisk(highest);
  const requiresDifferentiation = duplicateRisk === "HIGH";

  const topMatch = sorted[0];
  const defaultDifferentiationAngle =
    requiresDifferentiation && topMatch
      ? `Differentiates from "${topMatch.title}" (${topMatch.academicYear}, ${(
          topMatch.similarity * 100
        ).toFixed(0)}% similarity) by replacing passive ${candidateDomain} reporting with deterministic vector/AST root-cause attribution, automated regression benchmarks, and strict multi-tenant verification.`
      : null;

  return {
    duplicateRisk,
    highestArchiveSimilarity: highest,
    topMatches: sorted,
    requiresDifferentiation,
    defaultDifferentiationAngle,
  };
}
