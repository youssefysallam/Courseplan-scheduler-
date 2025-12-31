export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type TimeSlot = {
  day: Day;
  startMin: number;
  endMin: number;
  location?: string;
};

export type SectionType = "LEC" | "LAB" | "DIS";

export type Section = {
  id: string;
  type: SectionType;
  instructor?: string;
  timeSlots: TimeSlot[];
  capacity?: number;
};

export type Course = {
  code: string;
  title: string;
  credits: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  avgHoursPerWeek: number;
  prereqs: string[];
  tags: string[];
  sections: Section[];
};
