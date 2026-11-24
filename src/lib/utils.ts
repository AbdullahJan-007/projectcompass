import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugifySkill(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Escapes untrusted user text before interpolating into HTML email bodies.
 * Prevents HTML/XSS/link injection in transactional emails.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
