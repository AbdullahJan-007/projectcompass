export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROFILE_INCOMPLETE"
  | "CONCURRENT_RUN_ACTIVE"
  | "SUPERVISOR_QUOTA_FULL"
  | "MAX_PENDING_REQUESTS"
  | "DUPLICATE_RECORD"
  | "INTERNAL_ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ActionErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export interface RecommendedStackItem {
  layer: string;
  tech: string;
  rationale: string;
}

export interface SimilarArchiveItem {
  archiveId: string;
  title: string;
  academicYear: number;
  similarity: number;
}
