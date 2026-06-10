import Anthropic from "@anthropic-ai/sdk";
import type { ChatTurn, LawnProfile, WeatherSummary, WeeklyPlan } from "../types.js";
import { zoneGroupForLat } from "../data/regional.js";

/**
 * ChatAgent service (PRD §5.3, §7.2, §9).
 *
 * The Anthropic API key lives only on the server; the mobile/web client never
 * sees it. When no key is configured the agent answers from a deterministic
 * local responder so the full app — including web — is testable without
 * credentials.
 */

export interface ChatContext {
  profile?: LawnProfile;
  plan?: WeeklyPlan;
  weather?: WeatherSummary;
  history: ChatTurn[];
  message: string;
}

export interface ChatResult {
  response: string;
  source: "claude" | "mock";
}

// PRD §9.1 identity block + behavioral rules.
const SYSTEM_PROMPT = `You are LawnMind, an expert lawn care AI. You combine agronomic science with the friendly directness of a knowledgeable neighbor. Always be specific to this user's lawn and conditions — never give generic advice.

Behavioral rules:
1. Always lead with the most actionable recommendation.
2. Cite local conditions (weather, soil temperature, season, grass type) when explaining why.
3. Recommend a product only when it is genuinely the best solution for the task — never let an affiliate opportunity override accuracy.
4. If unsure, say so plainly and suggest the user consult their local extension office.
5. Never give advice that could damage a lawn (e.g., wrong herbicide timing) without clear caveats, and never make health or safety claims about products — defer to product labeling.
6. Keep chat responses conversational and at most three paragraphs unless the user asks for a detailed plan.
7. Explain jargon inline in plain English.`;

function contextBlock(ctx: ChatContext): string {
  const parts: string[] = [];
  if (ctx.profile) {
    const zone = zoneGroupForLat(ctx.profile.lat);
    parts.push(
      `Lawn profile: ${ctx.profile.grassType} lawn, size ${ctx.profile.lawnSizeCategory}, condition ${ctx.profile.condition}, goal ${ctx.profile.primaryGoal}, climate zone group ${zone}, ZIP ${ctx.profile.zipCode}${ctx.profile.soilType ? `, soil ${ctx.profile.soilType}` : ""}.`,
    );
  }
  if (ctx.plan) {
    const tasks = ctx.plan.tasks.map((t) => `- ${t.title} (${t.priority}): ${t.rationale}`).join("\n");
    parts.push(`Current weekly plan (${ctx.plan.weekLabel}):\n${tasks}`);
  }
  if (ctx.weather && ctx.weather.days.length > 0) {
    const d = ctx.weather.days;
    const first = d[0]!;
    const rain = d.reduce((s, x) => s + x.precipInches, 0).toFixed(2);
    parts.push(
      `7-day forecast: highs ${Math.min(...d.map((x) => x.tempMaxF))}–${Math.max(...d.map((x) => x.tempMaxF))}°F, ~${rain} in total rain, soil temp ≈ ${first.soilTempF}°F.`,
    );
  }
  return parts.length ? `<user_context>\n${parts.join("\n\n")}\n</user_context>` : "";
}

export async function runChat(
  ctx: ChatContext,
  opts: { apiKey?: string; model: string },
): Promise<ChatResult> {
  if (!opts.apiKey) {
    return { response: mockResponse(ctx), source: "mock" };
  }

  const client = new Anthropic({ apiKey: opts.apiKey });
  const history = ctx.history.slice(-10); // bound the context blob (PRD Appendix B)
  const userContent = [contextBlock(ctx), ctx.message].filter(Boolean).join("\n\n");

  const messages: Anthropic.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content }) as Anthropic.MessageParam),
    { role: "user", content: userContent },
  ];

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { response: text || "I wasn't able to generate a response — try rephrasing?", source: "claude" };
}

/** Deterministic keyword responder used when no API key is configured. */
export function mockResponse(ctx: ChatContext): string {
  const q = ctx.message.toLowerCase();
  const grass = ctx.profile?.grassType ?? "your grass";
  const soil = ctx.weather?.days[0]?.soilTempF;

  if (/water/.test(q)) {
    return `For ${grass}, aim for about 1 inch of water per week including rain, in one or two deep sessions rather than daily sprinkles — deep watering builds deep roots.${soil ? ` Soil is around ${soil}°F right now, so morning watering before 10 AM is ideal.` : ""}\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
  }
  if (/yellow|brown|patch|spot/.test(q)) {
    return `Yellow or brown patches near driveways and walkways are most often heat reflection, dog spots, or grub damage. Tug a patch: if it lifts like carpet, suspect grubs; if it's firm, it's likely drought or salt stress. Water deeply and re-check in a week.\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
  }
  if (/fertili[sz]/.test(q)) {
    return `Use a slow-release nitrogen fertilizer once soil temps hold above 55°F${soil ? ` (currently ≈ ${soil}°F in your area)` : ""}. Apply at the labeled rate — over-applying invites disease and burn.\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
  }
  if (/overseed|seed/.test(q)) {
    return `For cool-season lawns the best overseeding window is late August through October — warm soil, cool air, less weed competition. Spring seeding works but fails more often. Skip pre-emergent anywhere you seed.\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
  }
  const firstTask = ctx.plan?.tasks[0];
  if (firstTask) {
    return `Good question. The most impactful thing for your lawn this week is: ${firstTask.title.toLowerCase()} — ${firstTask.rationale}\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
  }
  return `I can help with watering, fertilizing, weeds, seeding, and diagnosis. Finish onboarding so I can tailor advice to your lawn.\n\n(Offline demo answer — set ANTHROPIC_API_KEY on the server for live AI responses.)`;
}
