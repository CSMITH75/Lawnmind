import { Platform } from "react-native";
import {
  generateLocalPlan,
  LOCAL_CATALOG,
  localChatResponse,
  localPartnerUrl,
} from "./local-engine";
import type { CatalogProduct, ChatTurn, LawnProfile, WeeklyPlan } from "./types";

/**
 * Thin API client. The base URL comes from EXPO_PUBLIC_API_URL so the same
 * build runs against localhost on web/simulator or a LAN/staging host on
 * device. No secrets live in the client — the server holds the Claude key.
 *
 * Every call falls back to the bundled local engine when the API is
 * unreachable, so the static web export is a fully working standalone demo.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Tracks whether the API answered recently, so links route appropriately. */
let apiReachable = true;

export async function generatePlan(profile: LawnProfile): Promise<WeeklyPlan> {
  try {
    const plan = await request<WeeklyPlan>("/api/plan/generate", {
      method: "POST",
      body: JSON.stringify(profile),
    });
    apiReachable = true;
    return plan;
  } catch {
    apiReachable = false;
    return generateLocalPlan(profile);
  }
}

export async function sendChat(
  message: string,
  history: ChatTurn[],
  profile?: LawnProfile,
): Promise<{ response: string; source: "claude" | "mock" | "local" }> {
  try {
    const result = await request<{ response: string; source: "claude" | "mock" }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, profile }),
    });
    apiReachable = true;
    return result;
  } catch {
    apiReachable = false;
    return { response: localChatResponse(message, profile), source: "local" };
  }
}

export async function listProducts(): Promise<CatalogProduct[]> {
  try {
    const products = await request<CatalogProduct[]>("/api/products");
    apiReachable = true;
    return products;
  } catch {
    apiReachable = false;
    return LOCAL_CATALOG.map(({ partnerUrl: _omit, ...rest }) => rest);
  }
}

export function affiliateUrl(productId: string): string {
  // With the API up, links route through the tracked redirect; standalone,
  // they go straight to the partner so the demo still works end to end.
  if (!apiReachable) {
    return localPartnerUrl(productId) ?? `${API_BASE}/api/affiliate/redirect?productId=${encodeURIComponent(productId)}`;
  }
  return `${API_BASE}/api/affiliate/redirect?productId=${encodeURIComponent(productId)}`;
}

export async function health(): Promise<{ status: string; chatMode: "claude" | "mock" | "local" }> {
  try {
    const h = await request<{ status: string; chatMode: "claude" | "mock" }>("/api/health");
    apiReachable = true;
    return h;
  } catch {
    apiReachable = false;
    return { status: "standalone", chatMode: "local" };
  }
}
