# FYP Defense Presentation Script & Viva Q&A Playbook

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Presenter:** Abdullah Jan  
**Target Duration:** 10 Minutes Presentation + Panel Q&A  
**Note:** Stored in `docs/academic/` and excluded from Antigravity code-indexing via `.antigravityignore`.

---

## 1. Structured 10-Minute Defense Script

### Minute 0:00 – 1:30 | Hook & Problem Statement
> "Good morning, respected panel members. Every year, thousands of final-year computer science students hit the exact same wall during FYP selection. Half the batch submits recycled CRUD ideas—another e-commerce store or hospital management system—that get rejected for lacking novelty. The other half proposes ambitious AI or distributed systems projects that collapse halfway through the semester because the scope doesn't match their actual skills, time budget, or supervisor expertise. Meanwhile, faculty supervisors get flooded with misaligned emails while departmental archives of past FYPs sit unsearchable in PDF folders.
>
> **ProjectCompass** solves this by treating FYP selection as a constrained engineering decision problem—not a brainstorming chat."

### Minute 1:30 – 3:00 | Product Positioning & Modularity
> "Rather than building an isolated toy app, we architected ProjectCompass as a standalone-deployable **Core Module** designed to plug directly into a full university FYP Management System. In our MVP, four real roles—Students, Supervisors, FYP Coordinators, and University Admins—operate over shared institutional primitives: Departments, Cohorts, Supervisor Quotas, and Historical FYP Archives. Phase 2 modules like Proposal Grading and Viva Scheduling attach directly to our locked schema without rewriting a single existing table."

### Minute 3:00 – 5:30 | Core Engineering Architecture (The 3-Stage Hybrid Engine)
> "The most important technical decision in ProjectCompass is this: **the LLM is never allowed to decide feasibility scores, select supervisors, or invent originality.** Doing so creates a fragile ChatGPT wrapper. Instead, we built a **3-Stage Hybrid Recommendation Engine** powered by Next.js App Router, strict TypeScript, Prisma, and PostgreSQL with `pgvector` HNSW indexes:
>
> - **Stage 1 (Deterministic SQL Hard Constraints):** We calculate the student's real effort budget from weekly hours, semester weeks, and non-linear team factor (`1.0` solo, `1.65` pair, `2.2` trio), and filter strictly for department supervisors with open capacity (`activeSlots < maxSlots`).
> - **Stage 2 (Semantic Retrieval, Anti-Duplicate Gate & Explainable Math):** Using 1536-dimensional `pgvector` cosine similarity, we retrieve relevant archetypes from a curated 40+ CS Cold-Start Seed Catalog and compare every candidate against the department's past FYP archive. Any match at cosine similarity `>= 0.82` triggers a high-duplicate warning and forces a concrete differentiation angle. Feasibility is then computed by an auditable 4-factor formula: **40% Skill Overlap, 30% Time-to-Complexity Fit, 20% Resource Readiness, and 10% Supervisor Domain Fit**.
> - **Stage 3 (MMR Diversity & Guardrailed Synthesis):** To eliminate generic repetition and popularity bias, Maximal Marginal Relevance selects three distinct tracks—Core/Safe, Career-Stretch, and Research/Niche—and balances supervisor rankings with a 10% remaining-capacity weight. Only then does the Vercel AI SDK (`generateObject` with Zod) synthesize grounded problem framing and week-by-week roadmaps. If the LLM API goes down, our deterministic fallback still delivers complete recommendations in under 2 seconds."

