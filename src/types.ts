/**
 * Shared Type Definitions for the REEL IN ONE educational hub (powered by REELSYSTEM)
 */

export interface ILAWFormData {
  teacherName: string;
  schoolName: string;
  gradeLevel: string;
  subject: string;
  quarter: string;
  week: string;
  lessonDate: string;
  duration: string;
  sessions: string;
  topic: string;
  competency: string;
  contentStandards: string;
  performanceStandards: string;
  objectives: string;
  materials: string;
  references: string;
  background: string;
  setup: string;
  integration: string;
  assessmentPlan: string;
  extendedLearning: string;
  reflectionQuestions: string;
  preLesson: string;
  lessonFlow: string;
  preparedBy: string;
  preparedPosition: string;
  checkedBy: string;
  checkedPosition: string;
  approvedBy: string;
  approvedPosition: string;
}

export interface SavedLessonPlan {
  id: string;
  title: string;
  type: "lesson" | "converted";
  createdAt: string;
  updatedAt: string;
  content: string; // The fully rendered HTML of the ILAW lesson plan
  formData?: ILAWFormData;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
}

export interface UserFeedback {
  id: string;
  name: string;
  comment: string;
  rating: number;
  createdAt: string;
}

export interface TOSEntry {
  competency: string;
  daysTaught: number;
  weightPercent: number;
  totalRowItems: number;
  bloomLevels: {
    remembering: number;
    understanding: number;
    applying: number;
    analyzing: number;
    evaluating: number;
    creating: number;
  };
  itemPlacement: string;
}

export interface RubricScaleLevel {
  levelName: string;
  score: number;
}

export interface RubricRow {
  criterionTitle: string;
  criterionDefinition: string;
  descriptors: {
    [key: string]: string; // level_1, level_2, etc.
  };
}

export interface RubricData {
  assignmentTitle: string;
  scaleLevels: RubricScaleLevel[];
  rubricRows: RubricRow[];
}


