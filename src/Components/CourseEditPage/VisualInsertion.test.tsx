import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseEditPage from './CourseEditPage';
import { readDraft, setDraftOwner } from '@/shared/drafts';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  renderDiagram: vi.fn(),
}));
const user = vi.hoisted(() => ({ id: 9510, organization_id: null }));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user }) }));
vi.mock('@/shared/api', () => ({
  api: mocks,
  captureAuthSession: () => ({}),
  authSessionIsCurrent: () => true,
}));
vi.mock('@/Components/Menu/Menu', () => ({ default: () => null }));
vi.mock('@/Components/SourceReleasePanel', () => ({ default: () => null }));
vi.mock('@/Components/DiagramBlock', () => ({ default: () => null }));
vi.mock('@/shared/diagrams', () => ({ renderDiagram: mocks.renderDiagram }));
vi.mock('@/Components/MarkdownContent', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
  ProtectedImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const lessons = [
  {
    id: 71,
    title: 'Урок А',
    content: 'Исходный текст А',
    description: '',
    revision: 3,
  },
  {
    id: 72,
    title: 'Урок Б',
    content: 'Исходный текст Б',
    description: '',
    revision: 5,
  },
];
const diagram = 'flowchart LR\nA --> B';
const asset = {
  id: 11,
  course_id: 7,
  status: 'approved',
  content_url: '/api/images/11/content',
  prompt: 'Схема оборудования',
  width: 200,
  height: 100,
};
const initialData = (path: string) =>
  path.endsWith('/structure')
    ? {
        course_id: 7,
        title: 'Курс',
        content_revision: 8,
        status: 'draft',
        modules_timeline: [{ module_id: 70 }],
      }
    : path === '/modules/70'
      ? { id: 70, title: 'Модуль', revision: 2, lessons, tests: [], tasks: [] }
      : path.includes('/images?')
        ? { items: [asset], total: 1, can_generate: false, can_upload: false }
        : path.includes('capabilities')
          ? { image_generation_available: false }
          : [];
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(++user.id);
  mocks.get.mockImplementation(async (path: string) => ({
    data: initialData(path),
  }));
  mocks.put.mockImplementation(async (_path: string, body: { content: string }) => ({
    data: { ...lessons[0], content: body.content, revision: 4 },
  }));
});
afterEach(() => {
  cleanup();
  setDraftOwner(null);
  localStorage.clear();
});
async function page() {
  render(
    <MemoryRouter initialEntries={['/courses/7/edit']}>
      <Routes>
        <Route path='/courses/:id/edit' element={<CourseEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Исходник' }));
  return screen.findByRole('textbox', { name: 'Текст урока (Markdown)' });
}
function pendingDiagram() {
  let resolve!: (value: { svg: string; width: number; height: number }) => void;
  mocks.renderDiagram.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Добавить блок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить схему' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Исходный текст схемы' }), {
    target: { value: diagram },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Добавить схему в урок' }));
  expect(mocks.renderDiagram).toHaveBeenCalledExactlyOnceWith(diagram, 'mermaid');
  return () => resolve({ svg: '<svg/>', width: 100, height: 100 });
}
it('inserts a delayed diagram into the latest text and persists all typing before saving', async () => {
  const text = await page();
  const finish = pendingDiagram();
  expect(text).toBeEnabled();
  const typed = 'Исходный текст А\nДополнено во время проверки схемы';
  fireEvent.change(text, { target: { value: typed } });
  (text as HTMLTextAreaElement).setSelectionRange(typed.length, typed.length);
  await act(async () => finish());
  const inserted = `${typed}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n`;
  expect(text).toHaveValue(inserted);
  expect(readDraft<string>('lesson:71')?.value).toBe(inserted);
  expect(readDraft<string>('lesson:71')?.baseRevision).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить урок' }));
  await waitFor(() =>
    expect(mocks.put).toHaveBeenCalledWith('/lessons/71', {
      content: inserted,
      expected_revision: 3,
    }),
  );
});
it('cancels the pending insertion when switching lessons and keeps the source draft for returning', async () => {
  await page();
  const finish = pendingDiagram();
  fireEvent.click(screen.getByRole('button', { name: 'Урок Б' }));
  fireEvent.click(screen.getByRole('button', { name: 'Исходник' }));
  const text = screen.getByRole('textbox', { name: 'Текст урока (Markdown)' });
  fireEvent.change(text, { target: { value: 'Новая редакция Б' } });
  await act(async () => finish());
  expect(text).toHaveValue('Новая редакция Б');
  expect(readDraft<string>('lesson:72')?.value).toBe('Новая редакция Б');
  expect(readDraft<string>('lesson:71')).toBeNull();
  expect(mocks.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Урок А' }));
  fireEvent.click(screen.getByRole('button', { name: 'Исходник' }));
  expect(screen.getByRole('textbox', { name: 'Текст урока (Markdown)' })).toHaveValue(
    lessons[0].content,
  );
  expect(screen.getByRole('textbox', { name: 'Исходный текст схемы' })).toHaveValue(diagram);
});
it('does not insert after closing the editor and retains the diagram recovery copy', async () => {
  const text = await page();
  const finish = pendingDiagram();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть редактор схемы' }));
  await act(async () => finish());
  expect(text).toHaveValue(lessons[0].content);
  expect(readDraft<string>('lesson:71')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Добавить блок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить схему' }));
  expect(screen.getByRole('textbox', { name: 'Исходный текст схемы' })).toHaveValue(diagram);
});
it('requires an explicit image insertion and preserves typing made while the library loads', async () => {
  const text = await page();
  let finish!: (value: { data: unknown }) => void;
  mocks.get.mockImplementation((path: string) =>
    path.includes('/images?')
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve({ data: initialData(path) }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Добавить блок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить иллюстрацию' }));
  const typed = 'Текст А с новыми подробностями';
  fireEvent.change(text, { target: { value: typed } });
  (text as HTMLTextAreaElement).setSelectionRange(typed.length, typed.length);
  await act(async () => finish({ data: initialData('/courses/7/images?limit=12') }));
  expect(text).toHaveValue(typed);
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить в урок' }));
  const inserted = `${typed}\n![Схема оборудования](/api/images/11/content)\n`;
  expect(text).toHaveValue(inserted);
  expect(readDraft<string>('lesson:71')?.value).toBe(inserted);
  expect(mocks.put).not.toHaveBeenCalled();
});
