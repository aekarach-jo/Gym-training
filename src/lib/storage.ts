import { exercises, type ExerciseId } from "./exercises";
import { plans, type PlanId } from "./plans";

export type SetEntry = { id: string; exerciseId: ExerciseId; value: number; source: "manual" | "camera" | "timer"; at: string; side?: "left" | "right" };
export type WeightEntry = { id: string; date: string; kg: number };
export type TrainingData = { version: 2; entries: SetEntry[]; challengeGoal: number; activePlanId: PlanId; weights: WeightEntry[]; weightGoalKg: number | null };
export const initialData: TrainingData = { version: 2, entries: [], challengeGoal: 10, activePlanId: "starter", weights: [], weightGoalKg: null };
const key = "gym-training-personal-v1";
const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
const planIds = new Set(plans.map((plan) => plan.id));

function validEntry(value: unknown): value is SetEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<SetEntry>;
  return typeof entry.id === "string" && exerciseIds.has(entry.exerciseId as ExerciseId)
    && typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value > 0 && entry.value <= 10000
    && typeof entry.at === "string" && !Number.isNaN(Date.parse(entry.at))
    && ["manual", "camera", "timer"].includes(entry.source || "")
    && (entry.side === undefined || entry.side === "left" || entry.side === "right");
}

function validWeight(value: unknown): value is WeightEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<WeightEntry>;
  return typeof entry.id === "string" && typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    && !Number.isNaN(Date.parse(entry.date + "T12:00:00")) && Number.isFinite(entry.kg) && Number(entry.kg) >= 20 && Number(entry.kg) <= 500;
}

function normalize(value: unknown, strict: boolean): TrainingData | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<TrainingData> & { version?: number };
  if (![1, 2].includes(input.version ?? 0) || !Array.isArray(input.entries)) return null;
  if (strict && (!input.entries.every(validEntry) || (input.version === 2 && (!Array.isArray(input.weights) || !input.weights.every(validWeight))))) return null;
  const entries = input.entries.filter(validEntry);
  const weights = (Array.isArray(input.weights) ? input.weights : []).filter(validWeight).sort((a, b) => a.date.localeCompare(b.date));
  const goal = Number(input.weightGoalKg);
  return {
    version: 2, entries,
    challengeGoal: Number.isFinite(input.challengeGoal) ? Math.max(1, Math.min(100, Math.round(Number(input.challengeGoal)))) : 10,
    activePlanId: planIds.has(input.activePlanId as PlanId) ? input.activePlanId as PlanId : "starter",
    weights,
    weightGoalKg: input.weightGoalKg != null && goal >= 20 && goal <= 500 ? goal : null,
  };
}

export function readData(): TrainingData {
  try { return normalize(JSON.parse(localStorage.getItem(key) || "null"), false) ?? initialData; }
  catch { return initialData; }
}
export function saveData(data: TrainingData) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* Backup export remains available. */ }
}
export function importData(value: unknown): TrainingData | null { return normalize(value, true); }
