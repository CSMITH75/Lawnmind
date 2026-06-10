import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { loadEnv } from "../src/env.js";

let app: FastifyInstance;

beforeAll(async () => {
  // Unroutable weather base forces the graceful-degradation path in tests.
  app = await buildServer(
    loadEnv({
      NODE_ENV: "test",
      WEATHER_API_BASE: "http://127.0.0.1:1",
      WEATHER_CACHE_TTL_SECONDS: "0",
    }),
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const profile = {
  zipCode: "49503",
  lat: 42.96,
  lng: -85.67,
  grassType: "Kentucky Bluegrass",
  lawnSizeCategory: "medium",
  condition: "needs_work",
  primaryGoal: "stop_weeds",
};

describe("hardening", () => {
  it("sets security headers", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("rejects malformed plan input with a clean validation envelope", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/plan/generate",
      payload: { ...profile, zipCode: "not-a-zip", lat: 999 },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe("validation_error");
    expect(JSON.stringify(body)).not.toMatch(/at Object|node_modules|\.ts:/); // no stack leakage
  });

  it("rejects oversized chat messages", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { message: "x".repeat(3000) },
    });
    expect(res.statusCode).toBe(400);
  });

  it("does not act as an open redirect", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/affiliate/redirect?productId=https%3A%2F%2Fevil.example.com",
    });
    expect(res.statusCode).toBe(404);
  });

  it("redirects only to catalog partner URLs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/affiliate/redirect?productId=pre-emergent-halts",
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/www\.amazon\.com\//);
  });
});

describe("plan + chat flow", () => {
  it("generates a weekly plan even when the weather upstream is down", async () => {
    const res = await app.inject({ method: "POST", url: "/api/plan/generate", payload: profile });
    expect(res.statusCode).toBe(200);
    const plan = res.json();
    expect(plan.weather.source).toBe("fallback");
    expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
  });

  it("answers chat in mock mode without an API key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { message: "How often should I water?", profile },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe("mock");
    expect(body.response).toMatch(/water/i);
  });

  it("hides partner URLs from the product listing", async () => {
    const res = await app.inject({ method: "GET", url: "/api/products" });
    expect(res.statusCode).toBe(200);
    for (const p of res.json()) {
      expect(p.partnerUrl).toBeUndefined();
    }
  });
});