### Minute 5:30 – 8:30 | Live System Walkthrough (Demo Flow)
1. **University Registration No & Faculty 4-Digit PIN Login (`/sign-up` & `/sign-in`):** Show separate `StudentAccount` and `FacultyAccount` database schemas. Enter Student Registration Number `B23F0184CS042` with 4-digit PIN `0184` -> highlight automatic decoding of Program (`Bachelor`), Batch (`Fall 2023`), Serial (`#0184`), Department (`BSCS`), and Roll No (`#042`).
2. **Student Skill & Capacity Profile (`/dashboard/profile`):** Add custom skills (`+ Add Custom`), adjust proficiency levels, and show live semester effort budget updating as weekly hours/team size change (`Ready` gate).
3. **Recommendation Run (`/dashboard/recommendations`):** Trigger analysis -> highlight the 3 distinct tracks (`Core & Safe`, `Career Stretch`, `Research & Niche`) -> expand the **4-Factor Feasibility Breakdown** (`Skill /40`, `Time /30`, `Resources /20`, `Supervisor /10`).
4. **Anti-Duplicate Detection:** Point out an idea matching a past department archive (`>= 0.82` badge, e.g., `Automated Server Log Visualizer — 84% similarity`) and show the mandatory differentiation angle.
5. **Supervisor Matching & Atomic Quota (`/dashboard/supervisors` & `/dashboard/supervisor`):** Show available supervisors (`3 of 5 slots open`) vs. collapsed full-capacity faculty -> submit pitch -> switch to Faculty Supervisor login (`kamran.siddiqui@university.edu`, PIN `2026`) -> accept request and show slot counter increment atomically.
6. **Personalized Roadmap (`/dashboard/roadmaps/[id]`):** Generate 24-week roadmap -> highlight automatically calibrated early skill-gap prep weeks (`3 + 8 + 7 + 6 = 24 Weeks`) -> copy or download `.md` Markdown file.
7. **Coordinator Portal (`/dashboard/coordinator`):** Show async PDF/abstract archive ingestion (`UploadThing -> Inngest -> pgvector`) and `NEEDS_MANUAL_ABSTRACT` remediation.

### Minute 8:30 – 10:00 | Verification, Production Readiness & Closing
> "To ensure production reliability, we wrote automated Vitest unit tests covering all feasibility edge cases, MMR diversity, and concurrent supervisor last-slot race conditions using PostgreSQL atomic updates, plus Playwright E2E tests verifying RBAC isolation. The entire system runs on roughly `$2/month` at pilot scale and under `$0.04/student/month` at 10,000-student SaaS scale. Thank you—I'm ready for your questions."

---

## 2. Top 15 Panel / Viva Questions & Staff-Level Answers

1. **Q: How is ProjectCompass different from a student simply asking ChatGPT for FYP ideas?**
   * **A:** ChatGPT has zero institutional memory of your department's past FYPs, zero awareness of which professors have open supervision slots, no deterministic feasibility math calibrated to weekly hours, and tends to hallucinate generic or over-scoped projects. ProjectCompass computes feasibility, duplicate similarity (`pgvector`), and supervisor availability deterministically in PostgreSQL/TypeScript first; the LLM only synthesizes grounded language around validated facts—and degrades cleanly to a deterministic fallback if offline.

2. **Q: How do you solve the Cold-Start Problem when a brand-new university has zero uploaded past FYPs?**
   * **A:** We ship an idempotent, peer-reviewed Cold-Start Seed Catalog (`SeedIdeaTemplate`) of 40+ vetted CS/SE/AI/Cybersecurity archetypes with pre-computed embeddings and effort metadata. On Day 1, students still get high-rigor, diversified recommendations while the UI transparently notes that department-specific duplicate checks activate as soon as the coordinator uploads historical abstracts.

3. **Q: Why did you use PostgreSQL `pgvector` instead of a dedicated vector database like Pinecone or Qdrant?**
   * **A:** Our queries are inherently hybrid—we need semantic similarity joined transactionally with relational invariants like `departmentId`, `isAccepting = true`, and `activeSlots < maxSlots`. With `pgvector` HNSW indexes inside Supabase PostgreSQL, both execute in one ACID query with zero sync drift between two databases and zero extra infrastructure cost.

4. **Q: What happens if two students are accepted into a supervisor's last remaining slot at the exact same second?**
   * **A:** We enforce both an atomic conditional PostgreSQL update inside `prisma.$transaction` (`WHERE id = $1 AND activeSlots < maxSlots`) AND a database-level `CHECK ("activeSlots" <= "maxSlots")` constraint. One request succeeds and increments the slot; the concurrent request rolls back cleanly with `SUPERVISOR_QUOTA_FULL`. We verify this with a `Promise.allSettled` concurrency integration test.

5. **Q: How do you prevent popularity bias where one well-known AI professor gets recommended to 80% of students?**
   * **A:** Two mechanisms: hard capacity exclusion once `activeSlots === maxSlots`, and a 10% remaining-capacity diversity weight (`(maxSlots - activeSlots) / maxSlots`) blended into supervisor ranking alongside domain cosine similarity (70%) and skill overlap (20%).

