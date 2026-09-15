import type { CanvasSnapshot } from '@/types/canvas';
export function createInitialCanvas(courseId: string, courseTitle: string): CanvasSnapshot {
  return {courseId,courseTitle,nodes:[],edges:[],viewport:{x:100,y:100,zoom:1},updatedAt:0};
}
