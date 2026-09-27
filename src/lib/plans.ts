import type { ExerciseId } from "./exercises.ts";
export type PlanId = "starter" | "strength" | "cardio";
export type PlanExercise = { exerciseId: ExerciseId; sets: number; target: number; rest: number };
export type CustomPlan = { name: string; trainingDays: number[]; items: PlanExercise[] };
export const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export type TrainingPlan = { id: PlanId; name: string; subtitle: string; duration: string; days: string; exerciseIds: ExerciseId[]; accent: string };
export const plans: TrainingPlan[] = [
  { id: "starter", name: "เริ่มต้นทั้งตัว", subtitle: "ค่อย ๆ สร้างพื้นฐานให้ครบทุกส่วน", duration: "20–25 นาที", days: "3 วัน/สัปดาห์", exerciseIds: ["knee-push-up", "squat", "glute-bridge", "plank"], accent: "lime" },
  { id: "strength", name: "ขาและแกนกลาง", subtitle: "เพิ่มความแข็งแรงและการทรงตัว", duration: "25–30 นาที", days: "3 วัน/สัปดาห์", exerciseIds: ["forward-lunge", "glute-bridge", "squat", "side-plank"], accent: "blue" },
  { id: "cardio", name: "คาร์ดิโอทั้งตัว", subtitle: "ขยับให้สนุก สลับแรงกับการหายใจ", duration: "20–25 นาที", days: "2–3 วัน/สัปดาห์", exerciseIds: ["jumping-jack", "high-knees", "push-up", "plank"], accent: "orange" },
];
export const byPlanId = (id: PlanId) => plans.find((plan) => plan.id === id) ?? plans[0];
