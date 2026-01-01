import type { CalendarDay, CalendarEvent } from "./types";

type TimeSlot = {
  day: string;
  startMin: number;
  endMin: number;
};

type CourseSection = {
  id: string;                // <-- dataset uses `id`
  timeSlots: TimeSlot[];
};

type Course = {
  code: string;              // <-- dataset uses `code`
  sections: CourseSection[];
};

function isWeekday(day: unknown): day is CalendarDay {
  return (
    day === "Mon" ||
    day === "Tue" ||
    day === "Wed" ||
    day === "Thu" ||
    day === "Fri"
  );
}

export function planToCalendarEvents(
  plan: any,
  courses: Course[]
): CalendarEvent[] {
  if (!plan?.selectedSections || !Array.isArray(plan.selectedSections)) {
    return [];
  }

  const courseByCode = new Map<string, Course>();
  for (const c of courses) {
    courseByCode.set(c.code, c);
  }

  const events: CalendarEvent[] = [];

  for (const picked of plan.selectedSections) {
    const courseCode: string = picked.courseCode;
    const sectionId: string = picked.sectionId;

    const course = courseByCode.get(courseCode);
    if (!course) continue;

    const section = course.sections.find(
      (s) => s.id === sectionId   // <-- FIXED
    );
    if (!section) continue;

    for (let i = 0; i < section.timeSlots.length; i++) {
      const ts = section.timeSlots[i];
      if (!isWeekday(ts.day)) continue;

      events.push({
        id: `${courseCode}-${sectionId}-${ts.day}-${ts.startMin}-${ts.endMin}`,
        courseCode,
        sectionId,
        day: ts.day,
        startMin: ts.startMin,
        endMin: ts.endMin,
        labelLine1: courseCode,
        labelLine2: sectionId,
        colorKey: courseCode,
      });
    }
  }

  return events;
}
