# 07 — UI/UX Design System & Screen Specification

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Design Theme:** "Academic Precision & Direction" (Light-Theme Base, WCAG 2.1 AA Verified, Custom-Themed shadcn/ui)

---

## 1. Visual Design Principles

ProjectCompass uses a high-contrast, editorial light interface designed for extended academic planning, feasibility analysis, and roadmap review.

- **Light Surface Hierarchy:** Clean alabaster canvas (`#F8FAFC`) paired with crisp white cards (`#FFFFFF`) and hairline borders (`#E2E8F0`) keeps dense quantitative data legible without visual fatigue. Deep ink navy (`#0F172A`) anchors typography and primary structure, while Academic Teal (`#0F766E`) highlights primary actions and active navigation.
- **Consistency & Restraint:**
  - Use `lucide-react` vector icons (`strokeWidth={1.75}`) consistently across all controls and navigation.
  - Keep elevation minimal: `1px` borders and subtle ambient shadows (`0 1px 2px rgba(15, 23, 42, 0.04)`).
  - Reserve accent colors strictly for semantic status (feasibility scores, duplicate risk alerts, slot availability).
  - Never expose internal debug toggles or placeholder copy in production views.

---

## 2. Locked Color Palette & Figma-to-Tailwind Token Map

Every component MUST reference CSS custom properties / Tailwind theme tokens—zero raw hex codes inside TSX files. All foreground/background pairs are verified for **WCAG 2.1 Level AA** (`>= 4.5:1` text, `>= 3:1` interactive controls).

| Figma Variable | CSS Custom Property | Hex / Gradient Value | Usage | Contrast Verification |
| :--- | :--- | :--- | :--- | :--- |
| `surface/canvas` | `--bg-canvas` | `#F8FAFC` | Primary page canvas | Base surface |
| `surface/elevated` | `--bg-surface` | `#FFFFFF` | Cards, drawers, timeline containers | Base surface |
| `surface/subtle` | `--bg-subtle` | `#F1F5F9` | Sidebar background, table headers, muted panels | Base surface |
| `border/default` | `--border-default` | `#E2E8F0` | 1px hairline card and divider borders | Crisp light structure |
| `border/strong` | `--border-strong` | `#CBD5E1` | Input borders and interactive focus bases | `>= 3:1` UI boundary |
| `text/primary` | `--text-primary` | `#0F172A` | Page titles, section headers, primary figures | `17.1:1` on `#F8FAFC` (AAA) |
| `text/secondary` | `--text-secondary` | `#334155` | Body descriptions, rationales, deliverables | `9.9:1` on `#F8FAFC` (AAA) |
| `text/muted` | `--text-muted` | `#475569` | Metadata, week labels, secondary captions | `7.2:1` on `#F8FAFC` (AAA) |
| `brand/primary` | `--brand-primary` | `#0F766E` | Primary CTA buttons, active nav accent, links | `5.5:1` with `#FFFFFF` (AA) |
| `brand/primary-hover` | `--brand-primary-hover` | `#115E59` | Primary CTA hover/pressed state | `7.5:1` with `#FFFFFF` (AAA) |
| `brand/tint` | `--brand-tint` | `#CCFBF1` | Skill match badges, `CORE_SAFE` pill fill (`#115E59` text) | `> 6.5:1` (AA) |
| `accent/amber` | `--accent-amber` | `#B45309` | Skill-gap indicators, `CAREER_STRETCH` accent | `5.0:1` with `#FFFFFF` (AA) |
| `accent/amber-tint` | `--accent-amber-tint` | `#FEF3C7` | Skill-gap pill fill (`#92400E` text) | `6.1:1` (AA) |
| `gradient/ambient` | `--grad-ambient` | `linear-gradient(135deg, #F8FAFC 0%, #F0FDFA 52%, #FFFBEB 100%)` | Recommendation summary header & onboarding band | `#0F172A` text `> 15:1` |
| `gradient/contrast` | `--grad-contrast` | `linear-gradient(135deg, #0F172A 0%, #115E59 100%)` | Primary roadmap header banner & featured callout | `#FFFFFF` text `> 7.2:1` |
| `semantic/success` | `--status-success` | `#15803D` (tint `#DCFCE7`, text `#166534`) | High feasibility (`>= 75`), open supervisor slot, completed milestone | `5.1:1` on white (AA) |
| `semantic/warning` | `--status-warning` | `#B45309` (tint `#FEF3C7`, text `#92400E`) | Moderate duplicate risk (`0.72–0.81`), limited slots (`1` left) | `5.0:1` on white (AA) |
| `semantic/error` | `--status-error` | `#B91C1C` (tint `#FEE2E2`, text `#991B1B`) | High duplicate alert (`>= 0.82`), full supervisor quota, form errors | `6.4:1` on white (AA) |
| `semantic/info` | `--status-info` | `#0369A1` (tint `#E0F2FE`, text `#075985`) | Market-trend callouts, `RESEARCH_NICHE` badge, fallback notices | `5.8:1` on white (AA) |

