export type RepPhase = "find" | "top" | "bottom";
export type RepState = { phase: RepPhase; stable: number };

export function advanceRepetition(state: RepState, top: boolean, bottom: boolean): RepState & { counted: boolean } {
  if (state.phase === "find") {
    const stable = top ? state.stable + 1 : 0;
    return { phase: stable >= 2 ? "top" : "find", stable: stable >= 2 ? 0 : stable, counted: false };
  }
  if (state.phase === "top") {
    const stable = bottom ? state.stable + 1 : 0;
    return { phase: stable >= 2 ? "bottom" : "top", stable: stable >= 2 ? 0 : stable, counted: false };
  }
  const stable = top ? state.stable + 1 : 0;
  if (stable >= 2) return { phase: "top", stable: 0, counted: true };
  return { phase: "bottom", stable, counted: false };
}

export function pushUpZones(elbow: number, body: number) {
  return { valid: body >= 145, top: elbow >= 155, bottom: elbow <= 105 };
}

export function squatZones(knee: number, hip: number) {
  return { top: knee >= 160 && hip >= 150, bottom: knee <= 115 && hip <= 135 };
}

export function plankValid(body: number, knee: number, elbow: number) {
  return body >= 155 && knee >= 150 && elbow >= 55 && elbow <= 125;
}

export function kneePushUpZones(elbow: number, shoulderHipKnee: number) {
  return { valid: shoulderHipKnee >= 145, top: elbow >= 155, bottom: elbow <= 105 };
}

export function lungeZones(knee: number, torsoTilt: number) {
  return { valid: torsoTilt <= 0.75, top: knee >= 155, bottom: knee <= 115 };
}

export function bridgeZones(shoulderHipKnee: number, hipLift: number) {
  return { top: shoulderHipKnee >= 150 && hipLift >= 0.045, bottom: shoulderHipKnee <= 138 && hipLift <= 0.055 };
}

export function sidePlankValid(body: number, elbow: number) {
  return body >= 150 && elbow >= 50 && elbow <= 135;
}

export function jumpingJackZones(wristsAboveShoulders: boolean, wristsBelowHips: boolean, ankleWidth: number, shoulderWidth: number) {
  return { top: wristsBelowHips && ankleWidth < shoulderWidth * 1.1, bottom: wristsAboveShoulders && ankleWidth > shoulderWidth * 1.5 };
}

export function highKneeZones(kneeY: number, hipY: number, ankleY: number) {
  return { top: kneeY > hipY + 0.12 && ankleY > kneeY + 0.10, bottom: kneeY <= hipY + 0.055 };
}

export type HoldState = { stable: number; heldMs: number; lastValidAt: number | null };

export function advanceHold(state: HoldState, valid: boolean, now: number): HoldState & { seconds: number } {
  if (!valid) return { stable: 0, heldMs: state.heldMs, lastValidAt: null, seconds: 0 };
  const stable = Math.min(3, state.stable + 1);
  if (stable < 2) return { stable, heldMs: state.heldMs, lastValidAt: now, seconds: 0 };
  const heldMs = state.heldMs + (state.lastValidAt === null ? 0 : Math.max(0, Math.min(200, now - state.lastValidAt)));
  const seconds = Math.floor(heldMs / 1000);
  return { stable, heldMs: heldMs % 1000, lastValidAt: now, seconds };
}
