export type CalendarDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export type CalendarEvent = {
  id: string;
  courseCode: string;
  sectionId: string;
  day: CalendarDay;
  startMin: number;
  endMin: number;
  labelLine1: string;
  labelLine2: string;
  colorKey: string;
};
