"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/exercises";

export function ExerciseArt({ exercise, size = "card" }: { exercise: Exercise; size?: "card" | "large" }) {
  const [playing, setPlaying] = useState(true);

  return (
    <div className={`exercise-art ${exercise.wide ? "exercise-art--wide" : "exercise-art--tall"} exercise-art--${size} ${playing ? "" : "exercise-art--paused"}`}>
      <div className="exercise-art__viewport" role="img" aria-label={`ภาพการ์ตูนเคลื่อนไหวสาธิตท่า${exercise.name}`}>
        {[0, 1, 2, 3].map((frame) => (
          <div
            key={frame}
            className={`exercise-art__frame exercise-art__frame--${frame}`}
            style={{ backgroundImage: `url('${exercise.image}')`, backgroundPositionX: `${(frame / 3) * 100}%` }}
          />
        ))}
      </div>
      {size === "large" && (
        <button className="art-play" type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "หยุดภาพตัวอย่าง" : "เล่นภาพตัวอย่าง"}>
          {playing ? "หยุดภาพ" : "เล่นภาพ"}
        </button>
      )}
    </div>
  );
}
