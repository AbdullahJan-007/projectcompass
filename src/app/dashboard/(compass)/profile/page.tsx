"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Users,
  Compass,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CANONICAL_SKILLS } from "@/lib/recommendation/seed-data";
import { upsertStudentProfile } from "@/actions/profile.actions";
import {
  loadStoredStudentProfile,
  saveStoredStudentProfile,
} from "@/lib/workspace-store";

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
  const skillInputRef = useRef<HTMLInputElement | null>(null);
  const [skills, setSkills] = useState<SelectedSkill[]>([
    { skillSlug: "typescript", displayName: "TypeScript", proficiency: "ADVANCED" },
    { skillSlug: "nextjs", displayName: "Next.js", proficiency: "INTERMEDIATE" },
    { skillSlug: "postgresql", displayName: "PostgreSQL", proficiency: "INTERMEDIATE" },
    { skillSlug: "pgvector", displayName: "pgvector Semantic Search", proficiency: "BEGINNER" },
  ]);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillFeedback, setSkillFeedback] = useState<{
    type: "info" | "warning";
    text: string;
  } | null>(null);
  const [selectedProficiency, setSelectedProficiency] = useState<Proficiency>("INTERMEDIATE");
  const [interests, setInterests] = useState<string[]>(["DevTools", "Applied AI"]);
  const [careerGoal, setCareerGoal] = useState("Full-Stack & AI Systems Engineer");
  const [preferredType, setPreferredType] = useState<
    "PRODUCT_SAAS" | "APPLIED_AI" | "RESEARCH" | "SYSTEMS"
  >("PRODUCT_SAAS");
  const [weeklyHours, setWeeklyHours] = useState(15);
  const [durationWeeks, setDurationWeeks] = useState(24);
  const [teamSize, setTeamSize] = useState(2);
  const [gpaBand, setGpaBand] = useState("3.4 - 3.8");

  useEffect(() => {
    const stored = loadStoredStudentProfile();
    setSkills(stored.skills);
    setInterests(stored.interests);
    setCareerGoal(stored.careerGoal);
    setPreferredType(stored.preferredType);
    setWeeklyHours(stored.weeklyHours);
    setDurationWeeks(stored.durationWeeks);
    setTeamSize(stored.teamSize);
    setGpaBand(stored.gpaBand);
  }, []);

  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  void Select;
  const [isSaving, setIsSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  function persistCurrentProfileState(nextSkills = skills, nextInterests = interests) {
    saveStoredStudentProfile({
      skills: nextSkills,
      interests: nextInterests,
      careerGoal,
      preferredType,
      weeklyHours,
      durationWeeks,
      teamSize,
      gpaBand,
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
    persistCurrentProfileState(updated, interests);
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
    persistCurrentProfileState(updated, interests);
  }

  function removeSkill(slug: string) {
    const updated = skills.filter((s) => s.skillSlug !== slug);
    setSkills(updated);
    persistCurrentProfileState(updated, interests);
  }

  function toggleInterest(domain: string) {
    setInterests((prev) => {
      let updated = prev;
      if (prev.includes(domain)) {
        updated = prev.filter((d) => d !== domain);
      } else if (prev.length < 6) {
        updated = [...prev, domain];
      }
      persistCurrentProfileState(skills, updated);
      return updated;
    });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusBanner(null);

    persistCurrentProfileState(skills, interests);

    const res = await upsertStudentProfile({
      skills,
      interests,
      careerGoal,
      preferredType,
      weeklyHours,
      durationWeeks,
      teamSize,
      gpaBand,
    });

    setIsSaving(false);

    if (!res.ok) {
      setStatusBanner({
        type: "error",
        text: res.error.message,
      });
      return;
    }

    setStatusBanner({
      type: "success",
      text: `Skill profile saved to database. Semester capacity: ${res.data.totalEffortHours} total hours.`,
    });
  }

  function handleNavigateToRecommendations() {
    persistCurrentProfileState(skills, interests);
    router.push("/dashboard/recommendations");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={isReadyForRecommendations ? "success" : "warning"}>
              {isReadyForRecommendations ? "Profile Status: Ready" : "Profile Status: Draft"}
            </Badge>
            <span className="text-xs text-text-muted font-mono-tabular">
              Cohort: Fall 2026 – Spring 2027 (BSCS)
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Student Skill &amp; Time Capacity Profile
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Record your current technical skills, domain interests, and weekly availability to
            evaluate project feasibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild disabled={!isReadyForRecommendations}>
            <Link href="/dashboard/recommendations">
              <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>View FYP Recommendations</span>
            </Link>
          </Button>
        </div>
      </div>

      {viewState === "LOADING" && (
        <div className="grid gap-6 lg:grid-cols-12" data-testid="profile-loading-state">
          <div className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-44" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/40" data-testid="profile-error-state">
          <CardHeader>
            <div className="flex items-center gap-2 text-status-error-text">
              <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
              <CardTitle className="text-status-error-text">
                Profile Synchronization Interrupted
              </CardTitle>
            </div>
            <CardDescription className="text-status-error-text/90">
              We could not reach the department PostgreSQL pooler to load your saved skill weights.
              Your local changes are preserved in memory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="border-brand-primary/30 bg-grad-ambient" data-testid="profile-empty-state">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
              <CardTitle>Complete 3 Minimum Requirements to Unlock Recommendations</CardTitle>
            </div>
            <CardDescription>
              ProjectCompass blocks ungrounded recommendation runs until your baseline capacity
              profile meets minimum statistical signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[6px] border border-border-default bg-bg-surface p-3.5">
                <p className="text-xs font-semibold text-text-primary">1. At Least 3 Skills</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Add your languages, frameworks, and DBs with Beginner/Intermediate/Advanced level.
                </p>
              </div>
              <div className="rounded-[6px] border border-border-default bg-bg-surface p-3.5">
                <p className="text-xs font-semibold text-text-primary">2. 1+ Domain Interest</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Select target problem spaces (e.g., DevTools, Cybersecurity, Applied AI).
                </p>
              </div>
              <div className="rounded-[6px] border border-border-default bg-bg-surface p-3.5">
                <p className="text-xs font-semibold text-text-primary">3. Realistic Effort Budget</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Configure weekly hours (5–45) and semester duration (12–36 weeks).
                </p>
              </div>
            </div>
            <Button onClick={() => setViewState("POPULATED")}>
              Populate Interactive Profile Form
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <form onSubmit={handleSaveProfile} className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Verified Technical Skills &amp; Proficiency Levels</CardTitle>
                <CardDescription>
                  Select at least 3 skills from the canonical CS taxonomy or add custom stack slugs.
                  Proficiency weights directly drive the 40-point Skill Overlap sub-score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_200px_auto]">
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
                    placeholder="Type skill name (e.g., TypeScript, pgvector, Solidity) & press Enter or + Add Custom..."
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addCustomSkill}
                    data-testid="add-custom-skill-btn"
                  >
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>Add Custom</span>
                  </Button>
                </div>

                {skillFeedback && (
                  <div
                    data-testid="skill-action-feedback"
                    className={`flex items-center gap-2 rounded-[6px] border px-3 py-2 text-xs font-medium ${
                      skillFeedback.type === "warning"
                        ? "border-status-warning/30 bg-status-warning-tint text-status-warning-text"
                        : "border-brand-primary/30 bg-brand-tint/40 text-brand-primary-hover"
                    }`}
                  >
                    {skillFeedback.type === "warning" ? (
                      <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    )}
                    <span>{skillFeedback.text}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-text-muted mr-1">Quick Add:</span>
                  {matchingSuggestions.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => addSkill(s.slug, s.displayName)}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-border-default bg-bg-subtle px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-brand-primary hover:bg-brand-tint/40 hover:text-text-primary"
                    >
                      <Plus className="h-3 w-3 text-brand-primary" strokeWidth={1.75} />
                      {s.displayName}
                      <span className="text-[10px] text-text-muted">({s.category})</span>
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-border-default rounded-[8px] border border-border-default">
                  {skills.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">
                      No skills selected yet. Add at least 3 technical skills above.
                    </div>
                  ) : (
                    skills.map((skill) => (
                      <div
                        key={skill.skillSlug}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-medium text-text-primary">
                            {skill.displayName}
                          </span>
                          <span className="ml-2 font-mono-tabular text-xs text-text-muted">
                            #{skill.skillSlug}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="inline-flex rounded-[6px] border border-border-default bg-bg-subtle p-0.5">
                            {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => updateSkillProficiency(skill.skillSlug, level)}
                                className={`rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors ${
                                  skill.proficiency === level
                                    ? "bg-brand-primary text-bg-surface"
                                    : "text-text-secondary hover:text-text-primary"
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
                            className="rounded-[6px] p-1.5 text-text-muted hover:bg-status-error-tint hover:text-status-error"
                            aria-label={`Remove ${skill.displayName}`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Domain Interests &amp; Career Trajectory</CardTitle>
                <CardDescription>
                  Select 1 to 6 problem domains and specify your target post-graduation engineering
                  role for Track 2 (Career Stretch) alignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {DOMAIN_INTEREST_OPTIONS.map((domain) => {
                    const active = interests.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleInterest(domain)}
                        className={`rounded-[6px] border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand-primary bg-brand-tint text-brand-primary-hover"
                            : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Target Career Role
                    </label>
                    <Input
                      value={careerGoal}
                      onChange={(e) => setCareerGoal(e.target.value)}
                      placeholder="e.g., Backend & Distributed Systems Engineer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Preferred Execution Style
                    </label>
                    <Select
                      value={preferredType}
                      onChange={(e) =>
                        setPreferredType(
                          e.target.value as
                            | "PRODUCT_SAAS"
                            | "APPLIED_AI"
                            | "RESEARCH"
                            | "SYSTEMS"
                        )
                      }
                      aria-label="Preferred Execution Style"
                    >
                      <option value="PRODUCT_SAAS">Product &amp; SaaS Engineering</option>
                      <option value="APPLIED_AI">Applied AI &amp; Retrieval Systems</option>
                      <option value="SYSTEMS">Systems, Security &amp; DevOps Tooling</option>
                      <option value="RESEARCH">Empirical Research &amp; Benchmarking</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Time Budget, Semester Duration &amp; Team Composition</CardTitle>
                <CardDescription>
                  Determines the 30-point Time-to-Complexity Fit score and calibrates your 4-phase
                  project roadmap.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Weekly Hours (5–45 hrs/wk)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={45}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value) || 5)}
                    className="font-mono-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Duration Weeks (12–36 weeks)
                  </label>
                  <Input
                    type="number"
                    min={12}
                    max={36}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value) || 24)}
                    className="font-mono-tabular"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Team Size &amp; Coordination Factor
                  </label>
                  <Select
                    value={String(teamSize)}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    aria-label="Team Size"
                  >
                    <option value="1">1 Member (Solo · 1.0x)</option>
                    <option value="2">2 Members (Pair · 1.65x)</option>
                    <option value="3">3 Members (Trio · 2.2x)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    GPA Band (Optional)
                  </label>
                  <Select
                    value={gpaBand}
                    onChange={(e) => setGpaBand(e.target.value)}
                    aria-label="GPA Band"
                  >
                    <option value="3.4 - 3.8">3.4 – 3.8 CGPA</option>
                    <option value="3.0 - 3.4">3.0 – 3.4 CGPA</option>
                    <option value="3.8 - 4.0">3.8 – 4.0 CGPA</option>
                    <option value="2.5 - 3.0">2.5 – 3.0 CGPA</option>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <Card className="sticky top-6 border-brand-primary/30">
              <CardHeader className="bg-grad-ambient rounded-t-[8px] border-b border-border-default">
                <Badge variant="default" className="w-fit">
                  Semester Capacity Summary
                </Badge>
                <CardTitle className="mt-2">Profile Readiness</CardTitle>
                <CardDescription>
                  Calculates realistic project hours based on your weekly availability and team
                  size.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="rounded-[8px] border border-border-default bg-bg-subtle p-4">
                  <p className="text-xs font-medium text-text-secondary">
                    Effective Effort Budget
                  </p>
                  <p className="mt-1 font-mono-tabular text-2xl font-bold text-text-primary">
                    {totalEffortHours} hrs
                  </p>
                  <p className="mt-1 font-mono-tabular text-[11px] text-text-muted">
                    {weeklyHours} hrs/wk × {durationWeeks} wks × {teamFactor}x team factor
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <p className="font-semibold uppercase tracking-wider text-text-muted">
                    Mandatory Readiness Gates
                  </p>
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-border-default/60">
                    <span className="text-text-secondary">Minimum 3 Verified Skills</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-text-primary shrink-0">
                      <span>{skills.length} / 3</span>
                      {skills.length >= 3 ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-border-default/60">
                    <span className="text-text-secondary">Domain Interests Selected</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-text-primary shrink-0">
                      <span>{interests.length} / 6</span>
                      {interests.length >= 1 ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-border-default/60">
                    <span className="text-text-secondary">Weekly Time Window</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-text-primary shrink-0">
                      <Clock className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                      <span>{weeklyHours}h/wk</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-text-secondary">Team Coordination Factor</span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-text-primary shrink-0">
                      <Users className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                      <span>{teamFactor}x</span>
                    </span>
                  </div>
                </div>

                {statusBanner && (
                  <div
                    className={`rounded-[6px] border p-3 text-xs leading-relaxed ${
                      statusBanner.type === "success"
                        ? "border-status-success/30 bg-status-success-tint text-status-success-text"
                        : "border-status-error/30 bg-status-error-tint text-status-error-text"
                    }`}
                  >
                    {statusBanner.text}
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSaving || !isReadyForRecommendations}
                  >
                    {isSaving ? "Saving Profile..." : "Save Skill Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!isReadyForRecommendations}
                    onClick={handleNavigateToRecommendations}
                  >
                    Generate FYP Recommendations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}
