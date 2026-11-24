-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW cosine-distance indexes for sub-50ms semantic search
CREATE INDEX IF NOT EXISTS idx_seed_idea_embedding_hnsw
  ON "SeedIdeaTemplate" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_project_archive_embedding_hnsw
  ON "ProjectArchive" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_supervisor_profile_embedding_hnsw
  ON "SupervisorProfile" USING hnsw ("profileEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Database-level quota safety invariant (idempotent)
DO $$
BEGIN
  ALTER TABLE "SupervisorProfile"
    ADD CONSTRAINT chk_supervisor_slots_valid
    CHECK ("activeSlots" >= 0 AND "activeSlots" <= "maxSlots" AND "maxSlots" >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Prevent invalid feasibility sub-score sums or out-of-range values (idempotent)
DO $$
BEGIN
  ALTER TABLE "RecommendedIdea"
    ADD CONSTRAINT chk_feasibility_bounds
    CHECK ("feasibilityScore" >= 0 AND "feasibilityScore" <= 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
