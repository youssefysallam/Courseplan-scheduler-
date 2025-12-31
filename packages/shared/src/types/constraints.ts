export type Constraints = {
  minCredits: number;
  maxCredits: number;

  noEarlierThanMin?: number;     // minutes after midnight, e.g. 600 = 10:00
  maxDailyClassMins?: number;    // e.g. 240
  maxWeeklyWorkloadHours?: number;

  preferredDaysOff?: string[];   // e.g. ["Fri"]
};
