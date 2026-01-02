import type { CalendarEvent } from "./types";
import { MIN_BLOCK_PX, PX_PER_MIN } from "./constants";

export type EventBox = {
  id: string;
  topPx: number;
  heightPx: number;
};

export function eventToBox(evt: CalendarEvent, windowStartMin: number, windowEndMin: number): EventBox | null {
  if (evt.endMin <= windowStartMin) return null;
  if (evt.startMin >= windowEndMin) return null;

  const clippedStart = Math.max(evt.startMin, windowStartMin);
  const clippedEnd = Math.min(evt.endMin, windowEndMin);

  const topPx = (clippedStart - windowStartMin) * PX_PER_MIN;
  const rawHeightPx = (clippedEnd - clippedStart) * PX_PER_MIN;

  return {
    id: evt.id,
    topPx,
    heightPx: Math.max(rawHeightPx, MIN_BLOCK_PX),
  };
}
