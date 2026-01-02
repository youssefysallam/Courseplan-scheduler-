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
    <div style={{ width: "100%" }}>
      <div style={{ height: 28, display: "flex", alignItems: "center", fontSize: 12, opacity: 0.8 }}>
        {day}
        </div>

      <div
        style={{
          position: "relative",
          height: totalHeightPx,
          border: "1px solid #2a2a2a",
          background: "#0b0b0b",
        }}
      >
        {/* Hour grid */}
        {Array.from({
        length: Math.ceil((windowEndMin - windowStartMin) / 60) + 1,
        }).map((_, i) => (
        <div
            key={`h-${i}`}
            style={{
            position: "absolute",
            top: i * 60 * PX_PER_MIN,
            left: 0,
            right: 0,
            borderTop: "1px solid rgba(255,255,255,0.7)",
            zIndex: 0,
            }}
        />
        ))}

        {/* Half-hour grid */}
        {Array.from({
        length: Math.ceil((windowEndMin - windowStartMin) / 60),
        }).map((_, i) => (
        <div
            key={`hh-${i}`}
            style={{
            position: "absolute",
            top: i * 60 * PX_PER_MIN + 30 * PX_PER_MIN,
            left: 0,
            right: 0,
            borderTop: "1px solid rgba(255,255,255,0.27)",
            zIndex: 0,
            }}
        />
        ))}
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
                zIndex: 1,
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
