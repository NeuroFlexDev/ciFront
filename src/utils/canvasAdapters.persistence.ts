import type { CanvasSnapshot } from '@/types/canvas';
import { createCanvasEdge } from '@/utils/edgeFactory';
import { createCanvasNode } from '@/utils/nodeFactory';

export function createInitialCanvas(courseId: string, courseTitle: string): CanvasSnapshot {
  const course = createCanvasNode('course', { x: 0, y: 0 }, {
    title: courseTitle,
    description: 'Верхний уровень образовательной системы.',
    status: 'in_progress',
  });

  const module = createCanvasNode('module', { x: 340, y: -80 }, {
    title: 'Модуль 1',
    description: 'Первый смысловой блок программы.',
    status: 'draft',
  });

  const lesson = createCanvasNode('lesson', { x: 680, y: -120 }, {
    title: 'Урок 1.1',
    description: 'Вход в тему и контекст.',
  });

  const practice = createCanvasNode('practice', { x: 680, y: 40 }, {
    title: 'Практика 1.1',
    description: 'Применение и закрепление.',
  });

  const skill = createCanvasNode('skill', { x: 1010, y: -40 }, {
    title: 'Навык: базовая сборка',
    description: 'Результат прохождения первого блока.',
    status: 'ready',
  });

  return {
    courseId,
    courseTitle,
    nodes: [course, module, lesson, practice, skill],
    edges: [
      createCanvasEdge(course.id, module.id, 'contains'),
      createCanvasEdge(module.id, lesson.id, 'contains'),
      createCanvasEdge(module.id, practice.id, 'contains'),
      createCanvasEdge(practice.id, skill.id, 'builds_skill'),
    ],
    viewport: { x: 140, y: 220, zoom: 0.78 },
    updatedAt: Date.now(),
  };
}
