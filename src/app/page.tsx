import Link from "next/link";

const DEGREE_PROGRAMS = [
  {
    code: "BSIT",
    name: "Information Technology",
    focus: "System Reliability & Cloud Infrastructure",
    blurb:
      "Cloud architecture, multi-region distributed backends, zero-trust network infrastructure, and enterprise DevOps automation.",
    badge: "IT Core Track",
  },
  {
    code: "BSCS",
    name: "Computer Science",
    focus: "Algorithmic Rigor & Systems",
    blurb:
      "High-concurrency distributed algorithms, formal compiler verification, semantic vector engines, and core computing foundations.",
    badge: "CS Core Track",
  },
  {
    code: "BSSE",
    name: "Software Engineering",
    focus: "QA, Architecture & Maintainability",
    blurb:
      "Microservices choreography, automated test mutation gates, secure SDLC compliance pipelines, and fault-tolerant SaaS design.",
    badge: "SE Core Track",
  },
  {
    code: "BSAI",
    name: "Artificial Intelligence",
    focus: "GPU-Benchmarked Evaluation",
    blurb:
      "Retrieval-augmented generation, edge computer vision, quantized transformer inference, and reproducible ML evaluation.",
    badge: "AI Core Track",
  },
  {
    code: "BSCY",
    name: "Cybersecurity",
    focus: "Threat Modeling & Auditing",
    blurb:
      "Zero-knowledge proof systems, automated binary fuzzing, smart contract vulnerability detection, and network defense ranges.",
    badge: "CY Core Track",
  },
  {
    code: "BSDS",
    name: "Data Science",
    focus: "Statistical Verifiability",
    blurb:
      "Streaming telemetry pipelines, spatial-temporal analytics, reproducible feature stores, and clinical outcome modeling.",
    badge: "DS Core Track",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface overflow-x-hidden">
      {/* Fixed Stitch Top Institutional Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-[#DBE2EF] shadow-[0_1px_8px_rgba(17,45,78,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#112D4E] text-white shadow-sm shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                explore
              </span>
            </div>
            <span className="font-headline-sm text-base sm:text-[18px] font-bold tracking-tight text-[#112D4E] truncate">
              ProjectCompass
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Landing sections">
            <a
              className="text-sm font-medium text-on-surface-variant hover:text-[#2A609C] transition-colors"
              href="#framework"
            >
              Feasibility Framework
            </a>
            <a
              className="text-sm font-medium text-on-surface-variant hover:text-[#2A609C] transition-colors"
              href="#degrees"
            >
              Departments &amp; Degrees
            </a>
            <a
              className="text-sm font-medium text-on-surface-variant hover:text-[#2A609C] transition-colors"
              href="#labs"
            >
              Research Infrastructure
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/sign-in"
              className="text-xs sm:text-sm font-semibold text-[#112D4E] hover:text-[#2A609C] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#DBE2EF]/50"
            >
              Portal Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-[#112D4E] text-white text-xs sm:text-sm font-semibold hover:bg-[#001833] transition-all duration-200 shadow-sm"
            >
              Student Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 bg-surface">
        {/* Hero Section */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-28 -left-28 w-72 h-72 bg-[#8BBBFD]/20 rounded-full blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute top-36 right-0 w-64 h-64 bg-[#99F1F6]/35 rounded-full blur-3xl pointer-events-none"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            {/* Left Column: Editorial Institutional Framing */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/60 text-[#002021] shadow-xs max-w-full">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#46A1A6] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#004F53]" />
                </span>
                <span className="font-label-sm text-[11px] font-semibold tracking-wide text-[#002021] truncate">
                  Department of Information Technology &amp; Computing · All Fall &amp; Spring Batches
                </span>
              </div>

              <h1 className="font-headline-lg text-[28px] leading-[36px] sm:text-[36px] sm:leading-[44px] md:text-headline-lg text-[#001833] font-bold tracking-tight">
                Final-Year Project Evaluation, Archive Verification &amp; Faculty Supervision Portal
              </h1>

              <p className="text-[15px] sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
                A unified capstone decision-support portal guiding students and faculty through
                explainable 4-factor feasibility scoring, 10-year archive duplicate verification,
                atomic supervisor quota matching, and calibrated semester roadmaps across BSIT, BSCS,
                BSSE, BSAI, BSCY, and BSDS cohorts.
              </p>

              {/* Call to Action Cluster */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#112D4E] text-white text-sm font-semibold hover:bg-[#001833] transition-all duration-200 shadow-md group"
                >
                  <span>Student Sign Up</span>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5"
                  >
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-surface-container-lowest border border-[#DBE2EF] text-[#112D4E] text-sm font-semibold shadow-xs hover:bg-[#DBE2EF]/40 transition-all duration-200"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px] text-[#2A609C]"
                  >
                    lock
                  </span>
                  <span>Portal Sign In (Student / Faculty / Admin)</span>
                </Link>
              </div>

              {/* Degree Program Token Ribbon */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="font-label-sm text-[11px] uppercase font-semibold text-on-surface-variant tracking-wider mr-1">
                  Programs:
                </span>
                {["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"].map((prog) => (
                  <span
                    key={prog}
                    className="px-2.5 py-1 rounded bg-[#DBE2EF]/80 text-[#001C39] font-mono-tabular text-xs font-semibold"
                  >
                    {prog}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/40 text-xs font-semibold">
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                    calendar_month
                  </span>
                  All Active Intakes
                </span>
              </div>
            </div>

            {/* Right Column: Stitch Navy Feasibility Dossier Preview Card */}
            <div className="lg:col-span-5 relative animate-fade-in-up">
              <div className="relative rounded-xl bg-[#112D4E] text-white p-5 sm:p-6 shadow-xl overflow-hidden border border-white/10">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7DD4D9]/60 to-transparent"
                />

                {/* Dossier Meta Bar */}
                <div className="flex items-center justify-between gap-2 pb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex p-2 rounded-lg bg-[#2A609C]/50 text-[#99F1F6] shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        verified_user
                      </span>
                    </span>
                    <div className="min-w-0">
                      <span className="block font-mono-tabular text-[11px] text-[#7DD4D9] font-medium tracking-wider">
                        FEASIBILITY ENGINE · STAGE 2
                      </span>
                      <span className="block font-headline-sm text-base sm:text-[18px] font-semibold text-white truncate">
                        Deterministic Evaluation Rubric
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#99F1F6] text-[#002021] shrink-0">
                    HEC-NCEAC
                  </span>
                </div>

                {/* Feasibility Score Radial Display Card */}
                <div className="bg-[#001833]/65 border border-white/10 rounded-lg p-4 mb-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#AFC8F1] block font-semibold">
                      Composite Feasibility
                    </span>
                    <span className="font-mono-tabular text-[28px] font-bold text-[#99F1F6]">
                      89 / 100
                    </span>
                    <span className="text-xs text-[#D4E3FF] block">
                      Explainable 4-Factor Weighted Model
                    </span>
                  </div>
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                      <circle
                        className="stroke-white/15 fill-none"
                        cx="18"
                        cy="18"
                        r="15.5"
                        strokeWidth="3"
                      />
                      <circle
                        className="stroke-[#7DD4D9] fill-none"
                        cx="18"
                        cy="18"
                        r="15.5"
                        strokeDasharray="97.4"
                        strokeDashoffset="10.7"
                        strokeLinecap="round"
                        strokeWidth="3"
                      />
                    </svg>
                    <span className="absolute font-mono-tabular text-xs font-bold text-white">
                      89%
                    </span>
                  </div>
                </div>

                {/* 4-Factor Breakdown Bars */}
                <div className="flex flex-col gap-2.5 mb-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#D4E3FF] font-medium">Skill Overlap (40 pts)</span>
                      <span className="font-mono-tabular text-[#99F1F6] font-semibold">37 / 40</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7DD4D9] rounded-full w-[92%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#D4E3FF] font-medium">Timeline Fit (30 pts)</span>
                      <span className="font-mono-tabular text-[#A3C9FF] font-semibold">28 / 30</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A3C9FF] rounded-full w-[93%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#D4E3FF] font-medium">Resource Readiness (20 pts)</span>
                      <span className="font-mono-tabular text-[#99F1F6] font-semibold">18 / 20</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[#99F1F6] rounded-full w-[90%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#D4E3FF] font-medium">Supervisor Fit (10 pts)</span>
                      <span className="font-mono-tabular text-[#A3C9FF] font-semibold">6 / 10</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A3C9FF] rounded-full w-[60%]" />
                    </div>
                  </div>
                </div>

                {/* Micro Metadata Footer */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
                  <div className="p-2.5 rounded-lg bg-[#001833]/55">
                    <span className="block text-[11px] text-[#AFC8F1]">Supervision Quota</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      Atomic Slot Guard
                    </span>
                    <span className="text-[11px] text-[#99F1F6]">Zero Over-Allocation</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#001833]/55">
                    <span className="block text-[11px] text-[#AFC8F1]">Archive Similarity</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      pgvector HNSW Check
                    </span>
                    <span className="text-[11px] text-[#99F1F6]">&lt; 0.82 Threshold</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* High-Density Institutional Metrics Ribbon */}
        <section className="w-full bg-surface-container-low border-y border-[#DBE2EF] py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-xs uppercase tracking-wider text-[#2A609C] font-semibold">
                Archive Index
              </span>
              <span className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#001833] font-mono-tabular">
                1536-dim
              </span>
              <span className="text-xs text-on-surface-variant">
                Semantic pgvector similarity gate
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-xs uppercase tracking-wider text-[#2A609C] font-semibold">
                Proposal Diversity
              </span>
              <span className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#2A609C] font-mono-tabular">
                3 Tracks
              </span>
              <span className="text-xs text-on-surface-variant">
                Core/Safe, Career Stretch &amp; Research
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-xs uppercase tracking-wider text-[#2A609C] font-semibold">
                Degree Programs
              </span>
              <span className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#001833] font-mono-tabular">
                6
              </span>
              <span className="text-xs text-on-surface-variant">
                Computing specializations unified
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-xs uppercase tracking-wider text-[#2A609C] font-semibold">
                Quota Integrity
              </span>
              <span className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#2A609C] font-mono-tabular">
                100%
              </span>
              <span className="text-xs text-on-surface-variant">
                Transactional supervisor slot locks
              </span>
            </div>
          </div>
        </section>

        {/* 3-Column Core Institutional Verification Feature Suite */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16" id="framework">
          <div className="flex flex-col gap-1.5 mb-8 max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2A609C]">
              How It Works
            </span>
            <h2 className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#001833]">
              Streamlined Capstone Coordination &amp; Review
            </h2>
            <p className="text-sm text-on-surface-variant">
              A transparent pre-defense workflow designed to help students scope realistic projects,
              avoid duplicate topics, and balance faculty workloads.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest border border-[#DBE2EF] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#DBE2EF] text-[#112D4E] flex items-center justify-center">
                  <span aria-hidden="true" className="material-symbols-outlined">
                    analytics
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg font-semibold text-[#001833]">
                  Clear Feasibility Scoring
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Deterministic TypeScript evaluation of your verified technical skills, weekly
                  schedule, and resource constraints before formal committee review.
                </p>

                <div className="mt-1 p-3.5 rounded-lg bg-surface-container-low border border-[#DBE2EF]/60 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#112D4E]">Feasibility Breakdown</span>
                    <span className="font-mono-tabular font-bold text-[#2A609C]">100 Pts</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full flex overflow-hidden">
                    <div className="bg-[#112D4E] h-full w-[40%]" />
                    <div className="bg-[#2A609C] h-full w-[30%]" />
                    <div className="bg-[#46A1A6] h-full w-[20%]" />
                    <div className="bg-[#8BBBFD] h-full w-[10%]" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#112D4E]" />
                      40% Skill Overlap
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2A609C]" />
                      30% Timeline Fit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#46A1A6]" />
                      20% Resources
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#8BBBFD]" />
                      10% Supervisor Fit
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-[#DBE2EF] flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Explainable Math</span>
                <span className="px-2.5 py-0.5 rounded bg-[#E3FDFD] text-[#004F53] font-semibold">
                  Zero Unverified Scores
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest border border-[#DBE2EF] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#DBE2EF] text-[#112D4E] flex items-center justify-center">
                  <span aria-hidden="true" className="material-symbols-outlined">
                    library_books
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg font-semibold text-[#001833]">
                  Archive Originality Check
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Compares candidate proposals against archived departmental dissertations and
                  enforces a mandatory differentiation angle whenever similarity reaches 0.82+.
                </p>

                <div className="mt-1 p-3.5 rounded-lg bg-surface-container-low border border-[#DBE2EF]/60 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-error flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                        warning
                      </span>
                      High Overlap Alert
                    </span>
                    <span className="font-mono-tabular font-bold text-[#112D4E]">&gt;= 82%</span>
                  </div>
                  <div className="p-2 rounded bg-surface-container-lowest border border-[#DBE2EF] text-xs">
                    <span className="text-[10px] uppercase font-semibold text-on-surface-variant block">
                      Closest Historical FYP
                    </span>
                    <p className="text-[#112D4E] font-medium truncate">
                      Automated Server Log Visualizer (BSCS 2024)
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[#E3FDFD] text-[#004F53] text-[11px] font-medium flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                      lightbulb
                    </span>
                    <span className="truncate">
                      Enforces deterministic root-cause clustering pivot
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-[#DBE2EF] flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Archive Coverage</span>
                <span className="font-semibold text-[#112D4E]">All IT &amp; Computing Cohorts</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-[#DBE2EF] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#DBE2EF] text-[#112D4E] flex items-center justify-center">
                  <span aria-hidden="true" className="material-symbols-outlined">
                    supervisor_account
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg font-semibold text-[#001833]">
                  Balanced Supervision &amp; Roadmaps
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Filters out full-capacity faculty from primary matching and generates a calibrated
                  4-phase execution plan with skill-gap ramp-up weeks.
                </p>

                <div className="mt-1 p-3.5 rounded-lg bg-surface-container-low border border-[#DBE2EF]/60 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#112D4E]">4-Phase Execution Plan</span>
                    <span className="font-mono-tabular text-[#2A609C] font-semibold">
                      12–36 Wks
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-[11px] text-center font-medium text-[#112D4E]">
                    <div className="p-1.5 rounded bg-surface-container-lowest border border-[#DBE2EF]">
                      P1 Prep
                    </div>
                    <div className="p-1.5 rounded bg-surface-container-lowest border border-[#DBE2EF]">
                      P2 Core
                    </div>
                    <div className="p-1.5 rounded bg-surface-container-lowest border border-[#DBE2EF]">
                      P3 Harden
                    </div>
                    <div className="p-1.5 rounded bg-surface-container-lowest border border-[#DBE2EF]">
                      P4 Viva
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-[#DBE2EF] flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Export Format</span>
                <span className="font-semibold text-[#112D4E]">Clean GitHub Markdown (.md)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Degree Programs Matrix */}
        <section
          className="w-full bg-surface-container-low border-y border-[#DBE2EF] py-12 sm:py-16"
          id="degrees"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2A609C]">
                  Academic Coverage
                </span>
                <h2 className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#001833]">
                  Supported Computing Degree Programs
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Standardized evaluation rubrics tailored to every accredited specialization in the
                  Department of IT &amp; Computing.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 px-3 py-1.5 text-xs font-semibold text-[#004F53] self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-[#004F53]" />
                Fall &amp; Spring Cohorts Supported
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {DEGREE_PROGRAMS.map((deg) => (
                <div
                  key={deg.code}
                  className="p-5 bg-surface-container-lowest border border-[#DBE2EF] rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-lg font-bold text-[#112D4E]">
                        {deg.code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#DBE2EF]/70 text-[#001C39] text-[11px] font-semibold">
                        {deg.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#2A609C]">{deg.name}</p>
                    <p className="text-xs sm:text-[13px] text-on-surface-variant leading-relaxed pt-1">
                      {deg.blurb}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DBE2EF]/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>Focus: {deg.focus}</span>
                    <span className="font-semibold text-[#112D4E]">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Research Infrastructure & Governance Architecture */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16" id="labs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2A609C]">
                Role-Protected Governance
              </span>
              <h2 className="font-headline-md text-2xl sm:text-[28px] font-bold text-[#001833]">
                Three Dedicated Portals Under One Academic Roof
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Strict role isolation separates Student ideation, Faculty Supervisor slot
                endorsements, and Admin/Coordinator archive &amp; quota governance.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[#2A609C] text-[20px] shrink-0 mt-0.5"
                  >
                    check_circle
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-[#112D4E] block">
                      Student Self-Registration via Roll Number
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Automatically decodes intake semester, batch year, and IT department code.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[#2A609C] text-[20px] shrink-0 mt-0.5"
                  >
                    check_circle
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-[#112D4E] block">
                      Admin-Provisioned Faculty Accounts
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Supervisors are onboarded exclusively by the department chair/admin with
                      immutable audit logs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#DBE2EF] bg-[#112D4E] text-white p-5 space-y-2 shadow-sm">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[#7DD4D9] text-[24px]"
                >
                  school
                </span>
                <h3 className="font-headline-sm text-base font-bold text-white">Student Portal</h3>
                <p className="text-xs text-[#D4E3FF] leading-relaxed">
                  Calibrate technical skills &amp; effort budget, evaluate 3 diversified tracks,
                  pitch matched supervisors, and export 4-phase roadmaps.
                </p>
              </div>
              <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 space-y-2 shadow-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[#2A609C] text-[24px]"
                >
                  assignment_ind
                </span>
                <h3 className="font-headline-sm text-base font-bold text-[#112D4E]">
                  Faculty Supervisor Portal
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Configure research domains &amp; preferred tech stacks, inspect incoming vetted
                  proposals, and accept or decline with atomic slot locks.
                </p>
              </div>
              <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 space-y-2 shadow-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[#2A609C] text-[24px]"
                >
                  inventory_2
                </span>
                <h3 className="font-headline-sm text-base font-bold text-[#112D4E]">
                  Coordinator Archive Ledger
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Ingest past FYP abstracts across cohorts, monitor pgvector HNSW embedding states,
                  and remediate incomplete records.
                </p>
              </div>
              <div className="rounded-xl border border-[#DBE2EF] bg-[#E3FDFD]/70 p-5 space-y-2 shadow-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[#004F53] text-[24px]"
                >
                  admin_panel_settings
                </span>
                <h3 className="font-headline-sm text-base font-bold text-[#112D4E]">
                  Admin Command Center
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Hire &amp; provision faculty supervisors, inspect student cohorts, override slot
                  quotas with resolution notes, and audit every event.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Institutional Call to Action Banner */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className="rounded-xl bg-gradient-to-r from-[#112D4E] to-[#2A609C] text-white p-6 sm:p-10 relative overflow-hidden shadow-lg">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/15 text-[#99F1F6] text-xs font-semibold">
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                    how_to_reg
                  </span>
                  Onboarding Open · All Computing Cohorts
                </span>
                <h2 className="font-headline-md text-2xl sm:text-[28px] font-bold text-white">
                  Initialize Your Capstone Coordination
                </h2>
                <p className="text-sm text-[#D4E3FF] leading-relaxed">
                  Students register with their official University Registration Number. Provisioned
                  faculty supervisors and administrators sign in directly via the unified portal.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white text-[#001833] text-sm font-bold shadow hover:bg-[#E3FDFD] transition-colors"
                >
                  <span>Register Student Account</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    badge
                  </span>
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white/15 text-white border border-white/25 text-sm font-semibold hover:bg-white/25 transition-colors"
                >
                  <span>Portal Sign In</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    login
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full bg-surface-container-low border-t border-[#DBE2EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-[#112D4E] text-white font-headline-sm font-bold">
              P
            </div>
            <span>
              ProjectCompass · Department of Information Technology &amp; Computing
            </span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link href="/sign-up" className="hover:text-[#112D4E] transition-colors">
              Student Registration
            </Link>
            <Link href="/sign-in" className="hover:text-[#112D4E] transition-colors">
              Portal Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
