# 08 — Security Threat Model & Access Control (v2.0)

ProjectCompass enforces **defense-in-depth** across authentication, role isolation, database row-level security, and AI prompt boundaries.

---

## 1. STRIDE Threat Model & Mitigations

| Threat | Attack Vector | Enforced Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Forged/tampered session cookies or brute-forced 4-digit PINs against Student Reg Nos or Faculty emails. | Every `projectcompass_uni_session` cookie is signed with **HMAC-SHA256** (`src/lib/auth/token-signer.ts`) verified via `crypto.timingSafeEqual`, with fail-closed `AUTH_SECRET` in production, 7-day expiry, and pre-DB canonical rate limiting (5 attempts → 15-minute lockout). |
| **Privilege Escalation** | External user attempting to self-register as `SUPERVISOR`, `COORDINATOR`, or `ADMIN`, or deactivated user attempting login. | `/sign-up` is strictly **Student-only**. `registerUniversityAccount()` rejects any non-`STUDENT` payload with `FORBIDDEN`; `completeOnboarding()` permits `STUDENT` only; `signInWithUniversityCredentials()` blocks `User.isActive === false` with `FORBIDDEN`. Faculty are hired exclusively by an Admin via `provisionFacultyAccount()`. |
| **Cross-Portal Leakage** | Faculty viewing Student Execution Roadmaps or Student accessing Admin/Coordinator routes. | Dedicated server-side `layout.tsx` guards on every route group (`profile`, `recommendations`, `supervisors`, `roadmaps`, `supervisor`, `coordinator`, `admin`) redirecting directly to the caller's own portal home, plus `clearWorkspaceStorage()` on sign-out. |
| **Data Exposure (PostgREST)** | Direct Supabase REST API queries using anon/authenticated keys. | **`21/21` `public` tables have `ENABLE ROW LEVEL SECURITY`** with `0` permissive PostgREST policies, plus `REVOKE EXECUTE` on `public.rls_auto_enable()`. All application DB access runs server-side through Prisma. |
| **Quota Race Conditions** | Two students simultaneously accepted for a supervisor's last open slot. | Atomic Prisma `$transaction` conditional `updateMany({ where: { activeSlots: { lt: maxSlots } } })` + DB `CHECK (activeSlots >= 0 AND activeSlots <= maxSlots)`. |
| **Prompt Injection / Wallet Drain** | Malicious student inputs injecting LLM instructions or flooding generation endpoints. | Sanitized XML-delimited prompts, strict Zod output schemas, DB-backed daily rate limits (`5` recommendation runs/day, `10` roadmaps/day), `25s` timeout, and `AI_MAX_OUTPUT_TOKENS` cap. |

---

## 2. HTTP Security Headers (`next.config.ts`)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Strict `Content-Security-Policy` allowing only `'self'` and Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) with `frame-ancestors 'none'`.

---

## 3. Secret & Account Hygiene

- `.env` is strictly gitignored and verified never staged before commits.
- Bootstrap University Admin credentials (`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PIN`, `BOOTSTRAP_ADMIN_NAME`) are injected strictly via `.env` / Vercel Environment Variables and stored hashed (`pinHash`) in PostgreSQL.
- Public `/sign-in` and `/sign-up` forms ship empty with zero prefilled credentials or personal names.
