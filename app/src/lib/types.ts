// Shared API types — keep in sync with server/src/types.ts.

export type LawnSizeCategory = "small" | "medium" | "large";
export type LawnCondition = "beautiful" | "pretty_good" | "needs_work" | "total_mess";
export type PrimaryGoal = "keep_green" | "fix_regrow" | "stop_weeds" | "low_maintenance";

export interface LawnProfile {
  zipCode: string;
  lat: number;
  lng: number;
  grassType: string;
  lawnSizeCategory: LawnSizeCategory;
  condition: LawnCondition;
  primaryGoal: PrimaryGoal;
  soilType?: string;
}

export interface DailyForecast {
  date: string;
  tempMaxF: number;
  tempMinF: number;
  precipProbability: number;
  precipInches: number;
  soilTempF: number;
}

export interface WeatherSummary {
  source: "open-meteo" | "fallback";
  fetchedAt: string;
  days: DailyForecast[];
}

export type TaskPriority = "urgent" | "this_week" | "optional";

export interface ProductRecommendation {
  productId: string;
  name: string;
  category: string;
}

export interface PlanTask {
  id: string;
  title: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  rationale: string;
  deepDive: string;
  product?: ProductRecommendation;
}

export interface WeeklyPlan {
  weekStartDate: string;
  weekLabel: string;
  weatherBanner: string;
  healthScore: number;
  healthTrend: "up" | "flat" | "down";
  tasks: PlanTask[];
  weather: WeatherSummary;
  generatedAt: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CatalogProduct {
  productId: string;
  name: string;
  category: string;
  partner: string;
}
