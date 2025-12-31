import type { TimeSlot } from "../types/course";

export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.day !== b.day) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function sectionOverlaps(a: { timeSlots: TimeSlot[] }, b: { timeSlots: TimeSlot[] }): boolean {
  for (const sa of a.timeSlots) {
    for (const sb of b.timeSlots) {
      if (slotsOverlap(sa, sb)) return true;
    }
  }
  return false;
}
