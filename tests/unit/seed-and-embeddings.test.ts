import { describe, it, expect } from "vitest";
import {
  CANONICAL_SKILLS,
  SEED_IDEA_TEMPLATES,
  MARKET_TREND_SNAPSHOTS,
  DEMO_SUPERVISORS,
  DEMO_PROJECT_ARCHIVES,
} from "@/lib/recommendation/seed-data";
import {
  EMBEDDING_DIMENSIONS,
  generateDeterministicEmbedding,
  cosineSimilarity,
} from "@/lib/ai/embeddings";

describe("Phase 2: Cold-Start Seed Catalog & Deterministic Embeddings", () => {
  it("contains 60+ canonical skills, 40+ seed archetypes, 12 market trends, 5 supervisors, and 10 archives", () => {
    expect(CANONICAL_SKILLS.length).toBeGreaterThanOrEqual(60);
    expect(SEED_IDEA_TEMPLATES.length).toBeGreaterThanOrEqual(40);
    expect(MARKET_TREND_SNAPSHOTS.length).toBe(12);
    expect(DEMO_SUPERVISORS.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_PROJECT_ARCHIVES.length).toBeGreaterThanOrEqual(10);

    const uniqueSkillSlugs = new Set(CANONICAL_SKILLS.map((s) => s.slug));
    expect(uniqueSkillSlugs.size).toBe(CANONICAL_SKILLS.length);

    for (const seed of SEED_IDEA_TEMPLATES) {
      for (const reqSlug of seed.requiredSkillSlugs) {
        expect(uniqueSkillSlugs.has(reqSlug)).toBe(true);
      }
    }
  });

  it("generates normalized 1536-dim embeddings with self-similarity of 1", () => {
    const textA = "TypeScript Next.js PostgreSQL pgvector CI Log Anomaly Triage";
    const textB = "MQTT Embedded ESP32 Cold-Storage Sensor Telemetry";

    const vecA = generateDeterministicEmbedding(textA);
    const vecA2 = generateDeterministicEmbedding(textA);
    const vecB = generateDeterministicEmbedding(textB);

    expect(vecA.length).toBe(EMBEDDING_DIMENSIONS);
    expect(vecA).toEqual(vecA2);

    const selfSim = cosineSimilarity(vecA, vecA2);
    const crossSim = cosineSimilarity(vecA, vecB);

    expect(selfSim).toBeGreaterThanOrEqual(0.999);
    expect(crossSim).toBeLessThan(selfSim);
  });
});
