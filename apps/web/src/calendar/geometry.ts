import type { CalendarEvent } from "./types";
import { DAY_END_MIN, DAY_START_MIN, MIN_BLOCK_PX, PX_PER_MIN } from "./constants";

export type EventBox = {
  id: string;
  topPx: number;
  heightPx: number;
};

export function eventToBox(evt: CalendarEvent): EventBox | null {
  if (evt.endMin <= DAY_START_MIN) return null;
  if (evt.startMin >= DAY_END_MIN) return null;

  const clippedStart = Math.max(evt.startMin, DAY_START_MIN);
  const clippedEnd = Math.min(evt.endMin, DAY_END_MIN);

  const topPx = (clippedStart - DAY_START_MIN) * PX_PER_MIN;
  const rawHeightPx = (clippedEnd - clippedStart) * PX_PER_MIN;

  return {
    id: evt.id,
    topPx,
    heightPx: Math.max(rawHeightPx, MIN_BLOCK_PX),
  };
}
