export type CourseLevel = 'Undergraduate' | 'Graduate';
export type AssessmentStatus = 'Draft' | 'Ready';

export interface CourseBriefInput {
  title: string;
  courseCode: string;
  level: CourseLevel;
  learningOutcomes: string[];
  testMode: boolean;
}

export interface SuggestedCourseBrief {
  title: string;
  courseCode: string;
  description: string;
  kind: 'suggested';
  generationLabel: string;
  learningOutcomes: string[];
}

export interface CourseUnit {
  id: string;
  title: string;
  summary: string;
  lectureIds: string[];
}

export interface LecturePlanItem {
  id: string;
  number: number;
  title: string;
  durationMinutes: number;
  role: 'Core' | 'Practice' | 'Assessment';
  summary: string;
  objectives: string[];
  concepts: string[];
}

export interface ConceptDependency {
  concept: string;
  prerequisiteConcepts: string[];
  lectureNumber: number;
}

export interface AssessmentBlueprintItem {
  kind: 'assignment' | 'midterm' | 'final';
  title: string;
  coverage: string;
  scheduledAfterLecture: number;
  learningOutcomes: string[];
  questionCount: number;
}

export interface WorkedExample {
  prompt: string;
  reasoningSteps: string[];
  conclusion: string;
}

export interface LecturePractice {
  prompt: string;
  learningOutcome: string;
  points: number;
  hints: string[];
  solution: string;
  rubric: string[];
}

export interface LectureContent {
  motivatingQuestion: string;
  prerequisiteCheck: string;
  intuitiveExplanation: string;
  formalDevelopment: string;
  workedExamples: WorkedExample[];
  applications: string[];
  misconceptions: string[];
  extension: string;
  summary: string;
  practice: LecturePractice;
}

export interface Lecture {
  id: string;
  number: number;
  title: string;
  durationMinutes: number;
  role: 'Core' | 'Practice' | 'Assessment';
  summary: string;
  objectives: string[];
  concepts?: string[];
  content?: LectureContent | null;
}

export interface AssessmentBase {
  id: string;
  title: string;
  coverage: string;
  description: string;
  status: AssessmentStatus;
}

export interface AssignmentProblem {
  prompt: string;
  learningOutcome: string;
  points: number;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  hints: string[];
  expectedAnswer: string;
  rubric: string[];
}

export interface Assignment extends AssessmentBase {
  kind: 'assignment';
  problemCount: number;
  points: number;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  rubric: string[];
  problems?: AssignmentProblem[];
}

export interface ExamQuestion {
  section: string;
  prompt: string;
  learningOutcome: string;
  points: number;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  expectedSolution: string;
  rubric: string[];
}

export interface Exam extends AssessmentBase {
  kind: 'midterm' | 'final';
  questionCount: number;
  durationMinutes: number;
  sections: string[];
  questions?: ExamQuestion[];
}

export type Assessment = Assignment | Exam;

export interface Course {
  id: string;
  title: string;
  courseCode: string;
  level: CourseLevel;
  description: string;
  learnerProfile: string;
  prerequisites: string[];
  learningOutcomes: string[];
  units: CourseUnit[];
  lectures: Lecture[];
  lecturePlan?: LecturePlanItem[];
  conceptDependencies?: ConceptDependency[];
  assessmentBlueprint?: AssessmentBlueprintItem[];
  scopeLimits?: string[];
  assessments: Assessment[];
  contentReviewStatus: 'draft' | 'reviewed';
}

export interface HealthResponse {
  status: 'ready' | 'degraded';
  services: {
    localApi: 'available' | 'unavailable';
    generationProvider: 'configured' | 'not-configured';
  };
}

export interface CourseListResponse {
  courses: Course[];
}

export interface CourseResponse {
  course: Course;
}

export interface AssignmentRequest {
  topic: string;
  difficulty: Assignment['difficulty'];
  problemCount: number;
}

export interface ExamRequest {
  topics: string[];
  coverage?: string;
  durationMinutes: number;
  questionCount: number;
}

export interface FinalExamRequest {
  coverage: string;
  durationMinutes: number;
  questionCount: number;
}

export interface AssignmentResponse {
  assessment: Assignment;
}

export interface ExamResponse {
  assessment: Exam;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: string[];
  };
}
