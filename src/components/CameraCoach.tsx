"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine, Volume2 } from "lucide-react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Exercise } from "@/lib/exercises";
import { playCountSound } from "@/lib/countSound";
import { advanceCameraRepetition, advanceHighKnees, advanceHold, advancePushUp, bridgeZones, highKneeZones, initialCameraRepState, initialHighKneeState, initialPushUpState, jumpingJackZones, kneePushUpZones, lungeZones, pauseCameraRepetition, pauseHighKnees, plankValid, pushUpZones, relativeBridgeLift, sidePlankValid, squatZones, type CameraRepState, type HighKneeState, type HoldState, type PushUpState } from "@/lib/motionRules";
import { createPoseModel } from "@/lib/poseModel";

type Point = { x: number; y: number; visibility?: number };

function angle(a: Point, b: Point, c: Point) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const length = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return length ? (Math.acos(Math.max(-1, Math.min(1, dot / length))) * 180) / Math.PI : 0;
}

export function CameraCoach({ exercise, count, onCount, selectedSide = "left", paused = false }: { exercise: Exercise; count: number; onCount: () => void; selectedSide?: "left" | "right"; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const model = useRef<PoseLandmarker | null>(null);
  const frame = useRef<number>(0);
  const lastFrame = useRef(0);
  const repState = useRef<CameraRepState>(initialCameraRepState);
  const pushUpState = useRef<PushUpState>(initialPushUpState);
  const highKneeState = useRef<HighKneeState>(initialHighKneeState);
  const holdState = useRef<HoldState>({ stable: 0, heldMs: 0, lastValidAt: null, lastGoodAt: null });
  const trackedSide = useRef<0 | 1 | null>(null);
  const selectedSideRef = useRef(selectedSide);
  const live = useRef(false);
  const pausedRef = useRef(paused);
  const requestToken = useRef(0);
  const callback = useRef(onCount);
  const soundEnabledRef = useRef(true);
  const [status, setStatus] = useState<"idle" | "loading" | "waiting" | "active" | "error">("idle");
  const [feedback, setFeedback] = useState(`วางกล้อง${exercise.cameraAngle} ให้เห็นทั้งตัว`);
  const [error, setError] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState("");
  const [detectedPoints, setDetectedPoints] = useState(-1);
  const [motionSignal, setMotionSignal] = useState<string | null>(null);

  useEffect(() => { callback.current = onCount; }, [onCount]);

  const beep = (preview = false) => {
    if (!soundEnabledRef.current) return;
    if (preview) setSoundFeedback("กำลังลองเสียง...");
    try {
      void playCountSound().then(() => {
        if (preview) setSoundFeedback("เบราว์เซอร์เริ่มเล่นไฟล์เสียงแล้ว");
      }).catch(() => {
        setSoundFeedback("เบราว์เซอร์เล่นเสียงไม่ได้ ลองกดปุ่มอีกครั้ง");
      });
    } catch {
      setSoundFeedback("เปิดเสียงไม่สำเร็จ ลองกดปุ่มอีกครั้ง");
    }
  };

  const emitCount = (amount = 1) => {
    if (amount <= 0) return;
    for (let index = 0; index < amount; index++) callback.current();
    beep();
  };
  useEffect(() => {
    pausedRef.current = paused;
    selectedSideRef.current = selectedSide;
    repState.current = initialCameraRepState;
    pushUpState.current = initialPushUpState;
    highKneeState.current = initialHighKneeState;
    holdState.current = { stable: 0, heldMs: 0, lastValidAt: null, lastGoodAt: null };
    trackedSide.current = null;
    lastFrame.current = 0;
    const surface = canvas.current;
    surface?.getContext("2d")?.clearRect(0, 0, surface.width, surface.height);
  }, [paused, selectedSide]);

  const stop = useCallback(() => {
    requestToken.current += 1;
    live.current = false;
    window.cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    model.current = null;
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
    repState.current = initialCameraRepState;
    pushUpState.current = initialPushUpState;
    highKneeState.current = initialHighKneeState;
    holdState.current = { stable: 0, heldMs: 0, lastValidAt: null, lastGoodAt: null };
    trackedSide.current = null;
    setDetectedPoints(-1);
    setMotionSignal(null);
    setStatus("idle");
    setFeedback(`วางกล้อง${exercise.cameraAngle} ให้เห็นทั้งตัว`);
  }, [exercise.cameraAngle]);

  useEffect(() => () => {
    requestToken.current += 1;
    live.current = false;
    window.cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    model.current = null;
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
  }, []);

  const draw = (points: Point[]) => {
    const surface = canvas.current;
    const player = video.current;
    if (!surface || !player) return;
    surface.width = player.videoWidth;
    surface.height = player.videoHeight;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, surface.width, surface.height);
    const scale = surface.width / Math.max(1, player.clientWidth);
    ctx.lineCap = "round";
    const visible = (point: Point | undefined): point is Point => Boolean(point && (point.visibility ?? 1) >= 0.35);
    const line = (a: Point, b: Point) => {
      ctx.beginPath();
      ctx.moveTo(a.x * surface.width, a.y * surface.height);
      ctx.lineTo(b.x * surface.width, b.y * surface.height);
      ctx.strokeStyle = "#163925";
      ctx.lineWidth = 7 * scale;
      ctx.stroke();
      ctx.strokeStyle = "#b4ff71";
      ctx.lineWidth = 4 * scale;
      ctx.stroke();
    };
    for (const ids of [[11, 13, 15, 23, 25, 27], [12, 14, 16, 24, 26, 28]]) {
      for (const [from, to] of [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5]]) {
        const a = points[ids[from]]; const b = points[ids[to]];
        if (!visible(a) || !visible(b)) continue;
        line(a, b);
      }
      ids.forEach((id) => { const point = points[id]; if (!visible(point)) return; ctx.beginPath(); ctx.arc(point.x * surface.width, point.y * surface.height, 5 * scale, 0, Math.PI * 2); ctx.fillStyle = "#163925"; ctx.fill(); ctx.beginPath(); ctx.arc(point.x * surface.width, point.y * surface.height, 3.5 * scale, 0, Math.PI * 2); ctx.fillStyle = "#c7ff8b"; ctx.fill(); });
    }
    for (const [from, to] of [[11, 12], [23, 24]]) {
      const a = points[from]; const b = points[to];
      if (!visible(a) || !visible(b)) continue;
      line(a, b);
    }
  };

  const pauseTracking = (message: string, now: number, missingPoints = true) => {
    repState.current = pauseCameraRepetition(repState.current, now);
    highKneeState.current = pauseHighKnees(highKneeState.current, now);
    holdState.current = advanceHold(holdState.current, false, now);
    if (exercise.id === "push-up" || exercise.id === "knee-push-up") {
      pushUpState.current = advancePushUp(pushUpState.current, null, false, now);
    }
    if (missingPoints) setMotionSignal("จับข้อต่อไม่ชัด · ลองถอยกล้องหรือเพิ่มแสง");
    setFeedback(message);
  };

  const processRepetition = (top: boolean, bottom: boolean, now: number, messages: { start: string; down: string; up: string; next: string }) => {
    const previous = repState.current.phase;
    const next = advanceCameraRepetition(repState.current, top, bottom, now);
    repState.current = next;
    if (next.counted) emitCount();
    setFeedback(next.counted ? messages.next : previous === "find" && next.phase === "find" ? messages.start : next.phase === "bottom" ? messages.up : messages.down);
  };

  const processPose = (points: Point[], now: number) => {
    draw(points);
    if (exercise.id === "jumping-jack" || exercise.id === "high-knees") {
      const needed = exercise.id === "jumping-jack" ? [11, 12, 15, 16, 23, 24, 27, 28] : [23, 24, 25, 26, 27, 28];
      if (needed.some((id) => !points[id] || (points[id].visibility ?? 0) < 0.4)) { pauseTracking("ให้กล้องเห็นแขน ขา และเท้าทั้งสองข้าง", now); return; }
      if (exercise.id === "jumping-jack") {
        const shoulderWidth = Math.abs(points[11].x - points[12].x);
        const ankleWidth = Math.abs(points[27].x - points[28].x);
        const zones = jumpingJackZones(points[15].y < points[11].y - 0.02 && points[16].y < points[12].y - 0.02, points[15].y > points[23].y - 0.06 && points[16].y > points[24].y - 0.06, ankleWidth, shoulderWidth);
        setMotionSignal(`ระยะเท้า ${Math.round((ankleWidth / Math.max(shoulderWidth, 0.01)) * 10) / 10} เท่าของไหล่`);
        processRepetition(zones.top, zones.bottom, now, { start: "ยืนเท้าชิด แขนลงข้างตัว", down: "กางเท้าและยกแขนให้สูงขึ้น", up: "หุบเท้าพร้อมลดแขนลง", next: "นับแล้ว! เริ่มครั้งถัดไป" });
      } else {
        const left = highKneeZones(points[25].y, points[23].y, points[27].y);
        const right = highKneeZones(points[26].y, points[24].y, points[28].y);
        const next = advanceHighKnees(highKneeState.current, left, right, now);
        highKneeState.current = next;
        if (next.counted) emitCount();
        setMotionSignal(`ขาซ้าย ${left.bottom ? "ยกสูง" : left.top ? "ลงพื้น" : "กำลังเคลื่อน"} · ขาขวา ${right.bottom ? "ยกสูง" : right.top ? "ลงพื้น" : "กำลังเคลื่อน"}`);
        setFeedback(next.counted ? "นับแล้ว! สลับยกเข่าอีกข้าง" : next.phase === "find" ? "วางเท้าทั้งสองข้างก่อนเริ่ม" : next.phase === "raised" ? "วางเท้าข้างที่ยกกลับพื้น" : "ยกเข่าสลับข้างใกล้ระดับสะโพก");
      }
      return;
    }
    const requiredOffsets = exercise.id === "squat" || exercise.id === "forward-lunge" ? [0, 3, 4, 5] : exercise.id === "glute-bridge" || exercise.id === "knee-push-up" ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
    const leftIds = [11, 13, 15, 23, 25, 27];
    const rightIds = [12, 14, 16, 24, 26, 28];
    const minimumVisibility = 0.4;
    const left = requiredOffsets.reduce((sum, index) => sum + (points[leftIds[index]]?.visibility ?? 0), 0);
    const right = requiredOffsets.reduce((sum, index) => sum + (points[rightIds[index]]?.visibility ?? 0), 0);
    const leftReady = requiredOffsets.every((index) => (points[leftIds[index]]?.visibility ?? 0) >= minimumVisibility);
    const rightReady = requiredOffsets.every((index) => (points[rightIds[index]]?.visibility ?? 0) >= minimumVisibility);
    const side = exercise.bilateral ? (selectedSideRef.current === "left" ? 0 : 1)
      : leftReady !== rightReady ? (leftReady ? 0 : 1)
        : trackedSide.current === null ? (left >= right ? 0 : 1)
        : left > right + 0.7 ? 0 : right > left + 0.7 ? 1 : trackedSide.current;
    trackedSide.current = side;
    const ids = side === 0 ? leftIds : rightIds;
    if (requiredOffsets.some((index) => !points[ids[index]] || (points[ids[index]].visibility ?? 0) < minimumVisibility)) {
      pauseTracking("ยังเห็นร่างกายไม่ครบ ลองถอยกล้องหรือเพิ่มแสง", now);
      return;
    }
    if (exercise.id === "plank" || exercise.id === "side-plank") {
      const body = angle(points[ids[0]], points[ids[3]], points[ids[5]]);
      const knee = angle(points[ids[3]], points[ids[4]], points[ids[5]]);
      const elbow = angle(points[ids[0]], points[ids[1]], points[ids[2]]);
      const valid = exercise.id === "plank" ? plankValid(body, knee, elbow) : sidePlankValid(body, elbow) && knee >= 145;
      setMotionSignal(`แนวลำตัว ${Math.round(body)}° · เข่า ${Math.round(knee)}°`);
      if (!valid) {
        pauseTracking("จัดศอกใต้ไหล่และรักษาแนวลำตัวให้ตรง เวลาจะหยุดไว้ก่อน", now, false);
        return;
      }
      const hold = advanceHold(holdState.current, true, now);
      holdState.current = hold;
      emitCount(hold.seconds);
      setFeedback(hold.stable < 2 ? "รักษาท่านี้ไว้" : "ท่าถูกต้อง กำลังจับเวลา");
      return;
    }

    if (exercise.id === "squat" || exercise.id === "forward-lunge") {
      const knee = angle(points[ids[3]], points[ids[4]], points[ids[5]]);
      const hip = angle(points[ids[0]], points[ids[3]], points[ids[4]]);
      const torsoTilt = Math.abs(points[ids[0]].x - points[ids[3]].x) / Math.max(0.01, Math.abs(points[ids[0]].y - points[ids[3]].y));
      const zones = exercise.id === "squat" ? squatZones(knee, hip) : lungeZones(knee, torsoTilt);
      setMotionSignal(`มุมเข่า ${Math.round(knee)}°${exercise.id === "squat" ? ` · สะโพก ${Math.round(hip)}°` : ""}`);
      if ("valid" in zones && !zones.valid) { pauseTracking("ตั้งลำตัวให้ตรงก่อนนับ", now, false); return; }
      processRepetition(zones.top, zones.bottom, now, {
        start: "เริ่มจากท่ายืนตรง ให้เห็นสะโพก เข่า และข้อเท้า",
        down: exercise.id === "squat" ? "ย่อตัวอีกนิดจนเข่างอชัดเจน" : "ก้าวและย่อเข่าให้ชัดเจน",
        up: "ดีมาก ลุกกลับขึ้นจนยืนตรง",
        next: "นับแล้ว! ย่อตัวสำหรับครั้งถัดไป",
      });
      return;
    }

    if (exercise.id === "glute-bridge") {
      const shoulderHipKnee = angle(points[ids[0]], points[ids[3]], points[ids[4]]);
      const hipLift = relativeBridgeLift(points[ids[0]], points[ids[3]], points[ids[4]]);
      const zones = bridgeZones(shoulderHipKnee, hipLift);
      setMotionSignal(`แนวสะโพก ${Math.round(shoulderHipKnee)}° · ระดับยก ${Math.round(hipLift * 100)}% ของลำตัว`);
      processRepetition(zones.bottom, zones.top, now, { start: "เริ่มจากสะโพกใกล้พื้น", down: "กดส้นเท้าและยกสะโพกขึ้น", up: "ลดสะโพกลงอย่างช้า ๆ", next: "นับแล้ว! ยกสะโพกอีกครั้ง" });
      return;
    }

    const elbow = angle(points[ids[0]], points[ids[1]], points[ids[2]]);
    const body = angle(points[ids[0]], points[ids[3]], points[exercise.id === "knee-push-up" ? ids[4] : ids[5]]);
    const zones = exercise.id === "knee-push-up" ? kneePushUpZones(elbow, body) : pushUpZones(elbow, body);
    const next = advancePushUp(pushUpState.current, elbow, zones.valid, now);
    pushUpState.current = next;
    setMotionSignal(`มุมศอก ${Math.round(elbow)}° · ${next.phase === "find" ? "เหยียดแขนเพื่อเริ่ม" : next.phase === "top" ? "รอจังหวะลง" : "รอดันกลับขึ้น"}`);
    if (!zones.valid) { setFeedback("รักษาแนวไหล่ถึงสะโพกให้ตรงก่อนนับ"); return; }
    if (next.counted) emitCount();
    setFeedback(next.counted ? "นับแล้ว! ลงสำหรับครั้งถัดไป" : next.phase === "find" ? "เหยียดแขนเพื่อเริ่มนับ" : next.phase === "bottom" ? "ดีมาก ดันกลับขึ้นให้สุด" : "งอศอกลงให้ลึก แล้วดันกลับขึ้น");
  };

  const loop = (now: number) => {
    if (!live.current) return;
    if (pausedRef.current) { frame.current = window.requestAnimationFrame(loop); return; }
    const player = video.current;
    if (player && model.current && player.readyState >= 2 && now - lastFrame.current >= 90) {
      lastFrame.current = now;
      try {
        const result = model.current.detectForVideo(player, now);
        if (result.landmarks[0]) {
          const points = result.landmarks[0];
          setDetectedPoints([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].filter((id) => points[id] && (points[id].visibility ?? 1) >= 0.35).length);
          processPose(points, now);
        }
        else {
          setDetectedPoints(0);
          pauseTracking("ไม่พบตัวคนในภาพ ลองถอยกล้อง", now);
          canvas.current?.getContext("2d")?.clearRect(0, 0, canvas.current.width, canvas.current.height);
        }
      } catch { setDetectedPoints(0); pauseTracking("กำลังปรับการตรวจจับ ลองขยับกล้องเล็กน้อย", now); }
    }
    frame.current = window.requestAnimationFrame(loop);
  };

  const start = async () => {
    // Safari grants playback per audio element after a direct user gesture.
    // This short ready beep unlocks the same element used for later counts.
    beep();
    const token = ++requestToken.current;
    setStatus("loading");
    setDetectedPoints(-1);
    repState.current = initialCameraRepState;
    pushUpState.current = initialPushUpState;
    highKneeState.current = initialHighKneeState;
    holdState.current = { stable: 0, heldMs: 0, lastValidAt: null, lastGoodAt: null };
    trackedSide.current = null;
    setMotionSignal(null);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("เบราว์เซอร์นี้เปิดกล้องไม่ได้ กรุณาใช้ HTTPS หรือ localhost");
      const nextModel = await createPoseModel();
      if (token !== requestToken.current) return;
      model.current = nextModel;
      setStatus("waiting");
      setFeedback("กรุณาอนุญาตให้เว็บไซต์ใช้กล้องในเบราว์เซอร์");
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      if (token !== requestToken.current) { nextStream.getTracks().forEach((track) => track.stop()); return; }
      stream.current = nextStream;
      if (!video.current) throw new Error("ไม่สามารถแสดงภาพจากกล้องได้");
      video.current.srcObject = stream.current;
      await video.current.play();
      if (token !== requestToken.current) return;
      live.current = true;
      setStatus("active");
      setFeedback(`วางกล้อง${exercise.cameraAngle} ให้เห็นตั้งแต่ศีรษะถึงเท้า`);
      frame.current = window.requestAnimationFrame(loop);
    } catch (reason) {
      if (token !== requestToken.current) return;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      model.current = null;
      if (video.current) { video.current.pause(); video.current.srcObject = null; }
      setStatus("error");
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "ยังไม่ได้รับสิทธิ์กล้อง กรุณาอนุญาตในเบราว์เซอร์แล้วลองใหม่"
        : reason instanceof DOMException && reason.name === "NotFoundError"
          ? "ไม่พบกล้องที่ใช้งานได้บนอุปกรณ์นี้"
          : "เปิดกล้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <section className="camera-coach" aria-label={`กล้องตรวจท่า${exercise.name}`}>
      <div className="camera-head"><span><ScanLine size={18} /> โค้ชกล้อง · {exercise.name}</span><strong>{count}/{exercise.target} {exercise.unit}</strong></div>
      <div className="camera-visual-toggle">
        <span>แสดง Skeleton แบบเรียลไทม์</span>
        <button type="button" role="switch" aria-label="แสดง Skeleton แบบเรียลไทม์" aria-checked={showSkeleton} className={`camera-visual-switch${showSkeleton ? " is-on" : ""}`} onClick={() => setShowSkeleton((current) => !current)}>
          <span className="camera-visual-switch__track"><span /></span>
          <span>{showSkeleton ? "เปิด" : "ปิด"}</span>
        </button>
      </div>
      <div className="camera-visual-toggle">
        <span><Volume2 size={15} /> เสียงเมื่อกล้องนับสำเร็จ</span>
        <div className="camera-sound-controls">
          <button type="button" className="camera-sound-test" onClick={() => beep(true)} disabled={!soundEnabled}>ลองเสียง</button>
          <button type="button" role="switch" aria-label="เสียงเมื่อกล้องนับสำเร็จ" aria-checked={soundEnabled} className={`camera-visual-switch${soundEnabled ? " is-on" : ""}`} onClick={() => {
            const enabled = !soundEnabledRef.current;
            soundEnabledRef.current = enabled;
            setSoundEnabled(enabled);
            setSoundFeedback("");
          }}>
            <span className="camera-visual-switch__track"><span /></span>
            <span>{soundEnabled ? "เปิด" : "ปิด"}</span>
          </button>
        </div>
      </div>
      {soundFeedback && <p className="camera-sound-feedback" role="status">{soundFeedback}</p>}
      <div className="camera-screen">
        <video ref={video} playsInline muted aria-label="ภาพสดจากกล้อง" />
        <canvas ref={canvas} className={showSkeleton ? "" : "camera-skeleton--hidden"} aria-hidden="true" />
        {status === "active" && <span className={`camera-tracking-status${detectedPoints >= 6 ? " is-found" : ""}`}>{detectedPoints < 0 ? "กำลังหาจุดร่างกาย" : detectedPoints === 0 ? "ไม่พบจุดร่างกาย · ลองถอยกล้อง" : `เห็นจุดร่างกาย ${detectedPoints}/12`}</span>}
        {status !== "active" && <div className="camera-placeholder"><Camera size={34} /><span>วางกล้อง{exercise.cameraAngle}ให้เห็นทั้งตัว</span></div>}
      </div>
      <p className="camera-feedback" aria-live="polite">{status === "error" ? error : feedback}</p>
      {status === "active" && motionSignal && <p className="camera-angle-readout">{motionSignal}</p>}
      <div className="camera-actions">
        {status === "active" || status === "loading" || status === "waiting" ? <button className="button button--dark" onClick={stop}><CameraOff size={17} /> {status === "active" ? "ปิดกล้อง" : "ยกเลิก"}</button>
          : <button className="button button--lime" onClick={start}><Camera size={17} /> {exercise.unit === "วินาที" ? "เปิดกล้องจับเวลา" : "เปิดกล้องนับครั้ง"}</button>}
      </div>
      <small>ตั้งกล้อง{exercise.cameraAngle}ให้เห็นทั้งตัว · {exercise.unit === "วินาที" ? "จับเวลาเฉพาะช่วงที่ท่าอยู่ในเกณฑ์" : exercise.id === "glute-bridge" ? "นับเมื่อลดสะโพก → ยกสูง → ลดกลับ" : exercise.id === "jumping-jack" ? "นับเมื่อหุบ → กางเต็ม → หุบ" : exercise.id === "high-knees" ? "ยกเข่า → วางเท้ากลับ และสลับข้าง" : "นับเมื่อเริ่มต้น → ทำเต็มช่วง → กลับท่าเริ่มต้น"} การตรวจจับอาจคลาดเคลื่อนตามมุมกล้อง</small>
    </section>
  );
}
