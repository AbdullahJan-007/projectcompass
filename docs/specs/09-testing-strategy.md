# 09 — Testing & Verification Strategy (v2.0)

Every push to `main` is gated by automated schema validation, strict static analysis, 31 Vitest unit/integration/red-team tests, production Next.js compilation, and 3 Playwright real-browser E2E specs.

---

## 1. Automated Verification Pyramid

| Layer | Command | Scope & Current Status |
| :--- | :--- | :--- |
| **Schema Validation** | `pnpm prisma validate` | Validates all 21 relational models, 12 enums, and covering FK indexes. |
| **Type Safety** | `pnpm typecheck` | Strict `tsc --noEmit` (`0` errors). |
| **Linting** | `pnpm lint` | `eslint . --max-warnings=0` (`0` errors, `0` warnings). |
| **Unit, Integration & Security** | `pnpm test` | **7 suites / 31 tests passing:** `security-penetration` (7), `recommendation-engine` (7), `university-auth` (5), `rbac-onboarding` (4), `atomic-quota-and-roadmap` (3), `admin-governance` (3), `seed-and-embeddings` (2). |
| **Production Build** | `pnpm build` | `prisma generate && next build` compiling all routes cleanly. |
| **Real-Browser E2E** | `pnpm test:e2e` | **3 Playwright specs passing** (`tests/e2e/golden-path.spec.ts`). |

---

## 2. Playwright E2E Coverage (`tests/e2e/golden-path.spec.ts`)

1. **Student Golden Path & Collapsible Sidebar:** Landing (`/`) → empty `/sign-in` → Student login (`B23F0184CS042`) → desktop collapsible sidebar toggle (`sidebar-collapse-btn` ↔ `desktop-sidebar-toggle-btn`, verifying single button at all times) → skill profile save → 3-track recommendations → shortlist → 24-week roadmap & Markdown export.
2. **Auth & 3-Portal RBAC Enforcement:** Unauthenticated redirect to `/sign-in` → forged unsigned admin cookie rejected by HMAC verifier → Faculty Coordinator login → `/dashboard/coordinator` archive verification (`NEEDS_MANUAL_ABSTRACT`) → blocked cross-role access to `/dashboard/admin` and `/dashboard/roadmaps` redirecting directly to `/dashboard/coordinator`.
3. **Multi-Batch BSIT Registration & Responsive Overflow Gate:** Mobile (`375×812`) landing, Fall 2022 `BSIT` student registration (`/sign-up`), mobile navigation drawer, and Tablet (`768×1024`) Supervisor Matching `BSIT Faculty` filter with `scrollWidth <= innerWidth` verified at every step.
