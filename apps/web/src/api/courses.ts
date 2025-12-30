import { apiGet } from "./client";

export type CoursesResponse = {
  courses: any[];
};

export async function fetchCourses() {
  return apiGet<CoursesResponse>("/courses");
}