---

## 3. Typography, Spacing & Themed shadcn/ui Rules

### Typography System (Google Fonts via CSS variables)
> Fonts are declared as CSS variables in `src/app/globals.css` (`--font-plus-jakarta`, `--font-inter`, `--font-jetbrains-mono`) with system-font fallbacks and loaded at runtime from a preconnected Google Fonts stylesheet in `src/app/layout.tsx`. This avoids the build-time network fetch of `next/font/google`, so offline and CI builds never fail.

- **Primary UI & Headings:** `Plus Jakarta Sans` (weights `500`, `600`, `700`) — geometric clarity with editorial restraint.
- **Body & Long-Form Specs:** `Inter` (weights `400`, `500`, `600`) — optimal readability in tables and roadmaps.
- **Metrics, Scores & Code/Stack Tags:** `JetBrains Mono` (weights `500`, `600`) — `tabular-nums` enabled for all Feasibility Scores (`84/100`), similarity percentages (`0.84`), and week ranges (`W01–W04`).

### Type Scale & Layout Rhythm
- **Page H1:** `28px` / `1.2` line-height / `-0.02em` tracking / `font-semibold`.
- **Section H2:** `20px` / `1.3` / `-0.01em` / `font-semibold`.
- **Card Title H3:** `16px` / `1.35` / `font-semibold`.
- **Body:** `14px–15px` / `1.55` / `text-secondary`.
- **Metadata / Badges:** `12px` / `1.2` / `font-medium`.
- **Spacing System:** Strict `4px` base grid (`4, 8, 12, 16, 24, 32, 48px`). Max content width `1280px` inside a clean `248px` fixed desktop sidebar shell (`bg-subtle` with `1px` right border).

### Customizing shadcn/ui Beyond Defaults
- **Radius:** Standardize on crisp `8px` (`--radius: 0.5rem`) for cards/inputs and `6px` for buttons/badges for consistent geometric alignment.
- **Elevation:** Use hairline borders (`1px solid var(--border-default)`) + subtle ambient shadow (`0 1px 2px rgba(15, 23, 42, 0.04)`) rather than heavy drop shadows.
- **Motion Discipline:** Animations are permitted ONLY for purposeful state feedback (`150ms ease-out` tab indicator slide, accordion expand for score breakdowns, subtle progress bar fill on recommendation generation). Respect `prefers-reduced-motion`.
- **Select / Dropdowns:** Use the custom accessible `Select` in `src/components/ui/select.tsx` (ARIA `combobox` + `listbox` popover, keyboard navigable, `aria-controls` via `React.useId()`). Do not use native `<select>` with `truncate`/`overflow: hidden` — on Windows Chromium it renders a black scrollbar arrow artifact. `color-scheme: light` is set globally.

### Responsive Layout Contract (Mobile `375px` → Tablet `768px` → Desktop `1280px+`)
| Element | Mobile / Tablet (`< lg`) | Desktop (`lg+`) |
| :--- | :--- | :--- |
| **App Shell** (`src/components/layout/app-shell.tsx`) | Sticky top bar with menu button (`aria-label="Toggle workspace navigation"`) opening a slide-over drawer with backdrop; closes on `Escape`, backdrop click, or route change | Fixed `248px` sidebar |
| **Session Badge** | Program + batch label (e.g., `Fall 2022 · BSIT · Roll #673`) shown in header and drawer | Shown in sidebar and page header |
| **Tabs** (`tabs.tsx`) | `TabsList` wraps (`flex-wrap`, full width) | Inline (`sm:inline-flex sm:w-auto`) |
| **Dialogs** (`dialog.tsx`) | `w-[calc(100vw-2rem)]`, `max-h-[90vh]`, internal scroll, `p-5` | `max-w-lg`, `p-6` |
| **Filters & Selects** | Full width (`w-full`), stacked | Fixed widths (`sm:w-…`) inline |
| **Side Summary Cards** | Flow inline below content | `lg:sticky` |
| **Grids** | Single column, then `sm`/`md` two-column | Full asymmetric layouts |

**Acceptance rule:** no page may produce horizontal scrolling at `375px` or `768px` (`scrollWidth <= innerWidth`) — enforced by the Playwright responsive spec.

---

## 4. Screen-by-Screen Architecture & Mandatory States

Every route below MUST implement **Loading (matched skeleton)**, **Empty (actionable CTA)**, **Error (recoverable retry)**, and **Populated** states.

