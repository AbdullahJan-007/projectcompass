import { env } from "@/lib/env";
import { logStructured } from "@/lib/logger";

export type ProductEventName =
  | "profile_completed"
  | "recommendation_generated"
  | "idea_shortlisted"
  | "supervision_request_sent"
  | "supervision_request_accepted"
  | "roadmap_generated";

const FORBIDDEN_PII_KEYS = new Set([
  "email",
  "fullName",
  "name",
  "studentPitch",
  "pitch",
  "clerkId",
  "phone",
]);

/**
 * Emits PII-scrubbed product telemetry events to PostHog / structured server logs.
 */
export function captureProductEvent(
  event: ProductEventName,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  const sanitizedProps: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!FORBIDDEN_PII_KEYS.has(key)) {
      sanitizedProps[key] = value;
    }
  }

  logStructured({
    level: "info",
    action: `telemetry_${event}`,
    status: env.NEXT_PUBLIC_POSTHOG_KEY ? "posthog_enabled" : "local_telemetry",
    meta: sanitizedProps,
  });
}
