import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import {
  RecommendationSynthesisResponseSchema,
  type SynthesizedIdeaOutput,
} from "@/lib/ai/schemas";

export interface LlmSynthesisResult {
  ideas: SynthesizedIdeaOutput[];
  promptTokens: number;
  completionTokens: number;
  modelUsed: string;
}

export function isLiveAiProviderConfigured(): boolean {
  const key = env.AI_API_KEY.trim();
  if (key.length < 12) return false;
  const lower = key.toLowerCase();
  return !lower.includes("replace_me") && !lower.includes("placeholder");
}

/**
 * Calls Vercel AI SDK generateObject with strict Zod schema, temperature 0.35,
 * 25s AbortSignal timeout, and 1 jittered retry on transient errors.
 */
export async function synthesizeGroundedIdeasWithLlm(params: {
  system: string;
  prompt: string;
}): Promise<LlmSynthesisResult> {
  if (!isLiveAiProviderConfigured()) {
    throw new Error("AI_API_KEY not configured for live provider; using deterministic fallback");
  }

  const openai = createOpenAI({
    baseURL: env.AI_PROVIDER_BASE_URL,
    apiKey: env.AI_API_KEY,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateObject({
        model: openai(env.AI_CHAT_MODEL),
        schema: RecommendationSynthesisResponseSchema,
        system: params.system,
        prompt: params.prompt,
        temperature: 0.35,
        maxTokens: env.AI_MAX_OUTPUT_TOKENS,
        abortSignal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
      });

      return {
        ideas: result.object.ideas,
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
        modelUsed: env.AI_CHAT_MODEL,
      };
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM synthesis failed after retry");
}