6. **Q: How do you know your cosine similarity threshold of `0.82` is reasonable?**
   * **A:** With `text-embedding-3-small`, unrelated CS abstracts cluster around `0.30–0.55`, same-domain different-problem projects fall around `0.65–0.78`, and near-duplicate problem/solution pairs consistently exceed `0.80–0.85`. We therefore use a two-tier policy: `0.72–0.819` surfaces related prior work for awareness, while `>= 0.82` flags high duplicate risk and mandates an explicit differentiation angle. Thresholds are centralized constants so departments can calibrate them on their own archive distribution.

7. **Q: Why did you choose Inngest over Redis + BullMQ for background PDF processing?**
   * **A:** Because our Next.js app deploys to Vercel's serverless runtime, where long-running BullMQ worker processes cannot live. BullMQ would require provisioning and monitoring a separate persistent Docker server plus managed Redis. Inngest executes serverless-natively via `/api/inngest` with built-in retries, step checkpointing, and concurrency control—zero extra server ops.

8. **Q: How does authentication work for University Students vs. Faculty Teachers, and what happens at 50,000-student SaaS scale?**
   * **A:** We implemented a dual-schema institutional identity layer (`StudentAccount` and `FacultyAccount` in Prisma) behind our unified `src/lib/auth/session.ts` adapter. Students register and sign in with their University Registration Number pattern `B[YY][F/S][4-Digits][DEPT][3-Digits]` (e.g., `B23F0184CS042`), which deterministically extracts Batch Year, Intake Term, Department (`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`), and Roll Number, paired with a SHA-256 salted 4-digit PIN (`XXXX`). Faculty teachers sign in with their official University Email (`kamran.siddiqui@university.edu`) and 4-digit PIN. Because all Server Actions resolve identity strictly through `src/lib/auth/session.ts`, the system supports both institutional RegNo/PIN cookies and Clerk SSO with zero vendor lock-in.

9. **Q: Why did you use Next.js Server Actions instead of a traditional REST API?**
   * **A:** Server Actions eliminate manual fetch boilerplate and provide end-to-end TypeScript contracts for internal app mutations, while we strictly reserve Next.js Route Handlers (`/api/*`) for external callers that require standard HTTP webhooks (Clerk, UploadThing, Inngest, Resend, and `/api/health`).

10. **Q: How do you protect against prompt injection from uploaded PDFs or student free-text inputs?**
    * **A:** All untrusted text is isolated inside XML data delimiters (`<student_context>`, `<archive_excerpt>`), length-capped, validated via Zod, and strictly bound to closed-world template IDs and skill slugs. Most importantly, the LLM has zero write permissions and cannot alter numeric feasibility scores or supervisor lists.

11. **Q: What if the OpenAI/LLM API is down during a university registration deadline?**
    * **A:** Every LLM call has a `25s` timeout and single retry. On failure, `engine.ts` triggers our deterministic fallback synthesizer using Stage 2's real `SeedIdeaTemplate` matches, exact 4-factor feasibility scores, skill gaps, and supervisor matches (`COMPLETED_FALLBACK`). Students never see a broken error screen.

12. **Q: How did you validate that your feasibility score isn't arbitrary?**
    * **A:** Each of the four weights maps directly to the top causes of FYP failure: missing core skills (40%), insufficient calendar/weekly hours relative to project complexity (30%), unavailable datasets or GPU/hardware bottlenecks (20%), and lack of aligned faculty mentorship (10%). Every sub-score is transparently displayed in the UI so both student and supervisor can inspect and challenge it.

13. **Q: How does the system handle a scanned image-only PDF uploaded by a coordinator?**
    * **A:** Our Inngest ingestion worker checks extracted text length after parsing. If readable text is `< 100` characters, instead of storing garbage vectors that poison similarity search, it transitions the archive record to `NEEDS_MANUAL_ABSTRACT` and prompts the coordinator to paste the 150-word abstract directly.

14. **Q: Why did you choose a non-linear team factor (`1.0`, `1.65`, `2.2`) instead of multiplying weekly hours by team size?**
    * **A:** Brooks's Law—adding a 2nd or 3rd student increases communication, merge, and integration overhead. Assuming a 3-person team delivers 3x solo output leads to chronic over-scoping; `1.65x` and `2.2x` reflect realistic undergraduate group velocity.

15. **Q: Can a university deploy this on-premises if their policy forbids cloud SaaS?**
    * **A:** Yes. We ship a multi-stage standalone Next.js `Dockerfile` and `docker-compose.yml` running `pgvector/pgvector:pg16`, and our Vercel AI SDK client accepts any OpenAI-compatible `AI_PROVIDER_BASE_URL` (including an on-premises vLLM/Ollama endpoint).
