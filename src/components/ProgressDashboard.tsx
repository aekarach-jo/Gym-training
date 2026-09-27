"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarDays, Flame, Medal, TrendingUp } from "lucide-react";
import { byId, type ExerciseId } from "@/lib/exercises";
import { activityDays, exerciseTrend, personalBests, trainingStreak, weeklyTrainingDays } from "@/lib/insights";
import type { SetEntry } from "@/lib/storage";

export function ProgressDashboard({ entries, weeklyGoal }: { entries: SetEntry[]; weeklyGoal: number }) {
  const records = useMemo(() => personalBests(entries), [entries]);
  const [selected, setSelected] = useState<ExerciseId>("squat");
  const shownExercise = records.some((record) => record.exerciseId === selected) ? selected : records[0]?.exerciseId ?? "squat";
  const week = useMemo(() => weeklyTrainingDays(entries), [entries]);
  const month = useMemo(() => activityDays(entries), [entries]);
  const trend = useMemo(() => exerciseTrend(entries, shownExercise), [entries, shownExercise]);
  const trained = week.filter((day) => day.trained).length;
  const streak = trainingStreak(entries);
  const maxTrend = Math.max(1, ...trend.map((point) => point.best));
  const currentRecord = records.find((record) => record.exerciseId === shownExercise);

  return <div className="insights">
    <div className="insight-top">
      <article className="insight-stat insight-stat--dark"><Flame size={23} /><span>ฝึกต่อเนื่อง</span><strong>{streak} <small>วัน</small></strong><p>{streak ? "นับจากวันนี้หรือเมื่อวาน" : "เริ่มฝึกวันนี้เพื่อสร้างสถิติ"}</p></article>
      <article className="insight-stat"><CalendarDays size={23} /><span>เป้าหมายสัปดาห์นี้</span><strong>{trained}<small> / {weeklyGoal} วัน</small></strong><div className="insight-meter"><span style={{ width: `${Math.min(100, trained / weeklyGoal * 100)}%` }} /></div><p>{trained >= weeklyGoal ? "ถึงเป้าหมายสัปดาห์นี้แล้ว" : `อีก ${weeklyGoal - trained} วันจะถึงเป้าหมาย`}</p></article>
      <article className="insight-stat"><Medal size={23} /><span>สถิติท่าฝึก</span><strong>{records.length}<small> / 9 ท่า</small></strong><p>จำนวนท่าที่มีผลการฝึกบันทึกไว้</p></article>
    </div>
    <div className="insight-grid">
      <section className="card-panel insight-panel"><div className="insight-heading"><div><span className="section-kicker">THIS WEEK</span><h2>ฝึกวันไหนบ้าง</h2></div><span>{trained} วัน</span></div><div className="insight-week">{week.map((day) => <div className={`insight-week-day ${day.trained ? "trained" : ""} ${day.future ? "future" : ""}`} key={day.date} title={day.date}><span>{new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(new Date(day.date + "T12:00:00"))}</span><strong>{Number(day.date.slice(-2))}</strong><i>{day.trained ? "✓" : ""}</i></div>)}</div><p className="insight-help">หนึ่งวันนับเมื่อมีการบันทึกอย่างน้อยหนึ่งเซต</p></section>
      <section className="card-panel insight-panel"><div className="insight-heading"><div><span className="section-kicker">LAST 30 DAYS</span><h2>ความสม่ำเสมอ</h2></div><Activity size={20} /></div><div className="activity-grid">{month.map((day) => <span className={`activity-cell activity-cell--${Math.min(3, day.sets)}`} title={`${day.date}: ${day.sets} เซต`} aria-label={`${day.date} ${day.sets} เซต`} key={day.date} />)}</div><div className="activity-legend"><span>ไม่ได้ฝึก</span><i /><i /><i /><span>ฝึกมาก</span></div></section>
    </div>
    <section className="card-panel insight-panel"><div className="insight-heading"><div><span className="section-kicker">EXERCISE PROGRESS</span><h2>สถิติและแนวโน้มรายท่า</h2></div><TrendingUp size={20} /></div><div className="trend-control"><label htmlFor="trend-exercise">เลือกท่า</label><select id="trend-exercise" value={shownExercise} onChange={(event) => setSelected(event.target.value as ExerciseId)}>{records.length ? records.map((record) => <option key={record.exerciseId} value={record.exerciseId}>{record.name}</option>) : <option value="squat">สควอต</option>}</select></div>{trend.length ? <><div className="trend-chart" role="img" aria-label={`กราฟผลงานท่า${byId(shownExercise).name}ย้อนหลัง ${trend.length} วันที่ฝึก`}>{trend.map((point) => <div className="trend-column" key={point.date}><strong>{point.best}</strong><span style={{ height: `${Math.max(12, point.best / maxTrend * 100)}%` }} /><small>{Number(point.date.slice(-2))}/{Number(point.date.slice(5, 7))}</small></div>)}</div><p className="insight-help">แสดงเซตที่ทำได้ดีที่สุดในแต่ละวัน สูงสุด 8 วันที่ฝึกล่าสุด</p></> : <div className="insight-empty">ยังไม่มีข้อมูลของท่านี้ ลองบันทึกเซตแรกแล้วกลับมาดูแนวโน้ม</div>}<div className="record-highlight"><Medal size={18} /><span>ดีที่สุดของท่านี้</span><strong>{currentRecord ? `${currentRecord.best} ${currentRecord.unit}` : "ยังไม่มี"}</strong></div></section>
    {records.length > 0 && <section className="card-panel insight-panel"><div className="insight-heading"><div><span className="section-kicker">PERSONAL BESTS</span><h2>สถิติสูงสุดทุกท่า</h2></div></div><div className="record-grid">{records.map((record) => <button key={record.exerciseId} onClick={() => setSelected(record.exerciseId)} className={shownExercise === record.exerciseId ? "selected" : ""}><span>{record.name}</span><strong>{record.best} <small>{record.unit}</small></strong></button>)}</div></section>}
  </div>;
}
