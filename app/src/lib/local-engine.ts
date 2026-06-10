import type {
  CatalogProduct,
  DailyForecast,
  LawnProfile,
  PlanTask,
  WeatherSummary,
  WeeklyPlan,
} from "./types";

/**
 * Standalone fallback engine — a client-side port of the server's PlanGen v1
 * (server/src/services/plangen.ts) and demo chat responder. Used only when
 * the API is unreachable, so the static web export and offline devices stay
 * fully testable. Keep the rules in sync with the server copy.
 */

type ZoneGroup = "cool" | "transition" | "warm";

function zoneGroupForLat(lat: number): ZoneGroup {
  if (lat >= 40) return "cool";
  if (lat >= 35) return "transition";
  return "warm";
}

interface TreatmentRule {
  id: string;
  title: string;
  category: string;
  zones: ZoneGroup[];
  weekWindow: [number, number];
  minSoilTempF?: number;
  maxSoilTempF?: number;
  estimatedMinutes: number;
  rationale: string;
  deepDive: string;
  productCategory?: string;
  baseScore: number;
}

const RULES: TreatmentRule[] = [
  {
    id: "pre-emergent-cool",
    title: "Apply pre-emergent herbicide",
    category: "weed_control",
    zones: ["cool", "transition"],
    weekWindow: [8, 18],
    minSoilTempF: 50,
    maxSoilTempF: 58,
    estimatedMinutes: 45,
    rationale:
      "Soil temps are in the 50–55°F window — crabgrass germinates right after this, so the barrier needs to go down now.",
    deepDive:
      "Apply when soil temps hold 50–55°F for 3 consecutive days. Water in with ~0.25 inch unless rain is forecast within 48 hours. Plan a second application 6–8 weeks later. Skip pre-emergent anywhere you plan to seed this spring.",
    productCategory: "pre_emergent",
    baseScore: 90,
  },
  {
    id: "pre-emergent-warm",
    title: "Apply pre-emergent herbicide",
    category: "weed_control",
    zones: ["warm"],
    weekWindow: [4, 13],
    estimatedMinutes: 45,
    rationale:
      "Late winter is the pre-emergent window in warm-season zones — beating weed germination is the whole game.",
    deepDive:
      "Apply late January through March. Bermuda and Zoysia lawns often benefit from a split August application targeting winter annual weeds. Water in after application.",
    productCategory: "pre_emergent",
    baseScore: 88,
  },
  {
    id: "spring-fertilizer",
    title: "Apply slow-release spring fertilizer",
    category: "fertilization",
    zones: ["cool", "transition", "warm"],
    weekWindow: [10, 24],
    minSoilTempF: 55,
    estimatedMinutes: 30,
    rationale:
      "Soil temps passed 55°F and the lawn is actively growing — a slow-release nitrogen feed now builds density before summer stress.",
    deepDive:
      "Use a slow-release nitrogen formula. Cool-season lawns: feed once green-up is underway. Warm-season lawns: wait until fully out of dormancy (soil > 65°F). Apply at the bag's labeled rate — more is not better.",
    productCategory: "fertilizer",
    baseScore: 80,
  },
  {
    id: "mow-weekly",
    title: "Mow at the right height",
    category: "mowing",
    zones: ["cool", "transition", "warm"],
    weekWindow: [10, 45],
    estimatedMinutes: 40,
    rationale:
      "Growth is active this week — never remove more than a third of the blade in one cut.",
    deepDive:
      "Cool-season grasses: keep 3–4 inches. Bermuda: 1–2 inches. Zoysia: 1.5–2.5 inches. Sharp blades cut clean; dull blades tear and brown the tips. Leave clippings — they return nitrogen.",
    baseScore: 55,
  },
  {
    id: "water-deep",
    title: "Water deeply and infrequently",
    category: "watering",
    zones: ["cool", "transition", "warm"],
    weekWindow: [1, 52],
    estimatedMinutes: 15,
    rationale:
      "Hot, dry stretch ahead with little rain in the forecast — one deep soak beats daily sprinkles for root depth.",
    deepDive:
      "Target ~1 inch per week including rainfall, in 1–2 deep sessions. Water before 10 AM to limit evaporation and fungus. Increase frequency when soil temps exceed 80°F.",
    baseScore: 50,
  },
  {
    id: "overseed-fall-cool",
    title: "Overseed thin areas",
    category: "seeding",
    zones: ["cool", "transition"],
    weekWindow: [34, 42],
    estimatedMinutes: 90,
    rationale:
      "Late summer through early fall is the best seeding window of the year — warm soil, cooling air, and weeds winding down.",
    deepDive:
      "Mow short, rake out debris, spread seed at the labeled overseeding rate, and keep the top half-inch of soil consistently moist for 2–3 weeks.",
    productCategory: "seed",
    baseScore: 85,
  },
  {
    id: "aeration-fall-cool",
    title: "Core aerate compacted areas",
    category: "aeration",
    zones: ["cool", "transition"],
    weekWindow: [36, 42],
    estimatedMinutes: 60,
    rationale:
      "Fall aeration relieves a season of compaction while cool-season roots are in their strongest growth phase.",
    deepDive:
      "Use a core aerator (not spikes) when soil is moist but not saturated. Leave the plugs to break down. Pairs perfectly with overseeding.",
    productCategory: "aeration",
    baseScore: 70,
  },
  {
    id: "aeration-warm",
    title: "Core aerate compacted areas",
    category: "aeration",
    zones: ["warm"],
    weekWindow: [20, 26],
    estimatedMinutes: 60,
    rationale:
      "Late spring is the aeration window for warm-season grass — it's growing fast enough to recover quickly.",
    deepDive:
      "Aerate Bermuda/Zoysia in May–June while actively growing. Avoid fall aeration in warm-season zones — recovery growth is insufficient before dormancy.",
    productCategory: "aeration",
    baseScore: 68,
  },
  {
    id: "grub-prevention",
    title: "Apply preventive grub control",
    category: "pest_control",
    zones: ["cool", "transition", "warm"],
    weekWindow: [21, 28],
    estimatedMinutes: 30,
    rationale:
      "Grub eggs hatch mid-summer — preventive control applied now stops root damage before it starts.",
    deepDive:
      "Apply a preventive product (imidacloprid or chlorantraniliprole) late May–July, before peak egg hatch. Water in with ~0.5 inch. Always follow label rates exactly.",
    productCategory: "grub_control",
    baseScore: 65,
  },
];

