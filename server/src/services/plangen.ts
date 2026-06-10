import {
  CONDITION_SCORE,
  GOAL_CATEGORY_BOOST,
  TREATMENT_RULES,
  zoneGroupForLat,
} from "../data/regional.js";
import { firstProductInCategory } from "../data/catalog.js";
import type { LawnProfile, PlanTask, WeatherSummary, WeeklyPlan } from "../types.js";

/**
 * PlanGen v1 (PRD §4.3, Appendix B "Start with PlanGen").
 *
 * Deterministic scoring over the static regional treatment calendar plus the
 * live 7-day forecast. No model call — the agent layer explains plans, the
 * pipeline generates them, which keeps weekly plans reproducible and free.
 */

export function isoWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function inWindow(week: number, [start, end]: [number, number]): boolean {
  return start <= end ? week >= start && week <= end : week >= start || week <= end;
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function weatherBanner(weather: WeatherSummary): string {
  const days = weather.days;
  if (days.length === 0) return "Weather data unavailable — showing your last known plan.";
  const avgHigh = days.reduce((s, d) => s + d.tempMaxF, 0) / days.length;
  const totalRain = days.reduce((s, d) => s + d.precipInches, 0);
  const wet = totalRain >= 0.75;
  if (avgHigh >= 85 && !wet) return "Hot and dry this week — watering is the priority.";
  if (avgHigh >= 70 && !wet) return "Warm and dry this week — a good window for treatments.";
  if (wet) return "Rain on the way — let nature handle the watering and time granular products before it.";
  if (avgHigh <= 40) return "Cold week ahead — the lawn is resting, and so can you.";
  return "Mild week ahead — steady growing conditions.";
}

export function generatePlan(
  profile: LawnProfile,
  weather: WeatherSummary,
  now: Date = new Date(),
): WeeklyPlan {
  const week = isoWeekOfYear(now);
  const zone = zoneGroupForLat(profile.lat);
  const soilTemps = weather.days.map((d) => d.soilTempF);
  const avgSoilTemp = soilTemps.length
    ? soilTemps.reduce((a, b) => a + b, 0) / soilTemps.length
    : 55;
  const totalRain = weather.days.reduce((s, d) => s + d.precipInches, 0);
  const avgHigh = weather.days.length
    ? weather.days.reduce((s, d) => s + d.tempMaxF, 0) / weather.days.length
    : 70;

  const goalBoosts = GOAL_CATEGORY_BOOST[profile.primaryGoal] ?? {};

  const scored = TREATMENT_RULES.filter((rule) => rule.zones.includes(zone))
    .filter((rule) => inWindow(week, rule.weekWindow))
    // Hard soil-temperature gate (PRD §4.3 step 4): a treatment applied below
    // its minimum soil temp is wasted or harmful, so it never makes the plan.
    .filter((rule) => rule.minSoilTempF === undefined || avgSoilTemp >= rule.minSoilTempF)
    .map((rule) => {
      let score = rule.baseScore;

      // Past the upper soil-temp window: still useful, but losing value.
      if (rule.maxSoilTempF !== undefined && avgSoilTemp > rule.maxSoilTempF) score -= 25;

      // Weather adjustments.
      if (rule.category === "watering") {
        if (totalRain >= 0.75) score -= 50; // rain covers it
        if (avgHigh >= 85 && totalRain < 0.25) score += 30;
      }
      if (rule.category === "seeding" && avgHigh >= 90) score -= 30;

      // User goal weighting (PRD §4.3 step 5).
      score += goalBoosts[rule.category] ?? 0;

      // Lawns in poor shape prioritize recovery categories.
      if (
        (profile.condition === "needs_work" || profile.condition === "total_mess") &&
        (rule.category === "seeding" || rule.category === "aeration" || rule.category === "weed_control")
      ) {
        score += 10;
      }

      return { rule, score };
    })
    .filter(({ score }) => score >= 40)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 4);

  const tasks: PlanTask[] = top.map(({ rule, score }, idx) => {
    const product = rule.productCategory
      ? firstProductInCategory(rule.productCategory)
      : undefined;
    return {
      id: `${rule.id}-w${week}`,
      title: rule.title,
      priority: score >= 90 ? "urgent" : idx < 2 ? "this_week" : "optional",
      estimatedMinutes: rule.estimatedMinutes,
      rationale: rule.rationaleTemplate,
      deepDive: rule.deepDive,
      ...(product
        ? {
            product: {
              productId: product.productId,
              name: product.name,
              category: product.category,
            },
          }
        : {}),
    };
  });

  const start = weekStart(now);
  const baseScore = CONDITION_SCORE[profile.condition] ?? 5;

  return {
    weekStartDate: start.toISOString().slice(0, 10),
    weekLabel: `Week of ${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    weatherBanner: weatherBanner(weather),
    healthScore: baseScore,
    healthTrend: "flat",
    tasks,
    weather,
    generatedAt: now.toISOString(),
  };
}
