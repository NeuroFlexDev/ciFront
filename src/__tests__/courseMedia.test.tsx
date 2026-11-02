import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProtectedVideo from '@/Components/ProtectedVideo';
import MarkdownContent from '@/Components/MarkdownContent';
import ImageLibrary from '@/Components/ElementUi/ImageEditor/ImageLibrary';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  fetch: vi.fn(),
  revoke: vi.fn(),
  create: vi.fn(() => 'blob:protected-video'),
}));
vi.mock('@/shared/api', () => ({
  api: { get: mocks.get, post: mocks.post },
  apiFetch: mocks.fetch,
  captureAuthSession: () => ({}),
  assertAuthSession: () => {},
}));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 23 } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: mocks.create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: mocks.revoke });
});
afterEach(cleanup);

it('loads protected video only after a click, renders controls and releases bytes on close', async () => {
  mocks.fetch.mockResolvedValue(
    new Response(new Blob(['video fixture'], { type: 'video/mp4' }), {
      headers: { 'content-type': 'video/mp4' },
    }),
  );
  const { container } = render(
    <MarkdownContent>{'![Работа со станком](/api/media/42/content)'}</MarkdownContent>,
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Открыть видео' }));
  await waitFor(() =>
    expect(container.querySelector('video')).toHaveAttribute('src', 'blob:protected-video'),
  );
  expect(mocks.fetch).toHaveBeenCalledWith(
    '/media/42/content',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(container.querySelector('video')).toHaveAttribute('controls');
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть видео' }));
  expect(mocks.revoke).toHaveBeenCalledWith('blob:protected-video');
  expect(container.querySelector('video')).toBeNull();
});

it('shows a recoverable access error without embedding an unprotected URL', async () => {
  mocks.fetch.mockResolvedValue(new Response('Not allowed', { status: 404 }));
  const { container } = render(<ProtectedVideo src='/api/media/42/content' />);
  fireEvent.click(screen.getByRole('button', { name: 'Открыть видео' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Видео недоступно');
  expect(container.querySelector('video')).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть видео' }));
  expect(screen.getByRole('button', { name: 'Открыть видео' })).toBeVisible();
});

it('cancels a pending body read when the viewer closes', async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream({ cancel });
  mocks.fetch.mockResolvedValue(
    new Response(stream, { headers: { 'content-type': 'video/webm' } }),
  );
  render(<ProtectedVideo src='/api/media/43/content' />);
  fireEvent.click(screen.getByRole('button', { name: 'Открыть видео' }));
  await screen.findByText('Загружаем видео…');
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('button', { name: 'Отменить загрузку' }));
  await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
  expect(mocks.create).not.toHaveBeenCalled();
});

it('uploads a video, requires approval, and inserts only the approved asset', async () => {
  const asset = {
    id: 42,
    status: 'pending_review',
    mime_type: 'video/mp4',
    original_filename: 'Инструкция.mp4',
    content_url: '/api/media/42/content',
    size_bytes: 500,
    duration_seconds: 20,
  };
  let uploaded = false;
  mocks.get.mockImplementation(async (path: string) => ({
    data: path.includes('capabilities')
      ? { video_library_available: true, video_max_bytes: 1024, video_max_seconds: 1800 }
      : {
          items: uploaded ? [asset] : [],
          total: uploaded ? 1 : 0,
          can_upload: true,
          can_generate: false,
        },
  }));
  mocks.post.mockImplementation(async (path: string) => {
    if (path.endsWith('/review')) asset.status = 'approved';
    else uploaded = true;
    return { data: asset };
  });
  const insert = vi.fn();
  render(<ImageLibrary kind='video' courseId={7} onInsert={insert} />);
  await screen.findByText('Видео пока нет. Загрузите первое и проверьте его перед публикацией.');
  const file = new File(['video'], 'Инструкция.mp4', { type: 'video/mp4' });
  fireEvent.change(screen.getByLabelText('Загрузить видео'), { target: { files: [file] } });
  await screen.findByRole('button', { name: 'Утвердить' });
  expect(mocks.post).toHaveBeenCalledWith('/courses/7/media', expect.any(FormData));
  expect(screen.queryByRole('button', { name: 'Добавить в урок' })).not.toBeInTheDocument();
  expect(mocks.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Утвердить' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить в урок' }));
  expect(insert).toHaveBeenCalledWith('![Инструкция.mp4](/api/media/42/content)');
});
