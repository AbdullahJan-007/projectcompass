-- Enable pgvector extension in public schema (idempotent)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

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

-- Enable Row Level Security (RLS) across all 21 public tables with zero permissive
-- anon/authenticated PostgREST policies (complete public REST API lockdown)
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cohort" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FacultyAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupervisorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupervisorSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SeedIdeaTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectArchive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecommendationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecommendedIdea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdeaSkillGap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupervisorMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupervisorRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectRoadmap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoadmapMilestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketTrendSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
