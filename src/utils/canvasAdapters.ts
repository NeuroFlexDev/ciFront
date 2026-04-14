import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  BriefcaseBusiness,
  CircleDot,
  ClipboardCheck,
  Compass,
  FolderKanban,
  Frame,
  GitBranch,
  GraduationCap,
  MessageSquareText,
  Network,
  NotebookPen,
  PanelTop,
  Sparkles,
} from 'lucide-react';

import type {
  CanvasAiActionType,
  CanvasNodeType,
  EdgeType,
} from '@/types/canvas';

type NodeTypeDefinition = {
  label: string;
  description: string;
  accent: string;
  surface: string;
  icon: LucideIcon;
};

type EdgeTypeDefinition = {
  label: string;
  stroke: string;
  dash?: string;
};

type AiActionDefinition = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export const NODE_TYPE_DEFINITIONS: Record<CanvasNodeType, NodeTypeDefinition> = {
  course: {
    label: 'Курс',
    description: 'Главный контейнер программы',
    accent: '#c7efff',
    surface: 'linear-gradient(180deg, rgba(18, 39, 56, 0.96), rgba(9, 24, 37, 0.94))',
    icon: Compass,
  },
  module: {
    label: 'Модуль',
    description: 'Смысловой блок программы',
    accent: '#ffd3a8',
    surface: 'linear-gradient(180deg, rgba(49, 32, 22, 0.96), rgba(27, 17, 12, 0.94))',
    icon: FolderKanban,
  },
  lesson: {
    label: 'Урок',
    description: 'Единица изучения материала',
    accent: '#e0d2ff',
    surface: 'linear-gradient(180deg, rgba(35, 28, 56, 0.96), rgba(19, 15, 31, 0.94))',
    icon: NotebookPen,
  },
  theory: {
    label: 'Теория',
    description: 'Объяснение и концепции',
    accent: '#a9e5da',
    surface: 'linear-gradient(180deg, rgba(20, 47, 43, 0.96), rgba(11, 26, 24, 0.94))',
    icon: PanelTop,
  },
  practice: {
    label: 'Практика',
    description: 'Упражнение и отработка',
    accent: '#ffd89e',
    surface: 'linear-gradient(180deg, rgba(56, 41, 20, 0.96), rgba(34, 24, 10, 0.94))',
    icon: BriefcaseBusiness,
  },
  test: {
    label: 'Тест',
    description: 'Проверка понимания',
    accent: '#ffb8b8',
    surface: 'linear-gradient(180deg, rgba(62, 24, 24, 0.96), rgba(34, 13, 13, 0.94))',
    icon: ClipboardCheck,
  },
  project: {
    label: 'Проект',
    description: 'Итоговая практическая сборка',
    accent: '#ffd7c7',
    surface: 'linear-gradient(180deg, rgba(63, 34, 26, 0.96), rgba(33, 18, 13, 0.94))',
    icon: GraduationCap,
  },
  skill: {
    label: 'Навык',
    description: 'Целевой прикладной результат',
    accent: '#bce3ff',
    surface: 'linear-gradient(180deg, rgba(22, 43, 64, 0.96), rgba(10, 20, 31, 0.94))',
    icon: Sparkles,
  },
  competency: {
    label: 'Компетенция',
    description: 'Более широкий набор навыков',
    accent: '#d3c4ff',
    surface: 'linear-gradient(180deg, rgba(40, 31, 63, 0.96), rgba(19, 15, 31, 0.94))',
    icon: Network,
  },
  branch: {
    label: 'Ветвление',
    description: 'Развилка сценариев',
    accent: '#ffdfa8',
    surface: 'linear-gradient(180deg, rgba(59, 38, 18, 0.96), rgba(30, 21, 11, 0.94))',
    icon: GitBranch,
  },
  comment: {
    label: 'Комментарий',
    description: 'Заметка или ремарка',
    accent: '#cbd6e2',
    surface: 'linear-gradient(180deg, rgba(38, 44, 50, 0.96), rgba(21, 25, 29, 0.94))',
    icon: MessageSquareText,
  },
  frame: {
    label: 'Фрейм',
    description: 'Группа или область',
    accent: '#8fb7da',
    surface: 'linear-gradient(180deg, rgba(20, 32, 47, 0.92), rgba(10, 18, 29, 0.84))',
    icon: Frame,
  },
};

export const EDGE_TYPE_DEFINITIONS: Record<EdgeType, EdgeTypeDefinition> = {
  contains: { label: 'Содержит', stroke: '#8fb7da' },
  prerequisite: { label: 'Предусловие', stroke: '#f1c27d', dash: '10 6' },
  next: { label: 'Далее', stroke: '#9fd0a8' },
  alternative: { label: 'Альтернатива', stroke: '#d3c4ff', dash: '8 5' },
  related: { label: 'Связано', stroke: '#b7c4d3', dash: '5 5' },
  assesses: { label: 'Проверяет', stroke: '#ffb0a6' },
  builds_skill: { label: 'Строит навык', stroke: '#7fd9c4' },
  maps_to_competency: { label: 'Маппинг к компетенции', stroke: '#aebcff' },
};

export const AI_ACTION_DEFINITIONS: Record<CanvasAiActionType, AiActionDefinition> = {
  split_module: {
    label: 'Разбить модуль на уроки',
    description: 'Добавляет уроки и соединяет их со структурой модуля.',
    icon: Bot,
  },
  generate_test: {
    label: 'Сгенерировать тест',
    description: 'Создает узел теста и привязывает его к выделенному блоку.',
    icon: ClipboardCheck,
  },
  extend_branch: {
    label: 'Достроить ветку',
    description: 'Добавляет альтернативный маршрут освоения.',
    icon: GitBranch,
  },
  simplify_structure: {
    label: 'Упростить структуру',
    description: 'Предлагает более компактную сборку текущего фрагмента.',
    icon: CircleDot,
  },
  find_gaps: {
    label: 'Найти пробелы',
    description: 'Создает заметки о недостающих элементах и связях.',
    icon: Sparkles,
  },
};

export const PRIMARY_NODE_TYPES: CanvasNodeType[] = [
  'course',
  'module',
  'lesson',
  'practice',
  'test',
  'skill',
];

export const EXTENDED_NODE_TYPES: CanvasNodeType[] = [
  ...PRIMARY_NODE_TYPES,
  'theory',
  'project',
  'competency',
  'branch',
  'comment',
  'frame',
];
