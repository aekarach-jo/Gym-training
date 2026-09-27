"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Dumbbell, RotateCcw, X } from "lucide-react";
import { byId, exercises } from "@/lib/exercises";
import type { SetEntry } from "@/lib/storage";

export function HistoryLog({ entries, undoEntry, onDelete, onUndo, onStart }: { entries: SetEntry[]; undoEntry: SetEntry | null; onDelete: (entry: SetEntry) => void; onUndo: () => void; onStart: () => void }) {
  const [exercise, setExercise] = useState("all");
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState("all");
  const [visibleCount, setVisibleCount] = useState(50);
  const filtered = useMemo(() => entries.filter((entry) => {
    if (exercise !== "all" && entry.exerciseId !== exercise) return false;
    if (source !== "all" && entry.source !== source) return false;
    if (period !== "all") {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - Number(period) + 1);
      if (new Date(entry.at) < since) return false;
    }
    return true;
  }).sort((a, b) => b.at.localeCompare(a.at)), [entries, exercise, period, source]);

  return <section className="card-panel history-panel">
    <div className="section-heading"><div><span className="section-kicker">ACTIVITY LOG</span><h2>บันทึกล่าสุด</h2></div><span className="section-count">{filtered.length} รายการ</span></div>
    <div className="history-filters"><label>ท่า<select aria-label="กรองตามท่า" value={exercise} onChange={(event) => setExercise(event.target.value)}><option value="all">ทุกท่า</option>{exercises.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>ช่วงเวลา<select aria-label="กรองตามช่วงเวลา" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">ทั้งหมด</option><option value="7">7 วันล่าสุด</option><option value="30">30 วันล่าสุด</option></select></label><label>วิธีบันทึก<select aria-label="กรองตามวิธีบันทึก" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">ทุกวิธี</option><option value="camera">กล้อง</option><option value="manual">บันทึกเอง</option><option value="timer">จับเวลา</option></select></label></div>
    {undoEntry && <div className="history-undo" role="status"><span>ลบเซต {byId(undoEntry.exerciseId).name} แล้ว</span><button onClick={onUndo}><RotateCcw size={15} /> เลิกทำ</button></div>}
    {filtered.length ? <><div className="history-list">{filtered.slice(0, visibleCount).map((entry) => <div className="history-row" key={entry.id}><div className="history-icon"><Check size={18} /></div><div><strong>{byId(entry.exerciseId).name}</strong><small>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at))} · {entry.source === "camera" ? "กล้อง" : entry.source === "timer" ? "จับเวลา" : "บันทึกเอง"}{entry.side ? ` · ข้าง${entry.side === "left" ? "ซ้าย" : "ขวา"}` : ""}</small></div><span>{entry.value} {byId(entry.exerciseId).unit}</span><button title="ลบบันทึกนี้" aria-label={`ลบบันทึก${byId(entry.exerciseId).name}`} onClick={() => onDelete(entry)}><X size={16} /></button></div>)}</div>{filtered.length > visibleCount && <button className="history-more" onClick={() => setVisibleCount((count) => count + 50)}>ดูเพิ่มอีก {Math.min(50, filtered.length - visibleCount)} รายการ</button>}</> : <div className="empty-state"><Dumbbell size={30} /><h3>{entries.length ? "ไม่พบผลที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติการฝึก"}</h3><p>{entries.length ? "ลองเปลี่ยนตัวกรองด้านบน" : "เริ่มฝึกเซตแรก แล้วผลจะมาแสดงที่นี่"}</p>{!entries.length && <button className="button button--lime" onClick={onStart}>ไปหน้าแผนวันนี้ <ArrowRight size={17} /></button>}</div>}
  </section>;
}
