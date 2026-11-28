"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CANONICAL_SKILLS } from "@/lib/recommendation/seed-data";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  upsertStudentProfile,
  getActiveStudentProfile,
} from "@/actions/profile.actions";
import {
  saveStoredStudentProfile,
  saveStoredIdeas,
  saveStoredShortlistedIds,
} from "@/lib/workspace-store";
import { AppIcon } from "@/components/ui/app-icon";
import { parseStudentRegNo } from "@/lib/auth/university-id";

type Proficiency = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

interface SelectedSkill {
  skillSlug: string;
  displayName: string;
  proficiency: Proficiency;
}

const DOMAIN_INTEREST_OPTIONS = [
  "DevTools",
  "Cybersecurity",
  "Applied AI",
  "EdTech",
  "HealthTech",
  "FinTech",
  "Cloud & Distributed Systems",
  "Data Engineering",
  "Computer Vision",
  "IoT & Embedded",
  "Web & SaaS",
  "Privacy & Security",
];

export default function StudentProfilePage() {
  const router = useRouter();
  const portalSession = usePortalSession();
  const skillInputRef = useRef<HTMLInputElement | null>(null);
  const [skills, setSkills] = useState<SelectedSkill[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillFeedback, setSkillFeedback] = useState<{
    type: "info" | "warning";
    text: string;
  } | null>(null);
  const [selectedProficiency, setSelectedProficiency] = useState<Proficiency>("INTERMEDIATE");
  const [interests, setInterests] = useState<string[]>([]);
  const [careerGoal, setCareerGoal] = useState("");
  const [preferredType, setPreferredType] = useState<
    "PRODUCT_SAAS" | "APPLIED_AI" | "RESEARCH" | "SYSTEMS"
  >("PRODUCT_SAAS");
  const [weeklyHours, setWeeklyHours] = useState(15);
  const [weeklyHoursDraft, setWeeklyHoursDraft] = useState("15");
  const [durationWeeks, setDurationWeeks] = useState(24);
  const [durationWeeksDraft, setDurationWeeksDraft] = useState("24");
  const [teamSize, setTeamSize] = useState(2);
  const [gpaBand, setGpaBand] = useState("3.0 - 3.4");
  const [departmentLabel, setDepartmentLabel] = useState(
    portalSession.departmentCode || "BSCS"
  );
  const hasUserEditedRef = useRef(false);

  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [partnerRegNos, setPartnerRegNos] = useState<string[]>([]);
  const [partnerDraft, setPartnerDraft] = useState("");
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setDepartmentLabel(portalSession.departmentCode || "BSCS");
    getActiveStudentProfile()
      .then((serverProfile) => {
        if (!serverProfile) return;
        setDepartmentLabel(
          serverProfile.departmentCode || portalSession.departmentCode || "BSCS"
        );
        if (!hasUserEditedRef.current && serverProfile.skills.length > 0) {
          setSkills(serverProfile.skills);
          setInterests(serverProfile.interests);
          setCareerGoal(serverProfile.careerGoal);
          setPreferredType(serverProfile.preferredType);
          setWeeklyHours(serverProfile.weeklyHours);
          setWeeklyHoursDraft(String(serverProfile.weeklyHours));
          setDurationWeeks(serverProfile.durationWeeks);
          setDurationWeeksDraft(String(serverProfile.durationWeeks));
          setTeamSize(serverProfile.teamSize);
          setPartnerRegNos(serverProfile.partnerRegNos ?? []);
          setGpaBand(serverProfile.gpaBand);
        }
      })
      .catch(() => {
        // Keep clean empty profile state
      });
  }, [portalSession.departmentCode]);

  const teamFactor = teamSize === 1 ? 1.0 : teamSize === 2 ? 1.65 : 2.2;
  const totalEffortHours = Math.round(weeklyHours * durationWeeks * teamFactor);

  const matchingSuggestions = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    return CANONICAL_SKILLS.filter(
      (s) =>
        !skills.some((existing) => existing.skillSlug === s.slug) &&
        (q === "" ||
          s.displayName.toLowerCase().includes(q) ||
          s.slug.includes(q) ||
          s.category.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [skillQuery, skills]);

  const isReadyForRecommendations =
    skills.length >= 3 &&
    interests.length >= 1 &&
    careerGoal.trim().length >= 3 &&
    weeklyHours >= 5 &&
    weeklyHours <= 45 &&
    durationWeeks >= 12 &&
    durationWeeks <= 36;

  function persistCurrentProfileState(
    overrides?: Partial<{
      skills: SelectedSkill[];
      interests: string[];
      careerGoal: string;
      preferredType: "PRODUCT_SAAS" | "APPLIED_AI" | "RESEARCH" | "SYSTEMS";
      weeklyHours: number;
      durationWeeks: number;
      teamSize: number;
      gpaBand: string;
    }>
  ) {
    hasUserEditedRef.current = true;
    saveStoredStudentProfile({
      skills: overrides?.skills ?? skills,
      interests: overrides?.interests ?? interests,
      careerGoal: overrides?.careerGoal ?? careerGoal,
      preferredType: overrides?.preferredType ?? preferredType,
      weeklyHours: overrides?.weeklyHours ?? weeklyHours,
      durationWeeks: overrides?.durationWeeks ?? durationWeeks,
      teamSize: overrides?.teamSize ?? teamSize,
      gpaBand: overrides?.gpaBand ?? gpaBand,
      updatedAt: new Date().toISOString(),
    });
  }

  function addSkill(slug: string, displayName: string) {
    if (skills.length >= 25) {
      setSkillFeedback({
        type: "warning",
        text: "Maximum 25 skills reached. Remove an existing skill first.",
      });
      return;
    }
    if (skills.some((s) => s.skillSlug === slug)) {
      setSkillFeedback({
        type: "warning",
        text: `"${displayName}" (#${slug}) is already in your skill profile.`,
      });
      return;
    }
    const updated = [
      ...skills,
      { skillSlug: slug, displayName, proficiency: selectedProficiency },
    ];
    setSkills(updated);
    persistCurrentProfileState({ skills: updated });
    setSkillQuery("");
    setSkillFeedback({
      type: "info",
      text: `Added "${displayName}" (${selectedProficiency}) to your verified skill profile.`,
    });
  }

  function addCustomSkill() {
    const trimmed = skillQuery.trim();
    if (trimmed.length < 2) {
      setSkillFeedback({
        type: "warning",
        text: "Type a custom skill name (at least 2 characters, e.g., Kubernetes or Solidity) in the search box first, then click + Add Custom.",
      });
      skillInputRef.current?.focus();
      return;
    }
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9+#.-]+/g, "-");
    const canonicalMatch = CANONICAL_SKILLS.find(
      (c) => c.slug === slug || c.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    addSkill(
      canonicalMatch ? canonicalMatch.slug : slug,
      canonicalMatch ? canonicalMatch.displayName : trimmed
    );
  }

  function updateSkillProficiency(slug: string, proficiency: Proficiency) {
    const updated = skills.map((s) => (s.skillSlug === slug ? { ...s, proficiency } : s));
    setSkills(updated);
    persistCurrentProfileState({ skills: updated });
  }

  function removeSkill(slug: string) {
    const updated = skills.filter((s) => s.skillSlug !== slug);
    setSkills(updated);
    persistCurrentProfileState({ skills: updated });
  }

  function toggleInterest(domain: string) {
    setInterests((prev) => {
      let updated = prev;
      if (prev.includes(domain)) {
        updated = prev.filter((d) => d !== domain);
      } else if (prev.length < 6) {
        updated = [...prev, domain];
      }
      persistCurrentProfileState({ interests: updated });
      return updated;
    });
  }

  async function saveProfileToBackend(): Promise<boolean> {
    if (skills.length < 3) {
      setStatusBanner({
        type: "error",
        text: "Please add at least 3 technical skills before saving your profile.",
      });
      return false;
    }
    if (interests.length < 1) {
      setStatusBanner({
        type: "error",
        text: "Please select at least 1 domain interest before saving your profile.",
      });
      return false;
    }
    if (careerGoal.trim().length < 3) {
      setStatusBanner({
        type: "error",
        text: "Please enter your Target Career Goal (e.g., Full-Stack Engineer, AI Engineer) below before saving.",
      });
      return false;
    }

    setIsSaving(true);
    setStatusBanner(null);

    const res = await upsertStudentProfile({
      skills,
      interests,
      careerGoal,
      preferredType,
      weeklyHours,
      durationWeeks,
      teamSize,
      partnerRegNos,
      gpaBand,
    });

    setIsSaving(false);

    if (!res.ok) {
      setStatusBanner({
        type: "error",
        text: res.error.message,
      });
      return false;
    }

    persistCurrentProfileState();

    if (res.data.calibratedIdeas) {
      saveStoredIdeas(res.data.calibratedIdeas);
      saveStoredShortlistedIds([res.data.calibratedIdeas[0].id]);
    }

    setStatusBanner({
      type: "success",
      text: `Skill profile saved & proposals calibrated (${res.data.totalEffortHours} total semester hours).`,
    });
    return true;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    await saveProfileToBackend();
  }

  async function handleNavigateToRecommendations() {
    const ok = await saveProfileToBackend();
    if (ok) {
      router.push("/dashboard/recommendations");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stitch Top Academic Context Header */}
      <section className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ${
                isReadyForRecommendations
                  ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                  : "bg-[#FEF3C7] text-[#92400E] border border-[#B45309]/25"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isReadyForRecommendations ? "bg-[#004F53]" : "bg-[#B45309]"
                }`}
              />
              {isReadyForRecommendations ? "Profile Status: Ready" : "Profile Status: Draft"}
            </span>
            <span className="font-mono-tabular text-xs font-medium text-[#3F72AF] bg-[#DBE2EF]/50 px-2.5 py-0.5 rounded">
              {portalSession.batchLabel || `${departmentLabel} · All Active Batches`}
            </span>
          </div>

          <Button asChild disabled={!isReadyForRecommendations} size="sm">
            <Link href="/dashboard/recommendations">
              <AppIcon name="auto_awesome" className="text-[16px]" />
              <span>View FYP Recommendations</span>
            </Link>
          </Button>
        </div>

        <h1 className="font-headline-md text-[22px] sm:text-[28px] font-bold leading-tight tracking-tight text-[#112D4E]">
          Student Skill &amp; Time Capacity Profile
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant max-w-3xl">
          Calibrate your verified technical skills, academic domain interests, and weekly time
          budget to compute deterministic 4-factor project feasibility scores.
        </p>
      </section>

      {viewState === "LOADING" && (
        <div className="grid gap-6 lg:grid-cols-12" data-testid="profile-loading-state">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <div
          className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3"
          data-testid="profile-error-state"
        >
          <div className="flex items-center gap-2 text-on-error-container font-semibold">
            <AppIcon name="error" className="text-[20px]" />
            <span>Profile Synchronization Interrupted</span>
          </div>
          <p className="text-xs text-on-error-container">
            Could not reach PostgreSQL to load your saved skill weights. Your local edits remain
            preserved.
          </p>
          <Button variant="outline" onClick={() => setViewState("POPULATED")}>
            Retry Connection
          </Button>
        </div>
      )}

      {viewState === "EMPTY" && (
        <div
          className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 space-y-4"
          data-testid="profile-empty-state"
        >
          <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
            Complete 3 Minimum Requirements to Unlock Recommendations
          </h2>
          <Button onClick={() => setViewState("POPULATED")}>
            Populate Interactive Profile Form
          </Button>
        </div>
      )}

      {viewState === "POPULATED" && (
        <form onSubmit={handleSaveProfile} className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left 8 Columns: Form Sections */}
          <div className="space-y-6 lg:col-span-8 min-w-0">
            {/* Section 1: Skills */}
            <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-[#DBE2EF]/70 pb-3">
                <div className="flex items-center gap-2">
                  <AppIcon name="terminal" className="text-[#3F72AF] text-[20px]" />
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    1. Verified Technical Skills &amp; Proficiency Levels
                  </h2>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
                  Select at least 3 skills from the canonical computing taxonomy or add custom stack
                  slugs. Proficiency weights drive the 40-point Skill Overlap sub-score.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-[1fr_190px_auto]">
                <Input
                  ref={skillInputRef}
                  value={skillQuery}
                  onChange={(e) => {
                    setSkillQuery(e.target.value);
                    if (skillFeedback) setSkillFeedback(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSkill();
                    }
                  }}
                  placeholder="Type skill name (e.g., TypeScript, pgvector, Solidity)..."
                  aria-label="Search canonical skills"
                />
                <Select
                  value={selectedProficiency}
                  onChange={(e) => setSelectedProficiency(e.target.value as Proficiency)}
                  aria-label="Default Skill Proficiency"
                >
                  <option value="BEGINNER">Beginner (0.4x)</option>
                  <option value="INTERMEDIATE">Intermediate (0.75x)</option>
                  <option value="ADVANCED">Advanced (1.0x)</option>
                </Select>
                <button
                  type="button"
                  onClick={addCustomSkill}
                  data-testid="add-custom-skill-btn"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#DBE2EF]/70 hover:bg-[#DBE2EF] px-3.5 text-xs font-semibold text-[#112D4E] transition-colors shrink-0"
                >
                  <AppIcon name="add" className="text-[16px]" />
                  <span>Add Custom</span>
                </button>
              </div>

              {skillFeedback && (
                <div
                  data-testid="skill-action-feedback"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                    skillFeedback.type === "warning"
                      ? "border-[#B45309]/30 bg-[#FEF3C7] text-[#92400E]"
                      : "border-[#71C9CE]/50 bg-[#E3FDFD] text-[#004F53]"
                  }`}
                >
                  <AppIcon name={skillFeedback.type === "warning" ? "warning" : "check_circle"} className="text-[16px]" />
                  <span>{skillFeedback.text}</span>
                </div>
              )}

              {/* Quick Add Taxonomy Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#3F72AF] mr-1">Quick Add:</span>
                {matchingSuggestions.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => addSkill(s.slug, s.displayName)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#DBE2EF] bg-[#F9F7F7] px-2.5 py-1 text-xs font-medium text-[#112D4E] hover:border-[#3F72AF] hover:bg-[#DBE2EF]/50 transition-colors"
                  >
                    <AppIcon name="add" className="text-[14px] text-[#3F72AF]" />
                    <span>{s.displayName}</span>
                  </button>
                ))}
              </div>

              {/* Selected Skills List */}
              <div className="divide-y divide-[#DBE2EF] rounded-xl border border-[#DBE2EF] bg-[#F9F7F7]/50">
                {skills.length === 0 ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant">
                    No skills selected yet. Add at least 3 technical skills above.
                  </div>
                ) : (
                  skills.map((skill) => (
                    <div
                      key={skill.skillSlug}
                      className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-[#112D4E]">
                          {skill.displayName}
                        </span>
                        <span className="ml-2 font-mono-tabular text-xs text-[#3F72AF]">
                          #{skill.skillSlug}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg border border-[#DBE2EF] bg-surface-container-lowest p-0.5">
                          {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => updateSkillProficiency(skill.skillSlug, level)}
                              className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                skill.proficiency === level
                                  ? "bg-[#112D4E] text-white"
                                  : "text-on-surface-variant hover:text-[#112D4E]"
                              }`}
                            >
                              {level === "BEGINNER"
                                ? "Beginner"
                                : level === "INTERMEDIATE"
                                  ? "Intermediate"
                                  : "Advanced"}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill.skillSlug)}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container/60 hover:text-error transition-colors"
                          aria-label={`Remove ${skill.displayName}`}
                        >
                          <AppIcon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 2: Domain Interests & Career Goal */}
            <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-[#DBE2EF]/70 pb-3">
                <div className="flex items-center gap-2">
                  <AppIcon name="explore" className="text-[#3F72AF] text-[20px]" />
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    2. Domain Interests &amp; Career Trajectory
                  </h2>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
                  Select 1 to 6 problem domains and specify your target post-graduation engineering
                  role for Track 2 (Career Stretch) alignment.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {DOMAIN_INTEREST_OPTIONS.map((domain) => {
                  const active = interests.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleInterest(domain)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-[#112D4E] bg-[#112D4E] text-white shadow-xs"
                          : "border-[#DBE2EF] bg-[#F9F7F7] text-[#112D4E] hover:bg-[#DBE2EF]/50"
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    Target Career Role
                  </label>
                  <Input
                    value={careerGoal}
                    onChange={(e) => {
                      setCareerGoal(e.target.value);
                      persistCurrentProfileState({ careerGoal: e.target.value });
                    }}
                    placeholder="e.g., Backend & Distributed Systems Engineer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    Preferred Execution Style
                  </label>
                  <Select
                    value={preferredType}
                    onChange={(e) => {
                      const nextVal = e.target.value as
                        | "PRODUCT_SAAS"
                        | "APPLIED_AI"
                        | "RESEARCH"
                        | "SYSTEMS";
                      setPreferredType(nextVal);
                      persistCurrentProfileState({ preferredType: nextVal });
                    }}
                    aria-label="Preferred Execution Style"
                  >
                    <option value="PRODUCT_SAAS">Product &amp; SaaS Engineering</option>
                    <option value="APPLIED_AI">Applied AI &amp; Retrieval Systems</option>
                    <option value="SYSTEMS">Systems, Security &amp; DevOps Tooling</option>
                    <option value="RESEARCH">Empirical Research &amp; Benchmarking</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Time Budget & Team Size */}
            <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-[#DBE2EF]/70 pb-3">
                <div className="flex items-center gap-2">
                  <AppIcon name="schedule" className="text-[#3F72AF] text-[20px]" />
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    3. Time Budget, Semester Duration &amp; Team Composition
                  </h2>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
                  Determines the 30-point Timeline Fit score and calibrates your 4-phase execution
                  roadmap.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    Weekly Hours (5–45 hrs/wk)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={45}
                    value={weeklyHoursDraft}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setWeeklyHoursDraft(raw);
                      const num = Number(raw);
                      if (raw !== "" && !Number.isNaN(num)) {
                        const clamped = Math.max(5, Math.min(45, Math.round(num)));
                        setWeeklyHours(clamped);
                        persistCurrentProfileState({ weeklyHours: clamped });
                      }
                    }}
                    onBlur={() => {
                      const num = Number(weeklyHoursDraft);
                      const clamped =
                        Number.isNaN(num) || weeklyHoursDraft === ""
                          ? 15
                          : Math.max(5, Math.min(45, Math.round(num)));
                      setWeeklyHours(clamped);
                      setWeeklyHoursDraft(String(clamped));
                      persistCurrentProfileState({ weeklyHours: clamped });
                    }}
                    className="font-mono-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    Duration Weeks (12–36 weeks)
                  </label>
                  <Input
                    type="number"
                    min={12}
                    max={36}
                    value={durationWeeksDraft}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDurationWeeksDraft(raw);
                      const num = Number(raw);
                      if (raw !== "" && !Number.isNaN(num)) {
                        const clamped = Math.max(12, Math.min(36, Math.round(num)));
                        setDurationWeeks(clamped);
                        persistCurrentProfileState({ durationWeeks: clamped });
                      }
                    }}
                    onBlur={() => {
                      const num = Number(durationWeeksDraft);
                      const clamped =
                        Number.isNaN(num) || durationWeeksDraft === ""
                          ? 24
                          : Math.max(12, Math.min(36, Math.round(num)));
                      setDurationWeeks(clamped);
                      setDurationWeeksDraft(String(clamped));
                      persistCurrentProfileState({ durationWeeks: clamped });
                    }}
                    className="font-mono-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    Team Size &amp; Coordination Factor
                  </label>
                  <Select
                    value={String(teamSize)}
                    onChange={(e) => {
                      const nextTeam = Number(e.target.value);
                      setTeamSize(nextTeam);
                      persistCurrentProfileState({ teamSize: nextTeam });
                    }}
                    aria-label="Team Size"
                  >
                    <option value="1">1 Member (Solo · 1.0x)</option>
                    <option value="2">2 Members (Pair · 1.65x)</option>
                    <option value="3">3 Members (Trio · 2.2x)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#112D4E]">
                    GPA Band (Optional)
                  </label>
                  <Select
                    value={gpaBand}
                    onChange={(e) => {
                      setGpaBand(e.target.value);
                      persistCurrentProfileState({ gpaBand: e.target.value });
                    }}
                    aria-label="GPA Band"
                  >
                    <option value="3.4 - 3.8">3.4 – 3.8 CGPA</option>
                    <option value="3.0 - 3.4">3.0 – 3.4 CGPA</option>
                    <option value="3.8 - 4.0">3.8 – 4.0 CGPA</option>
                    <option value="2.5 - 3.0">2.5 – 3.0 CGPA</option>
                  </Select>
                </div>
              </div>

              {/* FYP Group / Team Partner Linking (Up to 3 Students Total) */}
              <div className="pt-4 border-t border-[#DBE2EF]/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#112D4E]">
                      FYP Group Partners (Optional · Up to 2 Teammates)
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Link group members by University Reg No to keep your team size &amp; effort budget synced.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#DBE2EF]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#112D4E] font-mono-tabular">
                    {1 + partnerRegNos.length} / 3 Members
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={partnerDraft}
                    onChange={(e) => {
                      setPartnerDraft(e.target.value.toUpperCase());
                      setPartnerError(null);
                    }}
                    placeholder="Partner Reg No (e.g., B23F0419SE014)"
                    className="sm:flex-1 font-mono-tabular uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={partnerRegNos.length >= 2 || partnerDraft.trim().length < 8}
                    onClick={() => {
                      const normalized = partnerDraft.trim().toUpperCase();
                      const parsedPartner = parseStudentRegNo(normalized);
                      if (!parsedPartner) {
                        setPartnerError("Enter a valid Reg No (e.g., B23F0419SE014).");
                        return;
                      }
                      if (normalized === portalSession.identifier.toUpperCase()) {
                        setPartnerError("You are already included as the primary group member.");
                        return;
                      }
                      if (partnerRegNos.includes(normalized)) {
                        setPartnerError("This teammate is already linked.");
                        return;
                      }
                      const nextPartners = [...partnerRegNos, normalized].slice(0, 2);
                      const nextTeam = Math.min(3, 1 + nextPartners.length);
                      setPartnerRegNos(nextPartners);
                      setTeamSize(nextTeam);
                      setPartnerDraft("");
                      setPartnerError(null);
                      persistCurrentProfileState({ teamSize: nextTeam });
                    }}
                  >
                    + Link Partner
                  </Button>
                </div>

                {partnerError && (
                  <p className="text-xs font-medium text-on-error-container">{partnerError}</p>
                )}

                {partnerRegNos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {partnerRegNos.map((reg) => {
                      const info = parseStudentRegNo(reg);
                      return (
                        <span
                          key={reg}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#71C9CE]/60 bg-[#E3FDFD] px-3 py-1.5 text-xs font-semibold text-[#004F53]"
                        >
                          <span className="font-mono-tabular">{reg}</span>
                          {info && (
                            <span className="text-[11px] font-medium text-[#112D4E]">
                              ({info.departmentCode} · {info.intakeTerm} {info.batchYear})
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove partner ${reg}`}
                            onClick={() => {
                              const nextPartners = partnerRegNos.filter((p) => p !== reg);
                              const nextTeam = Math.max(1, 1 + nextPartners.length);
                              setPartnerRegNos(nextPartners);
                              setTeamSize(nextTeam);
                              persistCurrentProfileState({ teamSize: nextTeam });
                            }}
                            className="rounded p-0.5 text-[#112D4E] hover:bg-white/70"
                          >
                            <AppIcon name="close" className="text-[13px]" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Stitch Navy Capacity & Readiness Dossier */}
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-[#112D4E] to-[#2A609C] p-5 text-white">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#99F1F6]">
                  Semester Capacity Summary
                </span>
                <h2 className="mt-2 font-headline-sm text-lg font-bold text-white">
                  Profile Readiness
                </h2>
                <p className="mt-0.5 text-xs text-[#D4E3FF]">
                  Calculates realistic engineering effort from weekly availability and team size.
                </p>
              </div>

              <div className="p-5 space-y-5">
                <div className="rounded-xl border border-[#DBE2EF] bg-[#F9F7F7] p-4">
                  <p className="text-xs font-semibold text-[#3F72AF]">Effective Effort Budget</p>
                  <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#112D4E]">
                    {totalEffortHours} hrs
                  </p>
                  <p className="mt-1 font-mono-tabular text-[11px] text-on-surface-variant">
                    {weeklyHours} hrs/wk × {durationWeeks} wks × {teamFactor}x team factor
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <p className="font-semibold uppercase tracking-wider text-[#3F72AF]">
                    Mandatory Readiness Gates
                  </p>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#DBE2EF]/60">
                    <span className="text-on-surface-variant">Minimum 3 Verified Skills</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#112D4E]">
                      <span>{skills.length} / 3</span>
                      <AppIcon name={skills.length >= 3 ? "check_circle" : "pending"} className={`text-[16px] ${
                          skills.length >= 3 ? "text-[#004F53]" : "text-[#B45309]"
                        }`} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#DBE2EF]/60">
                    <span className="text-on-surface-variant">Domain Interests Selected</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#112D4E]">
                      <span>{interests.length} / 6</span>
                      <AppIcon name={interests.length >= 1 ? "check_circle" : "pending"} className={`text-[16px] ${
                          interests.length >= 1 ? "text-[#004F53]" : "text-[#B45309]"
                        }`} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#DBE2EF]/60">
                    <span className="text-on-surface-variant">Target Career Goal</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#112D4E]">
                      <span>{careerGoal.trim().length >= 3 ? "Ready" : "Required"}</span>
                      <AppIcon name={careerGoal.trim().length >= 3 ? "check_circle" : "pending"} className={`text-[16px] ${
                          careerGoal.trim().length >= 3 ? "text-[#004F53]" : "text-[#B45309]"
                        }`} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-on-surface-variant">Weekly Time Window</span>
                    <span className="font-mono-tabular font-semibold text-[#112D4E]">
                      {weeklyHours}h/wk · {durationWeeks} wks
                    </span>
                  </div>
                </div>

                {statusBanner && (
                  <div
                    role="status"
                    className={`rounded-lg border p-3 text-xs font-medium leading-relaxed ${
                      statusBanner.type === "success"
                        ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
                        : "border-error/30 bg-error-container/60 text-on-error-container"
                    }`}
                  >
                    {statusBanner.text}
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-11 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <AppIcon name="save" className="text-[18px]" />
                    <span>{isSaving ? "Saving Profile..." : "Save Skill Profile"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleNavigateToRecommendations}
                    className="w-full h-10 rounded-lg border border-[#DBE2EF] bg-[#DBE2EF]/40 hover:bg-[#DBE2EF] disabled:opacity-50 text-[#112D4E] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AppIcon name="auto_awesome" className="text-[17px]" />
                    <span>
                      {isSaving ? "Saving & Generating..." : "Generate FYP Recommendations"}
                    </span>
                  </button>

                  {!isReadyForRecommendations && (
                    <p className="text-[11px] text-on-surface-variant text-center">
                      Complete all 3 Mandatory Readiness Gates above to save and calibrate.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
