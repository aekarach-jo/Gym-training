"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react";
import { ExerciseArt } from "@/components/ExerciseArt";
import { byId, exercises, type ExerciseId } from "@/lib/exercises";
import { weekdays, type CustomPlan, type PlanExercise } from "@/lib/plans";
import { validCustomPlan, type SetEntry } from "@/lib/storage";

const starterItems = (): PlanExercise[] => ["squat", "knee-push-up", "glute-bridge", "plank"].map((id) => {
  const exercise = byId(id as ExerciseId);
  return { exerciseId: exercise.id, sets: exercise.sets, target: exercise.target, rest: exercise.rest };
});

export function PlanBuilder({ initial, history = [], onSave, onCancel }: { initial: CustomPlan | null; history?: SetEntry[]; onSave: (plan: CustomPlan) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "แผนฝึกของฉัน");
  const [days, setDays] = useState<number[]>(initial?.trainingDays ?? [1, 3, 5]);
  const [items, setItems] = useState<PlanExercise[]>(initial?.items ?? starterItems());
  const [addId, setAddId] = useState<ExerciseId | "">("");
  const [error, setError] = useState("");
  const available = exercises.filter((exercise) => !items.some((item) => item.exerciseId === exercise.id));

  const updateItem = (id: ExerciseId, field: "sets" | "target" | "rest" | "note", value: number | string) => {
    setItems((current) => current.map((item) => item.exerciseId === id ? { ...item, [field]: value } : item));
  };
  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const save = () => {
    const plan = { id: initial?.id ?? `custom-${crypto.randomUUID()}`, name: name.trim(), trainingDays: [...days].sort(), items };
    if (!validCustomPlan(plan)) { setError("กรุณาตั้งชื่อ เลือกวันและท่าฝึก แล้วตรวจจำนวนเซต (ท่าสลับข้างต้องเป็นเลขคู่) เป้าหมาย และเวลาพักให้อยู่ในช่วงที่กำหนด"); return; }
    onSave(plan);
  };

  return <section className="plan-builder" aria-label="สร้างแผนฝึกส่วนตัว">
    <div className="plan-builder__head"><div><span className="section-kicker">BUILD YOUR ROUTINE</span><h2>{initial ? "แก้ไขแผนของฉัน" : "สร้างแผนของฉัน"}</h2><p>จัดท่าที่ชอบให้เข้ากับเวลาและเป้าหมายของคุณ</p></div><button type="button" className="plan-builder__close" onClick={onCancel} aria-label="ปิดตัวสร้างแผน"><X size={21} /></button></div>
    <div className="plan-builder__layout">
      <div className="plan-builder__main">
        <label className="plan-builder__label">ชื่อแผน<input maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น ฝึกหลังเลิกงาน" /></label>
        <div className="plan-builder__label">วันฝึกในสัปดาห์<div className="plan-builder__days" role="group" aria-label="เลือกวันฝึก">{weekdays.map((day, index) => <button key={day} type="button" className={days.includes(index) ? "selected" : ""} aria-pressed={days.includes(index)} onClick={() => setDays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}>{day}</button>)}</div></div>
        <div className="plan-builder__list-head"><div><span className="section-kicker">EXERCISES</span><h3>ท่าในแผน <small>{items.length} ท่า</small></h3></div></div>
        <div className="plan-builder__items">{items.map((item, index) => { const exercise = byId(item.exerciseId); const last = history.filter((entry) => entry.exerciseId === item.exerciseId).sort((a, b) => b.at.localeCompare(a.at))[0]; return <div className="plan-builder__item" key={item.exerciseId}>
          <div className="plan-builder__item-top"><span className="plan-builder__number">{String(index + 1).padStart(2, "0")}</span><span className="plan-builder__art"><ExerciseArt exercise={exercise} /></span><div><strong>{exercise.name}</strong><small>{exercise.muscles}{exercise.bilateral ? " · สลับซ้าย–ขวา" : ""}</small>{last && <small className="plan-builder__last">เซตล่าสุด {last.value} {exercise.unit}</small>}</div><div className="plan-builder__item-actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`เลื่อน${exercise.name}ขึ้น`}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`เลื่อน${exercise.name}ลง`}><ArrowDown size={16} /></button><button type="button" onClick={() => setItems((current) => current.filter((row) => row.exerciseId !== item.exerciseId))} aria-label={`ลบ${exercise.name}`}><Trash2 size={16} /></button></div></div>
          <div className="plan-builder__fields"><label>เซตทั้งหมด<input type="number" min={exercise.bilateral ? 2 : 1} max={12} step={exercise.bilateral ? 2 : 1} value={item.sets} onChange={(event) => updateItem(item.exerciseId, "sets", Number(event.target.value))} /></label><label>เป้าหมาย / เซต <small>{exercise.unit}</small><input type="number" min={1} max={300} value={item.target} onChange={(event) => updateItem(item.exerciseId, "target", Number(event.target.value))} /></label><label>พัก <small>วินาที</small><input type="number" min={0} max={600} step={5} value={item.rest} onChange={(event) => updateItem(item.exerciseId, "rest", Number(event.target.value))} /></label></div>
          <label className="plan-builder__note">โน้ตสำหรับท่านี้<input maxLength={180} value={item.note ?? ""} onChange={(event) => updateItem(item.exerciseId, "note", event.target.value)} placeholder="เช่น คุมจังหวะลงช้า ๆ" /></label>
        </div>; })}</div>
        {available.length > 0 && <div className="plan-builder__add"><select aria-label="เลือกท่าที่จะเพิ่ม" value={addId} onChange={(event) => setAddId(event.target.value as ExerciseId)}><option value="">เลือกท่าเพิ่มในแผน</option>{available.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name} · {exercise.category}</option>)}</select><button type="button" onClick={() => { if (!addId) return; const exercise = byId(addId); setItems((current) => [...current, { exerciseId: addId, sets: exercise.sets, target: exercise.target, rest: exercise.rest }]); setAddId(""); }} disabled={!addId}><Plus size={18} /> เพิ่มท่า</button></div>}
      </div>
      <aside className="plan-builder__aside"><span className="section-kicker">YOUR WEEK</span><h3>ฝึกให้สม่ำเสมอ</h3><p>วันที่เลือกจะปรากฏในแผนฝึกของคุณ วันอื่นแสดงเป็นวันพัก แต่ยังเปิดฝึกเพิ่มเติมได้เสมอ</p><div className="plan-builder__summary"><span>วันฝึก</span><strong>{days.length} วัน / สัปดาห์</strong><span>ท่าฝึก</span><strong>{items.length} ท่า</strong><span>เซตรวม</span><strong>{items.reduce((sum, item) => sum + (Number(item.sets) || 0), 0)} เซต</strong></div><button type="button" className="button button--lime button--full" onClick={save}><Check size={18} /> บันทึกและใช้แผนนี้</button>{error && <p className="plan-builder__error" role="alert">{error}</p>}</aside>
    </div>
  </section>;
}
