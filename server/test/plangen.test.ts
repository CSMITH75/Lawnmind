import { describe, expect, it } from "vitest";
import { generatePlan, isoWeekOfYear } from "../src/services/plangen.js";
import { fallbackForecast } from "../src/services/weather.js";
import type { LawnProfile, WeatherSummary } from "../src/types.js";

const coolProfile: LawnProfile = {
  zipCode: "49503",
  lat: 42.96,
  lng: -85.67,
  grassType: "Kentucky Bluegrass",
  lawnSizeCategory: "medium",
  condition: "needs_work",
  primaryGoal: "stop_weeds",
};

function flatWeather(opts: { high: number; soil: number; rain?: number }): WeatherSummary {
  return {
    source: "fallback",
    fetchedAt: new Date().toISOString(),
    days: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-${String(6 + i).padStart(2, "0")}`,
      tempMaxF: opts.high,
      tempMinF: opts.high - 18,
      precipProbability: 20,
      precipInches: opts.rain ?? 0,
      soilTempF: opts.soil,
    })),
  };
}

describe("isoWeekOfYear", () => {
  it("computes ISO weeks", () => {
    expect(isoWeekOfYear(new Date("2026-01-01"))).toBe(1);
    expect(isoWeekOfYear(new Date("2026-06-10"))).toBe(24);
  });
});

describe("generatePlan", () => {
  it("produces 2-4 prioritized tasks", () => {
    const plan = generatePlan(coolProfile, flatWeather({ high: 62, soil: 53 }), new Date("2026-04-08"));
    expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
    expect(plan.tasks.length).toBeLessThanOrEqual(4);
    for (const t of plan.tasks) {
      expect(t.rationale.length).toBeGreaterThan(10);
      expect(["urgent", "this_week", "optional"]).toContain(t.priority);
    }
  });

  it("surfaces pre-emergent as urgent in the 50-55F soil window for a stop_weeds goal", () => {
    const plan = generatePlan(coolProfile, flatWeather({ high: 62, soil: 53 }), new Date("2026-04-08"));
    const pre = plan.tasks.find((t) => t.title.toLowerCase().includes("pre-emergent"));
    expect(pre).toBeDefined();
    expect(pre!.priority).toBe("urgent");
    expect(pre!.product?.category).toBe("pre_emergent");
  });

  it("suppresses pre-emergent when soil is too cold", () => {
    const plan = generatePlan(coolProfile, flatWeather({ high: 45, soil: 38 }), new Date("2026-04-08"));
    const pre = plan.tasks.find((t) => t.title.toLowerCase().includes("pre-emergent"));
    expect(pre).toBeUndefined();
  });

  it("downranks watering when the week is rainy", () => {
    const rainy = generatePlan(coolProfile, flatWeather({ high: 70, soil: 60, rain: 0.3 }), new Date("2026-06-10"));
    const dry = generatePlan(coolProfile, flatWeather({ high: 90, soil: 75, rain: 0 }), new Date("2026-06-10"));
    const rainyHasWatering = rainy.tasks.some((t) => t.title.toLowerCase().includes("water"));
    const dryWatering = dry.tasks.find((t) => t.title.toLowerCase().includes("water"));
    expect(rainyHasWatering).toBe(false);
    expect(dryWatering).toBeDefined();
  });

  it("boosts seeding/aeration in fall for a fix_regrow goal", () => {
    const plan = generatePlan(
      { ...coolProfile, primaryGoal: "fix_regrow" },
      flatWeather({ high: 72, soil: 64 }),
      new Date("2026-09-15"),
    );
    expect(plan.tasks[0]!.title.toLowerCase()).toMatch(/overseed/);
  });

  it("works with the synthetic fallback forecast (offline mode)", () => {
    const plan = generatePlan(coolProfile, fallbackForecast(coolProfile.lat, new Date("2026-06-10")), new Date("2026-06-10"));
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.weather.source).toBe("fallback");
  });
});
