const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
import type { GeneratedPlan } from "@courseplan/shared";

export type GeneratePlanPayload = {
  wishlist: string[];
  completed: string[];
  constraints: {
    minCredits: number;
    maxCredits: number;
    noEarlierThanMin?: number;
    maxDailyClassMins?: number;
  };
};

export type GeneratePlanResponse = GeneratedPlan;

export async function generatePlan(payload: GeneratePlanPayload) {
  const res = await fetch(`${API_URL}/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as GeneratePlanResponse;
}
