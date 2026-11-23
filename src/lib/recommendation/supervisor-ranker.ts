import { cosineSimilarity } from "@/lib/ai/embeddings";

export interface SupervisorCandidateInput {
  id: string;
  fullName: string;
  title: string;
  researchDomains: readonly string[];
  preferredStacks: readonly string[];
  skillSlugs: readonly string[];
  maxSlots: number;
  activeSlots: number;
  isAccepting: boolean;
  embedding: readonly number[];
}

export interface RankedSupervisorMatch {
  supervisorProfileId: string;
  fullName: string;
  title: string;
  rank: number;
  matchPercentage: number; // 0..100
  sharedKeywords: string[];
  availabilityAtMatch: number; // open slots
  maxSlots: number;
  activeSlots: number;
  rationale: string;
}

/**
 * Capacity-Guarded & Load-Balanced Supervisor Ranker:
 * - Excludes any supervisor with isAccepting === false or activeSlots >= maxSlots from primary matches.
 * - Blends:
 *   - 70% Domain Embedding Cosine Similarity
 *   - 20% Required Skill & Domain Tag Overlap
 *   - 10% Relative Remaining Slot Capacity ((maxSlots - activeSlots) / maxSlots) to prevent popular faculty overload
 */
export function rankAvailableSupervisors(
  ideaDomain: string,
  requiredSkillSlugs: readonly string[],
  ideaEmbedding: readonly number[],
  supervisors: readonly SupervisorCandidateInput[]
): {
  availableMatches: RankedSupervisorMatch[];
  fullCapacitySupervisors: SupervisorCandidateInput[];
} {
  const availablePool: SupervisorCandidateInput[] = [];
  const fullCapacitySupervisors: SupervisorCandidateInput[] = [];

  for (const sup of supervisors) {
    if (sup.isAccepting && sup.activeSlots < sup.maxSlots && sup.maxSlots > 0) {
      availablePool.push(sup);
    } else {
      fullCapacitySupervisors.push(sup);
    }
  }

  const reqLower = new Set(requiredSkillSlugs.map((s) => s.toLowerCase()));
  const domainLower = ideaDomain.toLowerCase();

  const scored = availablePool.map((sup) => {
    const vectorSim = cosineSimilarity(ideaEmbedding, sup.embedding);
    const domainExactMatch = sup.researchDomains.some(
      (d) => d.toLowerCase() === domainLower
    );

    // Boost semantic score when research domain explicitly matches idea domain
    const effectiveDomainSim = Math.min(
      1,
      vectorSim * 0.65 + (domainExactMatch ? 0.35 : 0.1)
    );

    const matchedSkills = sup.skillSlugs.filter((s) =>
      reqLower.has(s.toLowerCase())
    );
    const matchedDomains = sup.researchDomains.filter(
      (d) => d.toLowerCase() === domainLower
    );

    const skillOverlapRatio =
      requiredSkillSlugs.length > 0
        ? matchedSkills.length / requiredSkillSlugs.length
        : 0.5;

    const openSlots = Math.max(0, sup.maxSlots - sup.activeSlots);
    const remainingCapacityRatio = sup.maxSlots > 0 ? openSlots / sup.maxSlots : 0;

    // 70% domain similarity + 20% skill overlap + 10% remaining capacity anti-bias term
    const blendedScore =
      effectiveDomainSim * 0.7 +
      skillOverlapRatio * 0.2 +
      remainingCapacityRatio * 0.1;

    const matchPercentage = Math.max(
      45,
      Math.min(99, Math.round(blendedScore * 100))
    );

    const sharedKeywords = Array.from(
      new Set([...matchedDomains, ...matchedSkills])
    ).slice(0, 6);

    const rationale = `${sup.fullName} aligns on ${
      sharedKeywords.length > 0 ? sharedKeywords.join(", ") : sup.researchDomains[0] ?? "CS Systems"
    } with ${openSlots} of ${sup.maxSlots} supervision slots currently open.`;

    return {
      sup,
      blendedScore,
      matchPercentage,
      sharedKeywords,
      openSlots,
      rationale,
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);

  const availableMatches: RankedSupervisorMatch[] = scored.map((item, idx) => ({
    supervisorProfileId: item.sup.id,
    fullName: item.sup.fullName,
    title: item.sup.title,
    rank: idx + 1,
    matchPercentage: item.matchPercentage,
    sharedKeywords: item.sharedKeywords,
    availabilityAtMatch: item.openSlots,
    maxSlots: item.sup.maxSlots,
    activeSlots: item.sup.activeSlots,
    rationale: item.rationale,
  }));

  return {
    availableMatches,
    fullCapacitySupervisors,
  };
}
