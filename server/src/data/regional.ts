import type { ZoneGroup } from "../types.js";

/**
 * Static regional reference data, seeded per PRD Appendix A / B
 * ("Regional Data Seeding": load once, do not fetch live).
 *
 * Zone resolution is latitude-banded for v1 — a coarse but deterministic
 * proxy for USDA hardiness zone groups across the continental US/Canada.
 */
export function zoneGroupForLat(lat: number): ZoneGroup {
  if (lat >= 40) return "cool";
  if (lat >= 35) return "transition";
  return "warm";
}

export const GRASS_TYPES_BY_ZONE: Record<ZoneGroup, string[]> = {
  cool: ["Kentucky Bluegrass", "Tall Fescue", "Perennial Ryegrass", "Fine Fescue"],
  transition: ["Tall Fescue", "Zoysia", "Kentucky Bluegrass", "Bermuda"],
  warm: ["Bermuda", "Zoysia", "St. Augustine", "Centipede", "Bahia"],
};

export interface TreatmentRule {
  id: string;
  title: string;
  category: string;
  zones: ZoneGroup[];
  /** ISO week-of-year window (inclusive) when this treatment is in season. */
  weekWindow: [number, number];
  /** Soil temperature gate in °F, if any. */
  minSoilTempF?: number;
  maxSoilTempF?: number;
  estimatedMinutes: number;
  rationaleTemplate: string;
  deepDive: string;
  productCategory?: string;
  baseScore: number;
}

/** Seasonal treatment calendar distilled from PRD Appendix A. */
export const TREATMENT_RULES: TreatmentRule[] = [
  {
    id: "pre-emergent-cool",
    title: "Apply pre-emergent herbicide",
    category: "weed_control",
    zones: ["cool", "transition"],
    weekWindow: [8, 18],
    minSoilTempF: 50,
    maxSoilTempF: 58,
    estimatedMinutes: 45,
    rationaleTemplate:
      "Soil temps are in the 50–55°F window — crabgrass germinates right after this, so the barrier needs to go down now.",
    deepDive:
      "Apply when soil temps hold 50–55°F for 3 consecutive days. Water in with ~0.25 inch unless rain is forecast within 48 hours. Plan a second application 6–8 weeks later. Do not apply if you intend to overseed this spring — pre-emergent blocks grass seed too.",
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
    rationaleTemplate:
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
    rationaleTemplate:
      "Soil temps passed 55°F and the lawn is actively growing — a slow-release nitrogen feed now builds density before summer stress.",
    deepDive:
      "Use a slow-release nitrogen formula. Cool-season lawns: feed once green-up is underway. Warm-season lawns: wait until fully out of dormancy (soil > 65°F). Apply at the bag's labeled rate — more is not better; excess nitrogen invites disease.",
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
    rationaleTemplate:
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
    rationaleTemplate:
      "Hot, dry stretch ahead with little rain in the forecast — one deep soak beats daily sprinkles for root depth.",
    deepDive:
      "Target ~1 inch per week including rainfall, in 1–2 deep sessions. Water before 10 AM to limit evaporation and fungus. A tuna can on the lawn is a fine rain gauge. Increase frequency when soil temps exceed 80°F.",
    baseScore: 50,
  },
  {
    id: "overseed-fall-cool",
    title: "Overseed thin areas",
    category: "seeding",
    zones: ["cool", "transition"],
    weekWindow: [34, 42],
    estimatedMinutes: 90,
    rationaleTemplate:
      "Late summer through early fall is the best seeding window of the year — warm soil, cooling air, and weeds winding down.",
    deepDive:
      "Mow short, rake out debris, spread seed at the labeled overseeding rate, and keep the top half-inch of soil consistently moist for 2–3 weeks. Skip pre-emergent for the season in any area you seed.",
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
    rationaleTemplate:
      "Fall aeration relieves a season of compaction while cool-season roots are in their strongest growth phase.",
    deepDive:
      "Use a core aerator (not spikes) when soil is moist but not saturated. Leave the plugs to break down. Pairs perfectly with overseeding — seed-to-soil contact improves dramatically.",
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
    rationaleTemplate:
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
    rationaleTemplate:
      "Grub eggs hatch mid-summer — preventive control applied now stops root damage before it starts.",
    deepDive:
      "Apply a preventive product (imidacloprid or chlorantraniliprole) late May–July, before peak egg hatch. Water in with ~0.5 inch. If you find more than 5 grubs per square foot in August–September, switch to a curative product. Always follow label rates exactly.",
    productCategory: "grub_control",
    baseScore: 65,
  },
];

export const GOAL_CATEGORY_BOOST: Record<string, Record<string, number>> = {
  keep_green: { fertilization: 15, watering: 10, mowing: 5 },
  fix_regrow: { seeding: 20, aeration: 15, fertilization: 10 },
  stop_weeds: { weed_control: 25, mowing: 5 },
  low_maintenance: { watering: 10, mowing: 10 },
};

export const CONDITION_SCORE: Record<string, number> = {
  beautiful: 9,
  pretty_good: 7,
  needs_work: 5,
  total_mess: 3,
};
