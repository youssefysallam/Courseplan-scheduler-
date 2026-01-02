import type { CalendarEvent } from "./types";
import { CAL_DAYS, HOUR_PX, PX_PER_MIN } from "./constants";
import TimeRail from "./TimeRail";
import DayColumn from "./DayColumn";

type Props = {
  events: CalendarEvent[];
  windowStartMin: number;
  windowEndMin: number;
};

export default function WeekGrid({ events, windowStartMin, windowEndMin }: Props) {
  const totalHeightPx = (windowEndMin - windowStartMin) * PX_PER_MIN;
  const hoursCount = Math.round((windowEndMin - windowStartMin) / 60);

  return (
    <div style={{ overflowX: "hidden" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <TimeRail windowStartMin={windowStartMin} windowEndMin={windowEndMin} />

        <div
            style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(160px, 1fr))",
                gap: 12,
                width: "min(1100px, 100%)",
            }}
        >

          {/* Day columns */}
          {CAL_DAYS.map((d) => (
            <DayColumn
              key={d}
              day={d}
              events={events}
              windowStartMin={windowStartMin}
              windowEndMin={windowEndMin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