const GOAL_BOOST: Record<string, Record<string, number>> = {
  keep_green: { fertilization: 15, watering: 10, mowing: 5 },
  fix_regrow: { seeding: 20, aeration: 15, fertilization: 10 },
  stop_weeds: { weed_control: 25, mowing: 5 },
  low_maintenance: { watering: 10, mowing: 10 },
};

const CONDITION_SCORE: Record<string, number> = {
  beautiful: 9,
  pretty_good: 7,
  needs_work: 5,
  total_mess: 3,
};

export const LOCAL_CATALOG: (CatalogProduct & { partnerUrl: string })[] = [
  {
    productId: "pre-emergent-halts",
    name: "Crabgrass Pre-Emergent (Scotts Halts)",
    category: "pre_emergent",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B003E243PA",
  },
  {
    productId: "fert-slow-release",
    name: "Slow-Release Lawn Fertilizer 30-0-4",
    category: "fertilizer",
    partner: "home_depot",
    partnerUrl:
      "https://www.homedepot.com/b/Outdoors-Garden-Center-Lawn-Care-Lawn-Fertilizers/N-5yc1vZc8rb",
  },
  {
    productId: "seed-tall-fescue",
    name: "Tall Fescue Overseeding Mix",
    category: "seed",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B01EZBQ4D2",
  },
  {
    productId: "aerator-core",
    name: "Manual Core Aerator",
    category: "aeration",
    partner: "true_value",
    partnerUrl: "https://www.truevalue.com/lawn-garden",
  },
  {
    productId: "grub-preventer",
    name: "Season-Long Grub Preventer (chlorantraniliprole)",
    category: "grub_control",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B00AQ3MWEU",
  },
];

export function localPartnerUrl(productId: string): string | null {
  return LOCAL_CATALOG.find((p) => p.productId === productId)?.partnerUrl ?? null;
}

function isoWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function inWindow(week: number, [start, end]: [number, number]): boolean {
  return start <= end ? week >= start && week <= end : week >= start || week <= end;
}

function seasonalForecast(lat: number, now: Date): WeatherSummary {
  const month = now.getMonth();
  const seasonal = [35, 38, 48, 58, 68, 78, 84, 82, 74, 62, 50, 40][month] ?? 60;
  const high = Math.round(seasonal + (40 - lat) * 0.8);
  const days: DailyForecast[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      tempMaxF: high,
      tempMinF: high - 18,
      precipProbability: 20,
      precipInches: 0.05,
      soilTempF: high - 12,
    };
  });
  return { source: "fallback", fetchedAt: now.toISOString(), days };
}

