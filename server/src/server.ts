import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { corsOriginList, type Env } from "./env.js";
import { generatePlan } from "./services/plangen.js";
import { getForecast } from "./services/weather.js";
import { runChat } from "./services/chat.js";
import { getProduct, listProducts } from "./data/catalog.js";

const LawnProfileSchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  grassType: z.string().min(1).max(60),
  lawnSizeCategory: z.enum(["small", "medium", "large"]),
  condition: z.enum(["beautiful", "pretty_good", "needs_work", "total_mess"]),
  primaryGoal: z.enum(["keep_green", "fix_regrow", "stop_weeds", "low_maintenance"]),
  soilType: z.string().max(60).optional(),
});

const ChatBodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .default([]),
  profile: LawnProfileSchema.optional(),
});

const CoordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function buildServer(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
    bodyLimit: 64 * 1024, // chat is the largest payload; nothing here needs more
    trustProxy: true,
  });

  await app.register(helmet, {
    // API-only server; CSP is irrelevant and breaks nothing by being strict.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: corsOriginList(env),
    methods: ["GET", "POST"],
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });

  // Uniform error envelope — internals (stack traces, zod internals) never
  // leak to clients; full detail goes to the server log.
  app.setErrorHandler((rawErr: unknown, req, reply) => {
    if (rawErr instanceof z.ZodError) {
      return reply.status(400).send({
        error: "validation_error",
        details: rawErr.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const err = rawErr as { statusCode?: number; code?: string; message?: string };
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, "unhandled error");
    return reply.status(status).send({
      error: status >= 500 ? "internal_error" : err.code ?? "request_error",
      message: status >= 500 ? "Something went wrong." : err.message ?? "Request failed.",
    });
  });

  app.get("/api/health", async () => ({
    status: "ok",
    chatMode: env.ANTHROPIC_API_KEY ? "claude" : "mock",
  }));

  app.get("/api/weather", async (req) => {
    const { lat, lng } = CoordsSchema.parse(req.query);
    return getForecast(lat, lng, {
      apiBase: env.WEATHER_API_BASE,
      cacheTtlSeconds: env.WEATHER_CACHE_TTL_SECONDS,
    });
  });

  app.post("/api/plan/generate", async (req) => {
    const profile = LawnProfileSchema.parse(req.body);
    const weather = await getForecast(profile.lat, profile.lng, {
      apiBase: env.WEATHER_API_BASE,
      cacheTtlSeconds: env.WEATHER_CACHE_TTL_SECONDS,
    });
    return generatePlan(profile, weather);
  });

  app.post(
    "/api/chat",
    {
      config: {
        rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: "1 minute" },
      },
    },
    async (req) => {
      const body = ChatBodySchema.parse(req.body);
      let weather;
      let plan;
      if (body.profile) {
        weather = await getForecast(body.profile.lat, body.profile.lng, {
          apiBase: env.WEATHER_API_BASE,
          cacheTtlSeconds: env.WEATHER_CACHE_TTL_SECONDS,
        });
        plan = generatePlan(body.profile, weather);
      }
      const result = await runChat(
        {
          message: body.message,
          history: body.history,
          ...(body.profile ? { profile: body.profile } : {}),
          ...(plan ? { plan } : {}),
          ...(weather ? { weather } : {}),
        },
        { ...(env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY } : {}), model: env.ANTHROPIC_MODEL },
      );
      return result;
    },
  );

  app.get("/api/products", async () =>
    listProducts().map(({ partnerUrl: _omit, ...rest }) => rest),
  );

  // Affiliate redirect (PRD Appendix B): all product links pass through here
  // for click analytics. productId resolves against the server-side catalog
  // only — client-supplied URLs are never followed (no open redirect).
  app.get("/api/affiliate/redirect", async (req, reply) => {
    const { productId } = z
      .object({ productId: z.string().min(1).max(100), userId: z.string().max(100).optional() })
      .parse(req.query);
    const product = getProduct(productId);
    if (!product) {
      return reply.status(404).send({ error: "unknown_product" });
    }
    req.log.info({ productId, partner: product.partner }, "affiliate_click");
    return reply.redirect(product.partnerUrl, 302);
  });

  return app;
}
