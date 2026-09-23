import type {
  AssignmentRequest,
  AssignmentResponse,
  CourseBriefInput,
  CourseListResponse,
  CourseResponse,
  ExamRequest,
  ExamResponse,
  FinalExamRequest,
  HealthResponse,
  SuggestedCourseBrief,
} from '../types/course';

export interface ApiClient {
  getHealth(): Promise<HealthResponse>;
  listCourses(): Promise<CourseListResponse>;
  getCourse(courseId: string): Promise<CourseResponse>;
  generateCourse(input: CourseBriefInput): Promise<CourseResponse>;
  importCourse(course: unknown): Promise<CourseResponse>;
  generateNextLecture(courseId: string): Promise<CourseResponse>;
  generateAssignment(courseId: string, input: AssignmentRequest): Promise<AssignmentResponse>;
  generateMidterm(courseId: string, input: ExamRequest): Promise<ExamResponse>;
  generateFinal(courseId: string, input: FinalExamRequest): Promise<ExamResponse>;
  listSuggestedBriefs(): Promise<SuggestedCourseBrief[]>;
}
