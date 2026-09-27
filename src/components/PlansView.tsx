"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, Copy, Dumbbell, Plus, Trash2 } from "lucide-react";
import { PlanBuilder } from "@/components/PlanBuilder";
import { byId } from "@/lib/exercises";
import { plans, weekdays, type CustomPlan } from "@/lib/plans";
import type { TrainingData } from "@/lib/storage";

type Props = {
  data: TrainingData;
  onSelect: (id: string) => void;
  onSave: (plan: CustomPlan) => void;
  onDelete: (id: string) => void;
  onDuplicate: (plan: CustomPlan) => void;
};

export function PlansView({ data, onSelect, onSave, onDelete, onDuplicate }: Props) {
  const [editing, setEditing] = useState<CustomPlan | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const openBuilder = (plan: CustomPlan | null) => { setEditing(plan); setBuilderOpen(true); };

  return <>
    <div className="page-title"><span className="eyebrow"><span className="eyebrow-line" /> YOUR TRAINING PLAN</span><h1>เลือกแผนฝึก<span className="heading-lime">.</span></h1><p>เลือกแผนสำเร็จรูปหรือจัดหลายแผนให้เข้ากับแต่ละวัน</p></div>
    <div className="plan-builder-cta"><div><span className="section-kicker">YOUR OWN ROUTINE</span><strong>แผนฝึกที่พอดีกับชีวิตคุณ</strong><span>สร้างหลายแผน เลือกวัน ท่า จำนวนเซต และเวลาพักได้เอง</span></div><button className="button button--lime" disabled={data.customPlans.length >= 100} onClick={() => openBuilder(null)}><Plus size={17} /> {data.customPlans.length >= 100 ? "ครบ 100 แผนแล้ว" : "สร้างแผนใหม่"}</button></div>
    {builderOpen && <PlanBuilder key={editing?.id ?? "new"} initial={editing} history={data.entries} onCancel={() => setBuilderOpen(false)} onSave={(plan) => { onSave(plan); setBuilderOpen(false); }} />}
    <div className="plan-grid">
      {plans.map((plan, index) => { const chosen = data.activePlanId === plan.id; return <article className={`plan-card plan-card--${plan.accent} ${chosen ? "chosen" : ""}`} key={plan.id}><div className="plan-card-top"><span className="plan-number">0{index + 1} / PLAN</span>{chosen && <span className="plan-active"><Check size={14} /> แผนที่ใช้อยู่</span>}</div><h2>{plan.name}</h2><p>{plan.subtitle}</p><div className="plan-meta"><span><Clock3 size={15} /> {plan.duration}</span><span><CalendarDays size={15} /> {plan.days}</span></div><div className="plan-exercises">{plan.exerciseIds.map((id, order) => <div key={id}><span>{String(order + 1).padStart(2, "0")}</span><strong>{byId(id).name}</strong><small>{byId(id).bilateral ? 1 : byId(id).sets} × {byId(id).target} {byId(id).unit}{byId(id).bilateral ? " / ข้าง" : ""}</small></div>)}</div><button className={`button button--full ${chosen ? "button--dark" : "button--lime"}`} onClick={() => onSelect(plan.id)}>{chosen ? "กลับไปฝึกตามแผน" : "ใช้แผนนี้"} <ArrowRight size={17} /></button></article>; })}
      {data.customPlans.map((plan) => { const chosen = data.activePlanId === plan.id; return <article className={`plan-card plan-card--custom ${chosen ? "chosen" : ""}`} key={plan.id}><div className="plan-card-top"><span className="plan-number">MY ROUTINE</span>{chosen && <span className="plan-active"><Check size={14} /> แผนที่ใช้อยู่</span>}</div><h2>{plan.name}</h2><p>ออกแบบโดยคุณ ปรับวันและจำนวนเซตให้เข้ากับเวลาที่มี</p><div className="plan-meta"><span><Dumbbell size={15} /> {plan.items.length} ท่า</span><span><CalendarDays size={15} /> {plan.trainingDays.map((day) => weekdays[day]).join(" · ")}</span></div><div className="plan-exercises">{plan.items.map((item, index) => <div key={item.exerciseId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{byId(item.exerciseId).name}</strong><small>{item.sets} เซต × {item.target} {byId(item.exerciseId).unit} · พัก {item.rest} วิ</small></div>)}</div><div className="plan-custom-actions"><button className="button button--outline" onClick={() => openBuilder(plan)}>แก้ไข</button><button className="button button--lime" onClick={() => onSelect(plan.id)}>ใช้แผนนี้ <ArrowRight size={17} /></button></div><div className="plan-utility"><button disabled={data.customPlans.length >= 100} onClick={() => onDuplicate(plan)}><Copy size={15} /> คัดลอก</button><button onClick={() => setConfirmDelete(plan.id)}><Trash2 size={15} /> ลบ</button></div>{confirmDelete === plan.id && <div className="plan-delete-confirm"><span>ลบ “{plan.name}” หรือไม่? ประวัติการฝึกยังอยู่</span><button onClick={() => setConfirmDelete(null)}>ยกเลิก</button><button onClick={() => { onDelete(plan.id); setConfirmDelete(null); }}>ยืนยันลบ</button></div>}</article>; })}
    </div>
    <p className="plan-footnote">แนะนำให้เว้นวันพักระหว่างวันฝึกแรงต้าน และปรับจำนวนครั้งตามความพร้อมของตัวเอง</p>
  </>;
}