export function generateLocalPlan(profile: LawnProfile, now: Date = new Date()): WeeklyPlan {
  const week = isoWeekOfYear(now);
  const zone = zoneGroupForLat(profile.lat);
  const weather = seasonalForecast(profile.lat, now);
  const avgSoilTemp = weather.days.reduce((s, d) => s + d.soilTempF, 0) / weather.days.length;
  const avgHigh = weather.days.reduce((s, d) => s + d.tempMaxF, 0) / weather.days.length;
  const totalRain = weather.days.reduce((s, d) => s + d.precipInches, 0);
  const boosts = GOAL_BOOST[profile.primaryGoal] ?? {};

  const scored = RULES.filter((r) => r.zones.includes(zone))
    .filter((r) => inWindow(week, r.weekWindow))
    .filter((r) => r.minSoilTempF === undefined || avgSoilTemp >= r.minSoilTempF)
    .map((r) => {
      let score = r.baseScore;
      if (r.maxSoilTempF !== undefined && avgSoilTemp > r.maxSoilTempF) score -= 25;
      if (r.category === "watering") {
        if (totalRain >= 0.75) score -= 50;
        if (avgHigh >= 85 && totalRain < 0.25) score += 30;
      }
      if (r.category === "seeding" && avgHigh >= 90) score -= 30;
      score += boosts[r.category] ?? 0;
      if (
        (profile.condition === "needs_work" || profile.condition === "total_mess") &&
        ["seeding", "aeration", "weed_control"].includes(r.category)
      ) {
        score += 10;
      }
      return { r, score };
    })
    .filter(({ score }) => score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const tasks: PlanTask[] = scored.map(({ r, score }, idx) => {
    const product = r.productCategory
      ? LOCAL_CATALOG.find((p) => p.category === r.productCategory)
      : undefined;
    return {
      id: `${r.id}-w${week}`,
      title: r.title,
      priority: score >= 90 ? "urgent" : idx < 2 ? "this_week" : "optional",
      estimatedMinutes: r.estimatedMinutes,
      rationale: r.rationale,
      deepDive: r.deepDive,
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

  const start = new Date(now);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  return {
    weekStartDate: start.toISOString().slice(0, 10),
    weekLabel: `Week of ${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    weatherBanner:
      avgHigh >= 85 ? "Hot and dry this week — watering is the priority." : avgHigh >= 70 ? "Warm and dry this week — a good window for treatments." : avgHigh <= 40 ? "Cold week ahead — the lawn is resting, and so can you." : "Mild week ahead — steady growing conditions.",
    healthScore: CONDITION_SCORE[profile.condition] ?? 5,
    healthTrend: "flat",
    tasks,
    weather,
    generatedAt: now.toISOString(),
  };
}

const DEMO_NOTE =
  "\n\n(Standalone demo answer — run the API server with ANTHROPIC_API_KEY for live weather and Claude responses.)";

export function localChatResponse(message: string, profile?: LawnProfile): string {
  const q = message.toLowerCase();
  const grass = profile?.grassType ?? "your grass";

  if (/water/.test(q)) {
    return `For ${grass}, aim for about 1 inch of water per week including rain, in one or two deep sessions rather than daily sprinkles — deep watering builds deep roots. Water before 10 AM to limit evaporation and fungus.${DEMO_NOTE}`;
  }
  if (/yellow|brown|patch|spot/.test(q)) {
    return `Yellow or brown patches near driveways and walkways are most often heat reflection, dog spots, or grub damage. Tug a patch: if it lifts like carpet, suspect grubs; if it's firm, it's likely drought or salt stress. Water deeply and re-check in a week.${DEMO_NOTE}`;
  }
  if (/fertili[sz]/.test(q)) {
    return `Use a slow-release nitrogen fertilizer once soil temps hold above 55°F. Apply at the labeled rate — over-applying invites disease and burn.${DEMO_NOTE}`;
  }
  if (/overseed|seed/.test(q)) {
    return `For cool-season lawns the best overseeding window is late August through October — warm soil, cool air, less weed competition. Spring seeding works but fails more often. Skip pre-emergent anywhere you seed.${DEMO_NOTE}`;
  }
  if (/aerat/.test(q)) {
    return `Aerate when soil is moist but not saturated — typically a day or two after rain, not right before it. Cool-season lawns: fall. Warm-season: late spring.${DEMO_NOTE}`;
  }
  if (profile) {
    const plan = generateLocalPlan(profile);
    const top = plan.tasks[0];
    if (top) {
      return `Good question. The most impactful thing for your lawn this week is: ${top.title.toLowerCase()} — ${top.rationale}${DEMO_NOTE}`;
    }
  }
  return `I can help with watering, fertilizing, weeds, seeding, aeration, and diagnosis — ask away.${DEMO_NOTE}`;
}
