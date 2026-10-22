import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CanvasToolbar } from '@/Components/canvas/CanvasToolbar';
import { CanvasLeftPanel } from '@/Components/canvas/CanvasLeftPanel';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { canvasEnglish } from '@/i18n/canvas';
import { globalEnglish } from '@/i18n/global';
import { persistLocale } from '@/i18n/locale';
import { createCanvasNode, duplicateNode } from '@/utils/nodeFactory';

beforeEach(() => {
  localStorage.clear();
  persistLocale('en');
});
afterEach(cleanup);

it('switches canvas controls without translating the course title or losing a search draft', () => {
  const search = vi.fn();
  const addNode = vi.fn();
  render(
    <MemoryRouter>
      <LocaleProvider dictionaries={{ en: { ...globalEnglish, ...canvasEnglish } }}>
        <CanvasToolbar
          courseTitle='Исходный русский курс'
          isSaving={false}
          isAiRunning={false}
          lastSavedAt={null}
          onSave={vi.fn()}
          onSearch={search}
          onAiAction={vi.fn()}
        />
        <CanvasLeftPanel
          interactionMode='select'
          onModeChange={vi.fn()}
          onAddNode={addNode}
          onCreateFrame={vi.fn()}
        />
      </LocaleProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Исходный русский курс' })).toBeInTheDocument();
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'Мой запрос' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lesson' }));
  expect(addNode).toHaveBeenCalledWith('lesson');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ru' } });
  expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox')).toHaveValue('Мой запрос');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(search).toHaveBeenCalledWith('Мой запрос');
  expect(screen.getByRole('heading', { name: 'Исходный русский курс' })).toBeInTheDocument();
});

it('uses the selected locale only for new default node names and copy suffixes', () => {
  expect(createCanvasNode('lesson', { x: 0, y: 0 }).data.title).toBe('New lesson');
  const node = createCanvasNode(
    'lesson',
    { x: 0, y: 0 },
    { title: 'Авторский урок', description: 'Текст автора' },
  );
  expect(duplicateNode(node).data.title).toBe('Авторский урок copy');
  persistLocale('ru');
  expect(createCanvasNode('lesson', { x: 0, y: 0 }).data.title).toBe('Новый урок');
  expect(node.data.title).toBe('Авторский урок');
  expect(node.data.description).toBe('Текст автора');
});
