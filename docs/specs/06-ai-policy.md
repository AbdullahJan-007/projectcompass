# 06 — AI Architecture, Policy & Guardrails

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 15 (AI Architecture, Grounding Policy, Anti-Hallucination Controls, Fallback Design, Cost & Token Governance)

---

## 1. Core AI Design Principle

**AI is a structured workflow synthesizer, never the product's decision authority.**

Every institutional invariant—supervisor slot availability, department scoping, past-FYP vector similarity, skill-gap math, and the 4-factor Feasibility Score—is computed deterministically in PostgreSQL and TypeScript BEFORE the LLM is invoked. The LLM cannot invent fake supervisors, override capacity quotas, inflate feasibility scores, or bypass duplicate warnings.

### Division of Responsibility

| Task | Owned By | Why |
| :--- | :--- | :--- |
| Eligibility & supervisor capacity filtering | PostgreSQL SQL | Must be 100% deterministic and transactionally accurate. |
| Similarity to past FYPs & seed archetypes | `pgvector` (`text-embedding-3-small`, 1536 dims) | Measurable cosine distance; reproducible and auditable. |
| Feasibility Score (`0–100`) & 4 sub-scores | TypeScript math (`src/lib/recommendation/feasibility.ts`) | Fully explainable, unit-testable, zero score hallucination. |
| Track diversity selection (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`) | TypeScript MMR selector (`diversity.ts`) | Eliminates repetitive generic ideas mathematically. |
| Tailored problem framing, differentiation angle, stack rationale & milestone copy | LLM via Vercel AI SDK (`generateObject` + Zod) | High-value synthesis grounded strictly in retrieved context. |
| Fallback output on LLM failure/timeout | TypeScript deterministic synthesizer | Guarantees 100% availability during outages or live viva defense. |

---

## 2. Embeddings & Similarity Threshold Policy

- **Embedding Model:** OpenAI-compatible `text-embedding-3-small` (`1536` dimensions), configurable via `AI_EMBEDDING_MODEL`.
- **Canonical Input Construction:**
  - *Student Profile Embedding:* Concatenates structured fields (`Skills [with proficiency] + Interests + Career Goal + Preferred Project Type`) in a deterministic template—never embeds raw personal identifiers (name, email, student ID).
  - *Project Archive Embedding:* Concatenates `Title + Domain + Tech Stack + Cleaned Abstract` (truncated to `1,500` tokens).
  - *Supervisor Embedding:* Concatenates `Research Domains + Preferred Stacks + Skills + Research Bio`.
- **Duplicate Risk Thresholds (Cosine Similarity = `1 - cosine_distance`):**
  - `< 0.72` -> `LOW` (original direction; no warning).
  - `0.72` to `0.819` -> `MODERATE` (related past work shown as reference context).
  - `>= 0.82` -> `HIGH` (red/amber duplicate alert shown in UI; Stage 3 LLM MUST output a concrete `differentiationAngle` explaining what architectural, dataset, or evaluation novelty separates this proposal from the archived FYP).

---

## 3. Strict Structured Output Contract (`Vercel AI SDK` + Zod)

All LLM calls use `generateObject()` with strict Zod schemas (`src/lib/ai/schemas.ts`) and `temperature: 0.35` (low variance, high engineering rigor):

```typescript
export const SynthesizedIdeaSchema = z.object({
  track: z.enum(["CORE_SAFE", "CAREER_STRETCH", "RESEARCH_NICHE"]),
  seedTemplateId: z.string(),
  title: z.string().min(12).max(110),
  problemStatement: z.string().min(60).max(450),
  proposedSolution: z.string().min(80).max(600),
  differentiationAngle: z.string().min(40).max(350).nullable(),
  recommendedStack: z.array(
    z.object({
      layer: z.string().min(2).max(40),
      tech: z.string().min(2).max(60),
      rationale: z.string().min(15).max(180),
    })
  ).min(4).max(7),
  feasibilityExplanation: z.string().min(50).max(320),
  skillGapActions: z.array(
    z.object({
      skillSlug: z.string(),
      learningAction: z.string().min(20).max(200),
    })
  ),
});
```

### Post-Validation Integrity Checks
Even after Zod validates JSON shape, `engine.ts` verifies:
1. All 3 tracks (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`) are present and mapped to the exact 3 `seedTemplateId`s passed into the prompt.
2. If Stage 2 flagged `duplicateRisk === "HIGH"`, `differentiationAngle` MUST be non-null and `>= 40` characters; otherwise fallback differentiation text is injected.
3. Numeric feasibility sub-scores are NEVER read from LLM output—they are always bound directly from Stage 2 TypeScript computations.

---

## 4. Prompt Injection & Hallucination Guardrails

Because students enter free-text fields (`careerGoal`, optional `focusNote`) and coordinators upload external PDFs (`ProjectArchive.abstract`), untrusted text MUST NEVER be concatenated directly into system instructions:

1. **Strict Delimiter Isolation:** System prompt explicitly instructs the model that content inside `<student_context>` and `<archive_excerpt>` tags is untrusted data, never executable instructions.
2. **Input Sanitization:** Strip control characters, cap `focusNote` at `240` chars, cap `careerGoal` at `120` chars, and reject prompts containing obvious role-override patterns before embedding/synthesis.
3. **Closed-World Grounding:** The prompt supplies exact allowed `seedTemplateId`s, exact `skillSlug`s, and exact `similarArchives` titles/years; the model is forbidden from citing past projects not listed in `<archive_excerpt>`.
4. **Zero PII in Prompts:** Student names, emails, Clerk IDs, and GPA raw transcripts are never transmitted to the LLM API.

---

## 5. Resilience & Deterministic Fallback Policy

- **Timeout & Retry:** Every LLM request enforces `AbortSignal.timeout(25000)` (`25s`). Transient `429` or `5xx` errors trigger at most `1` retry with `1500ms` jittered backoff.
- **Automatic Fallback (`COMPLETED_FALLBACK`):** If the LLM call fails, times out, or fails Zod validation after 1 retry:
  1. `engine.ts` constructs all 3 `RecommendedIdea` records directly from the Stage 2 `SeedIdeaTemplate` records, computed 4-factor feasibility breakdown, deterministic skill-gap actions, and ranked available supervisors.
  2. `RecommendationRun.status` is set to `COMPLETED_FALLBACK`, `usedFallback = true`, and a warning event is captured in Sentry.
  3. The UI displays all 3 complete recommendations normally with a calm informational banner: *"AI narrative refinement was temporarily unavailable; recommendations and feasibility scores were generated using our deterministic matching engine."*

---

## 6. Token Budget & Cost Controls

| Operation | Max Input Tokens | Max Output Tokens | Est. Cost / Call (`gpt-4o-mini` class) | Hard Guardrail |
| :--- | :---: | :---: | :---: | :--- |
| Profile / Archive Embedding | `1,500` | N/A | `~$0.00003` | Cached until profile text hash changes |
| Hybrid Recommendation Synthesis (3 ideas) | `3,000` | `2,200` | `~$0.0018` | Max `5` runs / student / 24h |
| Project Roadmap Synthesis (4 phases) | `2,200` | `2,000` | `~$0.0015` | Max `10` generations / student / 24h |

Token usage (`promptTokens`, `completionTokens`, `modelUsed`) is persisted on every `RecommendationRun` so admins can audit spend per cohort.
