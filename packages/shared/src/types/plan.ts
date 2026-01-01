export type Rejection = {
  courseCode: string;
  reason: string;
};

export type SelectedSection = {
  courseCode: string;
  sectionId: string;
};

export type GeneratedPlan = {
  planId: string;
  selectedCourseCodes: string[];
  selectedSections: SelectedSection[];
  totalCredits: number;
  score: number;
  explanation: string[];
  rejected: Rejection[];
};
