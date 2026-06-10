import { Platform } from "react-native";
import type { CatalogProduct, ChatTurn, LawnProfile, WeeklyPlan } from "./types";

/**
 * Thin API client. The base URL comes from EXPO_PUBLIC_API_URL so the same
 * build runs against localhost on web/simulator or a LAN/staging host on
 * device. No secrets live in the client — the server holds the Claude key.
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

export function generatePlan(profile: LawnProfile): Promise<WeeklyPlan> {
  return request<WeeklyPlan>("/api/plan/generate", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function sendChat(
  message: string,
  history: ChatTurn[],
  profile?: LawnProfile,
): Promise<{ response: string; source: "claude" | "mock" }> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, profile }),
  });
}

export function listProducts(): Promise<CatalogProduct[]> {
  return request<CatalogProduct[]>("/api/products");
}

export function affiliateUrl(productId: string): string {
  return `${API_BASE}/api/affiliate/redirect?productId=${encodeURIComponent(productId)}`;
}

export function health(): Promise<{ status: string; chatMode: "claude" | "mock" }> {
  return request("/api/health");
}
