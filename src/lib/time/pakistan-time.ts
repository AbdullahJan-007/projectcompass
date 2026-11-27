/**
 * Live Pakistan Standard Time (Islamabad — Asia/Karachi, UTC+5) date, time,
 * academic cycle, and execution roadmap calendar utilities.
 */

export const PAKISTAN_TIMEZONE = "Asia/Karachi";
export const PAKISTAN_CITY_LABEL = "Islamabad, PKT";

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getPakistanYear(date: Date = new Date()): number {
  const yearStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAKISTAN_TIMEZONE,
    year: "numeric",
  }).format(date);
  return Number.parseInt(yearStr, 10) || date.getUTCFullYear();
}

export function getPakistanMonth(date: Date = new Date()): number {
  const monthStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAKISTAN_TIMEZONE,
    month: "numeric",
  }).format(date);
  return Number.parseInt(monthStr, 10) || date.getUTCMonth() + 1;
}

/**
 * Returns the live academic FYP cycle label calibrated to Pakistan universities
 * (Fall intake starts August–December; Spring intake runs January–July).
 */
export function getPakistanAcademicCycle(date: Date = new Date()): string {
  const year = getPakistanYear(date);
  const month = getPakistanMonth(date);
  if (month >= 8) {
    return `Fall ${year} – Spring ${year + 1}`;
  }
  return `Fall ${year - 1} – Spring ${year}`;
}

/** Formats e.g. "27 Nov 2026" in Asia/Karachi (PKT). */
export function formatPakistanDate(value: Date | string | number): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(toDate(value));
}

/** Formats e.g. "27 Nov 2026, 10:42 AM PKT" in Asia/Karachi (PKT). */
export function formatPakistanDateTime(value: Date | string | number): string {
  const formatted = new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(value));
  return `${formatted} PKT`;
}

/** Formats e.g. "10:42:15 AM" in Asia/Karachi (PKT). */
export function formatPakistanClock(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(value);
}

/** Formats e.g. "Fri, 27 Nov 2026" in Asia/Karachi (PKT). */
export function formatPakistanShortCalendarDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

/**
 * Computes real Islamabad calendar start & end dates for a roadmap phase
 * starting from today (PKT) using `weekStart` and `weekEnd` (1-indexed weeks).
 */
export function formatPakistanRoadmapPhaseDates(
  weekStart: number,
  weekEnd: number,
  anchorDate: Date = new Date()
): string {
  const startMs = anchorDate.getTime() + Math.max(0, weekStart - 1) * 7 * 24 * 60 * 60 * 1000;
  const endMs = anchorDate.getTime() + Math.max(weekStart, weekEnd) * 7 * 24 * 60 * 60 * 1000;

  const fmt = new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIMEZONE,
    day: "2-digit",
    month: "short",
  });

  return `${fmt.format(new Date(startMs))} – ${fmt.format(new Date(endMs))}`;
}
