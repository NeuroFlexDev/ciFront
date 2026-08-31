export interface Lesson {
  id: number;
  lesson: string;
  description: string;
}

export type TestQuestionType =
  | "single"
  | "multiple"
  | "open";

export interface TestOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface TestQuestion {
  id: number;
  question: string;
  type: TestQuestionType;
  options?: TestOption[];
  correctAnswer?: string;
  answer?: string;
  verificationMethod?: "ai" | "methodist";
}

export interface Test {
  id?: number;
  test: string;
  description: string;
  questions: TestQuestion[];
}

export interface Task {
  id?: number;
  name: string;
  description?: string;
}

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
}