import type { CalendarDay, CalendarEvent } from "./type";
import { PX_PER_MIN } from "./constants";
import { eventToBox } from "./geometry";
import { getCourseColor } from "@courseplan/shared";

const FULL_DAY_NAME: Record<CalendarDay, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

type Props = {
  day: CalendarDay;
  events: CalendarEvent[];
  windowStartMin: number;
  windowEndMin: number;
};

export default function DayColumn({ day, events, windowStartMin, windowEndMin }: Props) {
  const dayEvents = events.filter((e) => e.day === day);
  const totalHeightPx = (windowEndMin - windowStartMin) * PX_PER_MIN;

  return (
    <div style={{ width: "100%" }}>
      {/* Day header */}
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: dayEvents.length > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
        }}
      >
        {FULL_DAY_NAME[day]}
      </div>

      {/* Column body */}
      <div
        style={{
          position: "relative",
          height: totalHeightPx,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,10,12,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Hour grid lines */}
        {Array.from({ length: Math.ceil((windowEndMin - windowStartMin) / 60) + 1 }).map((_, i) => (
          <div
            key={`h-${i}`}
            style={{
              position: "absolute",
              top: i * 60 * PX_PER_MIN,
              left: 0,
              right: 0,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              zIndex: 0,
            }}
          />
        ))}

        {/* Half-hour grid lines */}
        {Array.from({ length: Math.ceil((windowEndMin - windowStartMin) / 60) }).map((_, i) => (
          <div
            key={`hh-${i}`}
            style={{
              position: "absolute",
              top: i * 60 * PX_PER_MIN + 30 * PX_PER_MIN,
              left: 0,
              right: 0,
              borderTop: "1px solid rgba(255,255,255,0.03)",
              zIndex: 0,
            }}
          />
        ))}

        {/* Empty state */}
        {dayEvents.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <div style={{ fontSize: 18, opacity: 0.1 }}>—</div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.18)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              No classes
            </div>
          </div>
        )}

        {/* Events */}
        {dayEvents.map((e) => {
          const box = eventToBox(e, windowStartMin, windowEndMin);
          if (!box) return null;
          const colors = getCourseColor(e.courseCode);

          return (
            <div
              key={e.id}
              style={{
                position: "absolute",
                top: box.topPx + 2,
                left: 5,
                right: 5,
                height: Math.max(box.heightPx - 4, 18),
                borderRadius: 10,
                padding: "7px 9px",
                background: `linear-gradient(160deg, ${colors.bg}f0, ${colors.bg}cc)`,
                border: `1px solid ${colors.border}bb`,
                boxShadow: `0 2px 10px ${colors.bg}44, inset 0 1px 0 rgba(255,255,255,0.08)`,
                color: colors.text,
                overflow: "hidden",
                zIndex: 1,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1.2 }}>
                {e.labelLine1}
              </div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2, lineHeight: 1.2 }}>
                {e.labelLine2}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
