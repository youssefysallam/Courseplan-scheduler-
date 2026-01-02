import { CAL_DAYS, HOUR_PX } from "./constants";
import type { CalendarEvent } from "./types";

const MIN_PER_HOUR = 60;

function floorToHour(min: number) {
  return Math.floor(min / MIN_PER_HOUR) * MIN_PER_HOUR;
}
function ceilToHour(min: number) {
  return Math.ceil(min / MIN_PER_HOUR) * MIN_PER_HOUR;
}

export function computeWindow(events: CalendarEvent[]) {
  if (!events.length) {
    return { startMin: 8 * 60, endMin: 20 * 60 };
  }

  let minStart = Infinity;
  let maxEnd = -Infinity;

  for (const e of events) {
    minStart = Math.min(minStart, e.startMin);
    maxEnd = Math.max(maxEnd, e.endMin);
  }

  const startMin = floorToHour(minStart);
  const endMin = ceilToHour(maxEnd);

  // add a 1-hour padding above/below for breathing room
  const paddedStart = Math.max(0, startMin - 60);
  const paddedEnd = Math.min(24 * 60, endMin + 60);

  return { startMin: paddedStart, endMin: paddedEnd };
}
