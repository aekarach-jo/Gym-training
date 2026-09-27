export type RepPhase = "find" | "top" | "bottom";

export type CameraRepState = { phase: RepPhase; lastValidAt: number | null; lastCountAt: number | null };
export const initialCameraRepState: CameraRepState = { phase: "find", lastValidAt: null, lastCountAt: null };

export function pauseCameraRepetition(state: CameraRepState, now: number): CameraRepState {
  return state.lastValidAt !== null && now - state.lastValidAt <= 650
    ? state
    : { ...initialCameraRepState, lastCountAt: state.lastCountAt };
}

export function advanceCameraRepetition(state: CameraRepState, top: boolean, bottom: boolean, now: number): CameraRepState & { counted: boolean } {
  if (state.phase === "find") return { ...state, phase: top ? "top" : "find", lastValidAt: now, counted: false };
  if (state.phase === "top") return { ...state, phase: bottom ? "bottom" : "top", lastValidAt: now, counted: false };
  if (!top) return { ...state, lastValidAt: now, counted: false };
  const counted = state.lastCountAt === null || now - state.lastCountAt >= 250;
  return { phase: "top", lastValidAt: now, lastCountAt: counted ? now : state.lastCountAt, counted };
}

export function pushUpZones(elbow: number, body: number) {
  return { valid: body >= 145, top: elbow >= 145, bottom: elbow <= 120 };
}

export type PushUpState = { phase: RepPhase; topAngle: number; bottomAngle: number; lastValidAt: number | null };
export const initialPushUpState: PushUpState = { phase: "find", topAngle: 0, bottomAngle: 180, lastValidAt: null };

export function advancePushUp(state: PushUpState, elbow: number | null, aligned: boolean, now: number): PushUpState & { counted: boolean } {
  if (elbow === null || !Number.isFinite(elbow) || !aligned) {
    const expired = state.lastValidAt === null || now - state.lastValidAt > 650;
    return { ...(expired ? initialPushUpState : state), counted: false };
  }
  if (state.phase === "find") {
    return elbow >= 145
      ? { phase: "top", topAngle: elbow, bottomAngle: 180, lastValidAt: now, counted: false }
      : { ...state, lastValidAt: now, counted: false };
  }
  if (state.phase === "top") {
    const topAngle = Math.max(state.topAngle, elbow);
    return elbow <= 120 && topAngle - elbow >= 35
      ? { phase: "bottom", topAngle, bottomAngle: elbow, lastValidAt: now, counted: false }
      : { ...state, topAngle, lastValidAt: now, counted: false };
  }
  const bottomAngle = Math.min(state.bottomAngle, elbow);
  return elbow >= 145 && elbow - bottomAngle >= 35
    ? { phase: "top", topAngle: elbow, bottomAngle: 180, lastValidAt: now, counted: true }
    : { ...state, bottomAngle, lastValidAt: now, counted: false };
}

export function squatZones(knee: number, hip: number) {
  return { top: knee >= 155 && hip >= 145, bottom: knee <= 120 && hip <= 140 };
}

export function plankValid(body: number, knee: number, elbow: number) {
  return body >= 150 && knee >= 145 && elbow >= 50 && elbow <= 130;
}

export function kneePushUpZones(elbow: number, shoulderHipKnee: number) {
  return { valid: shoulderHipKnee >= 135, top: elbow >= 145, bottom: elbow <= 120 };
}

export function lungeZones(knee: number, torsoTilt: number) {
  return { valid: torsoTilt <= 0.85, top: knee >= 150, bottom: knee <= 120 };
}

export function bridgeZones(shoulderHipKnee: number, hipLift: number) {
  return { top: shoulderHipKnee >= 145 && hipLift >= 0.1, bottom: shoulderHipKnee <= 135 && hipLift <= 0.08 };
}

export function relativeBridgeLift(shoulder: { x: number; y: number }, hip: { x: number; y: number }, knee: { x: number; y: number }) {
  return (shoulder.y - hip.y) / Math.max(0.08, Math.hypot(shoulder.x - knee.x, shoulder.y - knee.y));
}

export function sidePlankValid(body: number, elbow: number) {
  return body >= 145 && elbow >= 50 && elbow <= 140;
}

export function jumpingJackZones(wristsAboveShoulders: boolean, wristsBelowHips: boolean, ankleWidth: number, shoulderWidth: number) {
  return { top: wristsBelowHips && ankleWidth < shoulderWidth * 1.15, bottom: wristsAboveShoulders && ankleWidth > shoulderWidth * 1.3 };
}

export function highKneeZones(kneeY: number, hipY: number, ankleY: number) {
  const legHeight = Math.max(0.12, Math.abs(ankleY - hipY));
  const kneeHeight = (kneeY - hipY) / legHeight;
  const shinHeight = (ankleY - kneeY) / legHeight;
  return { top: kneeHeight >= 0.42 && shinHeight >= 0.2, bottom: kneeHeight <= 0.22 };
}

export type HighKneeSide = "left" | "right";
export type HighKneeState = { phase: "find" | "ready" | "raised"; activeLeg: HighKneeSide | null; lastLeg: HighKneeSide | null; lastValidAt: number | null };
export const initialHighKneeState: HighKneeState = { phase: "find", activeLeg: null, lastLeg: null, lastValidAt: null };

export function pauseHighKnees(state: HighKneeState, now: number): HighKneeState {
  return state.lastValidAt !== null && now - state.lastValidAt <= 650
    ? state
    : { ...initialHighKneeState, lastLeg: state.lastLeg };
}

export function advanceHighKnees(state: HighKneeState, left: { top: boolean; bottom: boolean }, right: { top: boolean; bottom: boolean }, now: number): HighKneeState & { counted: boolean } {
  if (state.phase === "find") return { ...state, phase: left.top && right.top ? "ready" : "find", lastValidAt: now, counted: false };
  if (state.phase === "ready") {
    const leg = left.bottom && right.top && state.lastLeg !== "left" ? "left" : right.bottom && left.top && state.lastLeg !== "right" ? "right" : null;
    return { ...state, phase: leg ? "raised" : "ready", activeLeg: leg, lastValidAt: now, counted: false };
  }
  const grounded = state.activeLeg === "left" ? left.top : right.top;
  if (!grounded) return { ...state, lastValidAt: now, counted: false };
  const nextLeg = state.activeLeg === "left" ? "right" : "left";
  const nextRaised = nextLeg === "left" ? left.bottom : right.bottom;
  return { phase: nextRaised ? "raised" : "ready", activeLeg: nextRaised ? nextLeg : null, lastLeg: state.activeLeg, lastValidAt: now, counted: true };
}

export type HoldState = { stable: number; heldMs: number; lastValidAt: number | null; lastGoodAt?: number | null };

export function advanceHold(state: HoldState, valid: boolean, now: number): HoldState & { seconds: number } {
  if (!valid) return { ...state, lastValidAt: null, seconds: 0 };
  const recent = state.lastGoodAt !== null && state.lastGoodAt !== undefined && now - state.lastGoodAt <= 350;
  const stable = recent ? Math.min(2, state.stable + 1) : 1;
  if (stable < 2) return { stable, heldMs: state.heldMs, lastValidAt: now, lastGoodAt: now, seconds: 0 };
  const heldMs = state.heldMs + (state.lastValidAt === null ? 0 : Math.max(0, Math.min(200, now - state.lastValidAt)));
  const seconds = Math.floor(heldMs / 1000);
  return { stable, heldMs: heldMs % 1000, lastValidAt: now, lastGoodAt: now, seconds };
}
