import { HOUR_PX, DAY_END_MIN, DAY_START_MIN } from "./constants";

function fmtHour(hour24: number) {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12} ${suffix}`;
}

type Props = {
  windowStartMin: number;
  windowEndMin: number;
};

export default function TimeRail({ windowStartMin, windowEndMin }: Props) {
  const totalMinutes = windowEndMin - windowStartMin;
  const totalHeightPx = (totalMinutes / 60) * HOUR_PX;

  const firstHour = Math.ceil(windowStartMin / 60);
  const lastHour = Math.ceil(windowEndMin / 60);

  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);

  return (
    <div style={{ width: 64 }}>
      <div style={{ height: 28 }} />
      <div
        style={{
          position: "relative",
          height: totalHeightPx,
          borderRight: "1px solid #2a2a2a",
          background: "#0b0b0b",
        }}
      >
        {hours.map((h) => {
          const top = (h * 60 - windowStartMin) * (HOUR_PX / 60);
          return (
            <div
              key={h}
              style={{
                position: "absolute",
                top: Math.max(0, Math.min(totalHeightPx - 14, top - 7)),
                right: 8,
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              {fmtHour(h)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
