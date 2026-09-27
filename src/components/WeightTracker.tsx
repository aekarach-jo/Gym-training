"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Scale, Target, Trash2 } from "lucide-react";
import type { WeightEntry } from "@/lib/storage";

const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDate = (value: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(value + "T12:00:00"));
const kgText = (value: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);

export function WeightTracker({ weights, goal, onAdd, onGoal, onDelete, onNotice }: {
  weights: WeightEntry[]; goal: number | null; onAdd: (date: string, kg: number) => void;
  onGoal: (kg: number | null) => void; onDelete: (id: string) => void; onNotice: (message: string) => void;
}) {
  const [date, setDate] = useState(day(new Date()));
  const [kg, setKg] = useState("");
  const [goalInput, setGoalInput] = useState(goal?.toString() ?? "");
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  const first = sorted[0];
  const change = latest && first && latest.id !== first.id ? Math.round((latest.kg - first.kg) * 10) / 10 : null;
  const chart = sorted.slice(-12);
  const min = Math.min(...chart.map((item) => item.kg), goal ?? Infinity);
  const max = Math.max(...chart.map((item) => item.kg), goal ?? -Infinity);
  const low = Number.isFinite(min) ? min - Math.max(1, (max - min) * 0.25) : 0;
  const high = Number.isFinite(max) ? max + Math.max(1, (max - min) * 0.25) : 1;
  const x = (index: number) => chart.length < 2 ? 260 : 42 + index * (436 / (chart.length - 1));
  const y = (value: number) => 174 - ((value - low) / (high - low)) * 142;
  const path = chart.map((item, index) => `${index ? "L" : "M"} ${x(index)} ${y(item.kg)}`).join(" ");
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(kg);
    if (!Number.isFinite(value) || value < 20 || value > 500 || !date || date > day(new Date())) { onNotice("กรอกน้ำหนัก 20–500 กก. และวันที่ไม่เกินวันนี้"); return; }
    onAdd(date, Math.round(value * 10) / 10);
    setKg("");
    onNotice("บันทึกน้ำหนักแล้ว");
  };
  const saveGoal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!goalInput.trim()) { onGoal(null); onNotice("ลบเป้าหมายน้ำหนักแล้ว"); return; }
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value < 20 || value > 500) { onNotice("กรอกเป้าหมายน้ำหนัก 20–500 กก."); return; }
    onGoal(Math.round(value * 10) / 10); onNotice("บันทึกเป้าหมายแล้ว");
  };
  return <>
    <div className="weight-stats">
      <div className="weight-stat"><span><Scale size={18} /> ล่าสุด</span><strong>{latest ? kgText(latest.kg) : "—"}<small>{latest ? " กก." : ""}</small></strong><em>{latest ? shortDate(latest.date) : "ยังไม่มีข้อมูล"}</em></div>
      <div className="weight-stat"><span>{change !== null && change < 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />} เปลี่ยนจากครั้งแรก</span><strong>{change === null ? "—" : `${change > 0 ? "+" : ""}${kgText(change)}`}<small>{change === null ? "" : " กก."}</small></strong><em>ตัวเลขขึ้นหรือลงตามที่บันทึก</em></div>
      <div className="weight-stat"><span><Target size={18} /> เป้าหมาย</span><strong>{goal !== null ? kgText(goal) : "—"}<small>{goal !== null ? " กก." : ""}</small></strong><em>{goal !== null && latest ? `ห่างจากค่าที่ตั้งไว้ ${kgText(Math.abs(latest.kg - goal))} กก.` : "กำหนดเองได้"}</em></div>
    </div>
    <div className="weight-layout">
      <section className="card-panel weight-chart-card"><div className="section-heading"><div><span className="section-kicker">BODY WEIGHT</span><h2>แนวโน้มน้ำหนัก</h2></div><span className="section-count">{chart.length} รายการล่าสุด</span></div>
        {chart.length ? <div className="weight-chart-wrap"><svg viewBox="0 0 520 215" role="img" aria-label="กราฟน้ำหนักตามวันที่บันทึก" preserveAspectRatio="none">
          {[48, 98, 148].map((line) => <line key={line} x1="35" x2="485" y1={line} y2={line} stroke="#e8eee5" strokeDasharray="5 6" />)}
          {goal !== null && goal >= low && goal <= high && <><line x1="35" x2="485" y1={y(goal)} y2={y(goal)} stroke="#f3ae63" strokeDasharray="5 5" /><text x="482" y={y(goal) - 7} textAnchor="end" fill="#ba7f40" fontSize="12">เป้าหมาย</text></>}
          <path d={path} fill="none" stroke="#508c43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {chart.map((item, index) => <circle key={item.id} cx={x(index)} cy={y(item.kg)} r="5" fill="#b7f46b" stroke="#376a39" strokeWidth="2" />)}
          <text x="35" y="207" fill="#8b9a8b" fontSize="12">{shortDate(chart[0].date)}</text><text x="485" y="207" textAnchor="end" fill="#8b9a8b" fontSize="12">{shortDate(chart.at(-1)!.date)}</text>
        </svg></div> : <div className="empty-state weight-empty"><Scale size={30} /><h3>เริ่มติดตามน้ำหนัก</h3><p>บันทึกครั้งแรก แล้วแนวโน้มจะปรากฏตรงนี้</p></div>}
        <p className="weight-chart-note">บันทึกตามวันที่จริงเพื่อดูแนวโน้มได้ชัดเจน · ระบบเก็บไว้ในเบราว์เซอร์ของคุณ</p>
      </section>
      <div className="weight-side">
        <form className="card-panel weight-form" onSubmit={add}><span className="section-kicker">NEW ENTRY</span><h2>บันทึกน้ำหนัก</h2><label>วันที่<input type="date" value={date} max={day(new Date())} onChange={(event) => setDate(event.target.value)} required /></label><label>น้ำหนัก (กก.)<input type="number" inputMode="decimal" min="20" max="500" step="0.1" placeholder="เช่น 68.5" value={kg} onChange={(event) => setKg(event.target.value)} required /></label><button className="button button--lime button--full" type="submit">บันทึกน้ำหนัก</button></form>
        <form className="card-panel weight-form" onSubmit={saveGoal}><span className="section-kicker">PERSONAL GOAL</span><h2>เป้าหมายน้ำหนัก</h2><label>น้ำหนักเป้าหมาย (กก.)<input type="number" inputMode="decimal" min="20" max="500" step="0.1" placeholder="เว้นว่างหากยังไม่ตั้ง" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /></label><button className="button button--outline button--full" type="submit">บันทึกเป้าหมาย</button></form>
      </div>
    </div>
    <section className="card-panel history-panel weight-history"><div className="section-heading"><div><span className="section-kicker">WEIGHT LOG</span><h2>รายการย้อนหลัง</h2></div></div>{sorted.length ? [...sorted].reverse().map((item) => <div className="history-row" key={item.id}><div className="history-icon"><Scale size={18} /></div><div><strong>{kgText(item.kg)} กก.</strong><small>{shortDate(item.date)}</small></div><button type="button" aria-label={`ลบน้ำหนักวันที่ ${shortDate(item.date)}`} onClick={() => onDelete(item.id)}><Trash2 size={16} /></button></div>) : <p className="weight-chart-note">ยังไม่มีรายการบันทึก</p>}</section>
  </>;
}