### Screen 1: Student Profile Builder (`/dashboard/profile`)
- **Layout:** Two-column asymmetric grid (`8 cols` structured form + `4 cols` sticky Profile Readiness Summary card showing live effort budget `weeklyHours * durationWeeks * teamFactor` and readiness checklist).
- **Controls:** Searchable skill picker with 3-segment proficiency selector (`Beginner` / `Intermediate` / `Advanced`), domain interest chip selector, numeric sliders/inputs for weekly hours and semester weeks, career goal input.
- **Empty State:** Guided 3-step checklist highlighting missing minimum (`3 skills`, `1 interest`) before unlocking the primary `"Generate FYP Recommendations"` CTA.

### Screen 2: Recommendations & Explainability Workspace (`/dashboard/recommendations`)
- **Header Band:** `--grad-ambient` subtle wash displaying student's effort budget, last run timestamp, daily runs remaining (`e.g., 4 of 5 left today`), and primary `"Run New Analysis"` button.
- **3-Track Tabs / Comparison Layout:** Clear visual differentiation for `Core & Safe`, `Career Stretch`, and `Research & Niche` tracks.
- **Mandatory Explainability Panel inside Each Idea Card:**
  1. **Feasibility Score Dial/Bar (`JetBrains Mono`)** + expandable 4-row sub-score breakdown (`Skill Overlap /40`, `Time Fit /30`, `Resource Readiness /20`, `Supervisor Fit /10`) with one-sentence rationale.
  2. **Anti-Duplicate Banner:** Green `"Original Direction"` badge (`< 0.72`), Amber `"Related Past FYPs"` (`0.72–0.81`), or Red `"High Similarity Detected — Differentiation Required"` (`>= 0.82`) showing matched past project title, year, and explicit `differentiationAngle`.
  3. **Skill-Gap Breakdown:** Grouped pills showing Missing/Under-leveled skills, severity badge, estimated learning hours, and concrete action.
  4. **Recommended Tech Stack Table:** Layer, Tech, and concise architectural rationale.
  5. **Matched Available Supervisors Strip:** Top 2 available faculty with open slot pills (`2/5 slots open`) and direct `"Request Supervision"` trigger.
- **Loading State:** Multi-step progress indicator mirroring real backend stages (`Filtering supervisor quotas -> Searching archive embeddings -> Computing feasibility math -> Synthesizing grounded proposals`).

### Screen 3: Supervisor Matching & Requests (`/dashboard/supervisors` & `/dashboard/supervisor`)
- **Student View:** Ranked available supervisors with research domain tags, match score, open capacity bar, and structured pitch modal (pre-filled with shortlisted idea summary). Full-capacity supervisors appear only inside a collapsed `"Currently at Full Capacity"` disclosure with disabled CTA.
- **Supervisor View:** Quota status header (`activeSlots / maxSlots` with toggle `Accepting New Proposals`), pending student request cards displaying the student's computed Feasibility Score, skill gaps, and pitch, with `"Accept (Locks 1 Slot)"` and `"Decline with Feedback"` actions.

### Screen 4: Personalized Project Roadmap (`/dashboard/roadmaps/[id]`)
- **Top Banner:** `--grad-contrast` (`#0F172A -> #115E59`) header showing project title, total duration (`24 Weeks`), prep weeks allocated (`3 Weeks`), completion progress bar, and `"Export Markdown"` button.
- **Timeline View:** Vertical 4-phase timeline with week badges (`W01–W03`), checkable milestone rows, deliverables checklist, verification criteria, and highlighted amber risk checkpoints.

### Screen 5: Coordinator Archive & Quota Dashboard (`/dashboard/coordinator`)
- **KPI Strip:** Total Indexed Archives (`READY`), Pending/Failed Ingestions, Department Supervisor Slot Utilization (`e.g., 18 / 30 slots filled`), Active Students with Locked Proposals.
- **Archive Uploader:** Drag-and-drop UploadThing PDF/CSV uploader + manual abstract form, paired with live ingestion status table (`PENDING_EMBEDDING`, `PROCESSING`, `READY`, `NEEDS_MANUAL_ABSTRACT`, `FAILED`) and one-click retry/edit actions.

---

## 5. Domain Content & Copy Standards

Use realistic academic IT & Computing domain data throughout empty-state guidance and local seed previews — never lorem ipsum:
- **Sample Idea Title:** *"Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams"*
- **Sample Supervisor:** *"Dr. Kamran Siddiqui — Associate Professor, Distributed Systems & Automated Software Testing (3 of 5 slots open)"*
- **Sample Past Archive Match:** *"Automated Server Log Visualizer (BSIT 2023 — 84% similarity)"*
- **Sample Differentiation Angle:** *"Shifts from passive log visualization to real-time clustering of CI failure traces with GitHub PR root-cause attribution and benchmarked precision on open-source build logs."*
