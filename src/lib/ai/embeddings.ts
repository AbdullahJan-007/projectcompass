import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generates a normalized 1536-dimensional deterministic embedding vector from text.
 * Used as a fallback in local unit tests, CI environments, or when AI_API_KEY is absent.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const clean = text.trim().toLowerCase();
  const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);

  let seed = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    seed ^= clean.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const tokens = clean.split(/[^a-z0-9+#.-]+/).filter(Boolean);
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t] ?? "";
    let h = 5381;
    for (let c = 0; c < token.length; c++) {
      h = (h * 33) ^ token.charCodeAt(c);
    }
    const idx1 = Math.abs(h) % EMBEDDING_DIMENSIONS;
    const idx2 = Math.abs(h * 31 + t) % EMBEDDING_DIMENSIONS;
    const idx3 = Math.abs(h * 131 + token.length) % EMBEDDING_DIMENSIONS;

    vec[idx1] = (vec[idx1] ?? 0) + 1.0;
    vec[idx2] = (vec[idx2] ?? 0) + 0.5;
    vec[idx3] = (vec[idx3] ?? 0) - 0.35;
  }

  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    seed ^= i + 1;
    seed = Math.imul(seed, 16777619);
    const baseline = ((seed & 0xffff) / 0xffff - 0.5) * 0.05;
    vec[i] = (vec[i] ?? 0) + baseline;
  }

  let normSq = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    const val = vec[i] ?? 0;
    normSq += val * val;
  }

  const norm = Math.sqrt(normSq) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Generates a 1536-dimensional embedding via Vercel AI SDK (text-embedding-3-small)
 * with automatic fallback to deterministic normalized vectors when AI_API_KEY is unconfigured.
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const sanitized = text.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 6000);

  const hasLiveKey =
    env.AI_API_KEY.startsWith("sk-") &&
    !env.AI_API_KEY.includes("replace_me") &&
    !env.AI_API_KEY.includes("placeholder");

  if (!hasLiveKey) {
    return generateDeterministicEmbedding(sanitized);
  }

  try {
    const openai = createOpenAI({
      baseURL: env.AI_PROVIDER_BASE_URL,
      apiKey: env.AI_API_KEY,
    });

    const { embedding } = await embed({
      model: openai.embedding(env.AI_EMBEDDING_MODEL),
      value: sanitized,
      abortSignal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
    });

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      return generateDeterministicEmbedding(sanitized);
    }

    return embedding;
  } catch {
    return generateDeterministicEmbedding(sanitized);
  }
}

export function cosineSimilarity(vecA: readonly number[], vecB: readonly number[]): number {
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;

  return Math.max(0, Math.min(1, Number((dot / denom).toFixed(4))));
}

export function toPgVectorLiteral(embedding: readonly number[]): string {
  return `[${embedding.join(",")}]`;
}
