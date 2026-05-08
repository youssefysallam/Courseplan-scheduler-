import type { CalendarEvent } from "./type";
import { CAL_DAYS } from "./constants";
import TimeRail from "./TimeRail";
import DayColumn from "./DayColumn";

type Props = {
  events: CalendarEvent[];
  windowStartMin: number;
  windowEndMin: number;
};

export default function WeekGrid({ events, windowStartMin, windowEndMin }: Props) {

  return (
    <div style={{ overflowX: "auto", borderRadius: 12 }}>
      <div style={{ display: "flex", gap: 10, minWidth: 520 }}>
        <TimeRail windowStartMin={windowStartMin} windowEndMin={windowEndMin} />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
            gap: 8,
            flex: 1,
          }}
        >
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
