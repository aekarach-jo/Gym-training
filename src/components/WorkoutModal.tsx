"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, ChevronLeft, Minus, Pause, Play, Plus, Sparkles, X } from "lucide-react";
import { CameraCoach } from "@/components/CameraCoach";
import { ExerciseArt } from "@/components/ExerciseArt";
import type { Exercise } from "@/lib/exercises";
import type { SetEntry } from "@/lib/storage";

type Side = "left" | "right";
type WorkoutStage = "training" | "rest" | "complete";

type Props = {
  exercise: Exercise;
  note?: string;
  entries: SetEntry[];
  onClose: () => void;
  onSave: (value: number, source: SetEntry["source"], side?: SetEntry["side"]) => void;
};

function RestCountdown({ remaining, total, nextSet, onSkip }: { remaining: number; total: number; nextSet: string; onSkip: () => void }) {
  const progress = Math.max(0, Math.min(100, (remaining / total) * 100));
  return <div className="rest-stage">
    <span className="rest-stage__eyebrow">บันทึกเซตแล้ว · {nextSet}</span>
    <div className="rest-stage__ring" role="timer" aria-label={`เหลือเวลาพัก ${Math.ceil(remaining)} วินาที`} style={{ background: `conic-gradient(#a9e86b ${progress}%, #dce8d7 ${progress}% 100%)` }}>
      <div><strong>{Math.ceil(remaining)}</strong><small>วินาที</small></div>
    </div>
    <h3>พักก่อนเริ่มเซตถัดไป</h3>
    <p>หายใจให้สบาย ระบบจะเริ่มนับเซตใหม่เมื่อครบเวลา</p>
    <button type="button" className="rest-stage__skip" onClick={onSkip}>พร้อมแล้ว · ข้ามเวลาพัก</button>
  </div>;
}

