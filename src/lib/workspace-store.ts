"use client";

import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";

export type SkillProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface StoredStudentSkill {
  skillSlug: string;
  displayName: string;
  proficiency: SkillProficiencyLevel;
}

export interface StoredStudentProfile {
  skills: StoredStudentSkill[];
  interests: string[];
  careerGoal: string;
  preferredType: "PRODUCT_SAAS" | "APPLIED_AI" | "RESEARCH" | "SYSTEMS";
  weeklyHours: number;
  durationWeeks: number;
  teamSize: number;
  gpaBand: string;
  updatedAt: string;
}

export interface StoredSupervisionRequest {
  id: string;
  supervisorProfileId: string;
  supervisorName: string;
  ideaId: string;
  ideaTitle: string;
  track: "CORE_SAFE" | "CAREER_STRETCH" | "RESEARCH_NICHE";
  feasibilityScore: number;
  skillGapsSummary: string;
  pitch: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  supervisorNote?: string;
  createdAt: string;
}

const PROFILE_STORAGE_KEY = "projectcompass_student_profile_v1";
const IDEAS_STORAGE_KEY = "projectcompass_recommended_ideas_v1";
const SHORTLIST_STORAGE_KEY = "projectcompass_shortlisted_ids_v1";
const REQUESTS_STORAGE_KEY = "projectcompass_supervision_requests_v1";

export const DEFAULT_STUDENT_PROFILE: StoredStudentProfile = {
  skills: [
    { skillSlug: "typescript", displayName: "TypeScript", proficiency: "ADVANCED" },
    { skillSlug: "nextjs", displayName: "Next.js", proficiency: "INTERMEDIATE" },
    { skillSlug: "postgresql", displayName: "PostgreSQL", proficiency: "INTERMEDIATE" },
    { skillSlug: "pgvector", displayName: "pgvector Semantic Search", proficiency: "BEGINNER" },
  ],
  interests: ["DevTools", "Applied AI"],
  careerGoal: "Full-Stack & AI Systems Engineer",
  preferredType: "PRODUCT_SAAS",
  weeklyHours: 15,
  durationWeeks: 24,
  teamSize: 2,
  gpaBand: "3.4 - 3.8",
  updatedAt: new Date().toISOString(),
};

export function loadStoredStudentProfile(): StoredStudentProfile {
  if (typeof window === "undefined") return DEFAULT_STUDENT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_STUDENT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<StoredStudentProfile>;
    if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) {
      return DEFAULT_STUDENT_PROFILE;
    }
    return {
      ...DEFAULT_STUDENT_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_STUDENT_PROFILE;
  }
}

export function saveStoredStudentProfile(profile: StoredStudentProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoredIdeas(
  fallback: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]
): [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(IDEAS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as GeneratedIdeaRecord[];
    if (Array.isArray(parsed) && parsed.length === 3 && parsed[0] && parsed[1] && parsed[2]) {
      return [parsed[0], parsed[1], parsed[2]];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredIdeas(
  ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    // Ignore storage errors
  }
}

export function loadStoredShortlistedIds(fallback: string[] = ["cm0idea_core_safe_1"]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredShortlistedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export function loadStoredSupervisionRequests(
  fallback: StoredSupervisionRequest[]
): StoredSupervisionRequest[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredSupervisionRequest[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredSupervisionRequests(requests: StoredSupervisionRequest[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Ignore storage errors
  }
}
