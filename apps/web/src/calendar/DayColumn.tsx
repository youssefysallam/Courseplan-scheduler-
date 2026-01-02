import type { CalendarDay, CalendarEvent } from "./types";
import { PX_PER_MIN } from "./constants";
import { eventToBox } from "./geometry";

type Props = {
  day: CalendarDay;
  events: CalendarEvent[];
  windowStartMin: number;
  windowEndMin: number;
};

export default function DayColumn({
  day,
  events,
  windowStartMin,
  windowEndMin,
}: Props) {
  const dayEvents = events.filter((e) => e.day === day);

  // temp debug (remove later)
  console.log(
    day,
    dayEvents.map((e) => ({
      course: e.courseCode,
      startMin: e.startMin,
      endMin: e.endMin,
    }))
  );

  const totalHeightPx = (windowEndMin - windowStartMin) * PX_PER_MIN;

  return (
    <div style={{ width: 220 }}>
      <div style={{ padding: "8px 0", fontSize: 12, opacity: 0.8 }}>{day}</div>

      <div
        style={{
          position: "relative",
          height: totalHeightPx,
          border: "1px solid #2a2a2a",
          background: "#0b0b0b",
        }}
      >
        {dayEvents.map((e) => {
          const box = eventToBox(e, windowStartMin, windowEndMin);
          if (!box) return null;

          return (
            <div
              key={e.id}
              style={{
                position: "absolute",
                top: box.topPx,
                left: 6,
                right: 6,
                height: box.heightPx,
                borderRadius: 8,
                padding: 8,
                background: "#14532d",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{e.labelLine1}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{e.labelLine2}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