export function WorkoutModal({ exercise, note, entries, onClose, onSave }: Props) {
  const [value, setValue] = useState(0);
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [side, setSide] = useState<Side>(() => entries.filter((entry) => entry.side === "left").length > entries.filter((entry) => entry.side === "right").length ? "right" : "left");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<WorkoutStage>("training");
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restNow, setRestNow] = useState(0);
  const stageRef = useRef<WorkoutStage>("training");
  const cameraCount = useRef(0);
  const timed = exercise.unit === "วินาที";
  const sideEntries = exercise.bilateral ? entries.filter((entry) => entry.side === side) : entries;
  const restRemaining = restUntil === null ? 0 : Math.max(0, (restUntil - restNow) / 1000);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setValue((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (restUntil === null) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setRestNow(now);
      if (now >= restUntil) {
        stageRef.current = "training";
        setStage("training");
        setRestUntil(null);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [restUntil]);

  const completeSet = (setValueToSave: number, source: SetEntry["source"]) => {
    if (setValueToSave <= 0 || stageRef.current !== "training") return;
    const nextSide: Side = side === "left" ? "right" : "left";
    const hasNext = entries.length + 1 < exercise.sets;

    stageRef.current = hasNext && exercise.rest > 0 ? "rest" : hasNext ? "training" : "complete";
    onSave(setValueToSave, source, exercise.bilateral ? side : undefined);
    setValue(0);
    cameraCount.current = 0;
    setRunning(false);
    if (hasNext) {
      if (exercise.bilateral) setSide(nextSide);
      if (exercise.rest > 0) {
        const now = Date.now();
        setRestNow(now);
        setRestUntil(now + exercise.rest * 1000);
        setStage("rest");
      }
    } else {
      setStage("complete");
    }
  };

  const onCameraCount = () => {
    if (stageRef.current !== "training") return;
    const next = Math.min(exercise.target, cameraCount.current + 1);
    if (next === cameraCount.current) return;
    cameraCount.current = next;
    setValue(next);
    if (next === exercise.target) completeSet(next, "camera");
  };

  const skipRest = () => {
    stageRef.current = "training";
    setRestUntil(null);
    setStage("training");
  };

  const repeatSet = () => {
    cameraCount.current = 0;
    setValue(0);
    stageRef.current = "training";
    setStage("training");
  };

  const nextSetLabel = exercise.bilateral ? `ต่อไปข้าง${side === "left" ? "ซ้าย" : "ขวา"}` : `ต่อไปเซตที่ ${Math.min(entries.length + 1, exercise.sets)}`;

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal-card workout-modal" role="dialog" aria-modal="true" aria-label={`ฝึกท่า${exercise.name}`} onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-top">
        <button className="back-button" onClick={onClose}><ChevronLeft size={20} /> กลับ</button>
        <span className="modal-set">เซตที่ {Math.min(entries.length + 1, exercise.sets)} / {exercise.sets}</span>
        <button className="close-button" aria-label="ปิด" onClick={onClose}><X size={21} /></button>
      </div>
      <div className="workout-modal-body">
        <div className="workout-main">
          <span className="section-kicker">NOW TRAINING · {exercise.category.toUpperCase()}</span>
          <h2>{exercise.name}</h2>
          <p>{exercise.cue}</p>
          <div className="workout-illustration"><ExerciseArt exercise={exercise} size="large" /></div>
          <div className="form-tip"><Sparkles size={18} /> {exercise.steps[1]}</div>
          {note && <div className="workout-note"><strong>โน้ตของฉัน</strong><span>{note}</span></div>}
        </div>
        <div className="workout-controls">
          <div className="control-head"><span>เป้าหมายเซตนี้</span><strong>{exercise.target} {exercise.unit}{exercise.bilateral ? " / ข้าง" : ""}</strong></div>
          {stage === "complete" ? <div className="set-complete">
            <div className="set-complete__icon"><CheckCircle2 size={34} /></div>
            <span>ทำได้แล้ว</span>
            <h3>ครบเซตของท่านี้</h3>
            <p>ผลการฝึกบันทึกไว้ในประวัติแล้ว</p>
            <button className="button button--lime button--full" onClick={onClose}>เสร็จแล้ว <Check size={17} /></button>
            <button className="set-complete__again" onClick={repeatSet}>ทำเพิ่มอีกเซต</button>
          </div> : <>
            {stage === "training" && exercise.bilateral && <div className="side-switch" role="group" aria-label="เลือกข้างที่ฝึก">
              {(["left", "right"] as const).map((option) => <button key={option} className={side === option ? "active" : ""} onClick={() => { setSide(option); setValue(0); cameraCount.current = 0; setRunning(false); }}>
                {option === "left" ? "ข้างซ้าย" : "ข้างขวา"} <small>{entries.filter((entry) => entry.side === option).length} เซต</small>
              </button>)}
            </div>}
            {stage === "training" && <div className="mode-tabs">
              <button className={mode === "manual" ? "active" : ""} onClick={() => { setRunning(false); setMode("manual"); }}>บันทึกเอง</button>
              <button className={mode === "camera" ? "active" : ""} onClick={() => { setRunning(false); cameraCount.current = value; setMode("camera"); }}><Camera size={16} /> {timed ? "ใช้กล้องจับเวลา" : "ใช้กล้องนับ"}</button>
            </div>}
            {mode === "camera" ? <div className={`camera-session${stage === "rest" ? " camera-session--resting" : ""}`}>
              <CameraCoach exercise={exercise} selectedSide={side} count={value} onCount={onCameraCount} paused={stage === "rest"} />
              {stage === "rest" && <div className="camera-rest-overlay"><RestCountdown remaining={restRemaining} total={exercise.rest} nextSet={nextSetLabel} onSkip={skipRest} /></div>}
            </div> : stage === "rest" ? <RestCountdown remaining={restRemaining} total={exercise.rest} nextSet={nextSetLabel} onSkip={skipRest} /> : <div className="reps-control">
              <span>{timed ? "เวลาที่ทำได้" : "จำนวนที่ทำได้"}</span>
              <div>
                <button aria-label="ลดจำนวน" onClick={() => setValue((current) => Math.max(0, current - 1))}><Minus size={25} /></button>
                <strong>{value}<small>{exercise.unit}</small></strong>
                <button aria-label="เพิ่มจำนวน" onClick={() => setValue((current) => current + 1)}><Plus size={25} /></button>
              </div>
              {timed && <button className="timer-button" onClick={() => setRunning((current) => !current)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "หยุดเวลา" : "เริ่มจับเวลา"}</button>}
            </div>}
            {stage === "training" && <button className="button button--lime button--full save-set" onClick={() => completeSet(value, mode === "camera" ? "camera" : timed ? "timer" : "manual")} disabled={value <= 0}>บันทึกเซตนี้ <Check size={18} /></button>}
            <div className="set-history"><span>วันนี้บันทึกแล้ว {sideEntries.length} เซต{exercise.bilateral ? ` · ${side === "left" ? "ข้างซ้าย" : "ข้างขวา"}` : ""}</span>{sideEntries.length > 0 && <div>{sideEntries.map((entry) => <strong key={entry.id}>{entry.value} {exercise.unit}</strong>)}</div>}</div>
          </>}
        </div>
      </div>
    </div>
  </div>;
}
