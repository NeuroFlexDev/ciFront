export interface Lesson {
  id: number;
  lesson: string;
  description: string;
}

export interface Test {
  id?: number;
  test: string;
  description: string;
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