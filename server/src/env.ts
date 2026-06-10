import { z } from "zod";

/**
 * All configuration is validated at boot. The server refuses to start with a
 * malformed environment instead of failing at request time.
 *
 * ANTHROPIC_API_KEY is optional: without it the chat agent runs in
 * deterministic mock mode so the app can be exercised end-to-end (including
 * on web) without any credentials.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default("0.0.0.0"),
  /** Comma-separated list of allowed browser origins for CORS. */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"),
  ANTHROPIC_API_KEY: z.string().optional(),
  /** PRD specifies the Sonnet tier; the PRD's pinned ID is deprecated, so default to current Sonnet. */
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  /** Upstream weather API base (Open-Meteo per PRD §7.1). */
  WEATHER_API_BASE: z.string().url().default("https://api.open-meteo.com"),
  /** TTL for the weather cache, in seconds. */
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(1800),
  /** Global rate limit per IP per minute. */
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  /** Chat-specific rate limit per IP per minute (PRD §9.2 guardrails). */
  CHAT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(overrides: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(overrides);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export function corsOriginList(env: Env): string[] {
  return env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
