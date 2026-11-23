import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1).default("postgresql://postgres:password@localhost:5432/projectcompass"),
  DIRECT_URL: z.string().min(1).default("postgresql://postgres:password@localhost:5432/projectcompass"),

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().default("pk_test_placeholder"),
  CLERK_SECRET_KEY: z.string().default("sk_test_placeholder"),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().default("whsec_placeholder"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),

  AI_PROVIDER_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().default(""),
  AI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2500),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),

  INNGEST_EVENT_KEY: z.string().default("local-dev-key"),
  INNGEST_SIGNING_KEY: z.string().default("signkey-local-dev"),

  UPLOADTHING_TOKEN: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM_EMAIL: z.string().default("ProjectCompass <notifications@projectcompass.edu>"),
  RESEND_WEBHOOK_SECRET: z.string().default("whsec_resend_placeholder"),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().default(""),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),

  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),
  SENTRY_AUTH_TOKEN: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
