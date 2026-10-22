import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProtectedImage } from '@/Components/MarkdownContent';
import { apiFetch } from '@/shared/api';
vi.mock('@/shared/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/Components/DiagramBlock', () => ({ default: () => null }));
vi.mock('@/shared/diagrams', () => ({ DIAGRAM_LANGUAGES: new Set() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:saved-image');
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const imageResponse = () => new Response(new Blob(['synthetic image'], { type: 'image/png' }), { status: 200 });

it('restores an already mounted protected illustration after session renewal', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(imageResponse());
  render(<ProtectedImage src='/api/images/1/content' alt='Saved course image' />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Войдите снова');
  await act(async () => window.dispatchEvent(new Event('lernium-session-renewed')));
  expect(await screen.findByRole('img', { name: 'Saved course image' })).toHaveAttribute('src', 'blob:saved-image');
  expect(apiFetch).toHaveBeenCalledTimes(2);
  expect(apiFetch).toHaveBeenLastCalledWith('/images/1/content', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('recovers a temporary server failure on reconnect and does not claim an access denial', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(imageResponse());
  render(<ProtectedImage src='/api/images/1/content' alt='Saved course image' />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Иллюстрация временно недоступна');
  expect(screen.getByRole('alert')).not.toHaveTextContent('в вашем сеансе');
  await act(async () => window.dispatchEvent(new Event('online')));
  await screen.findByRole('img', { name: 'Saved course image' });
  await act(async () => window.dispatchEvent(new Event('online')));
  expect(apiFetch).toHaveBeenCalledTimes(2);
});

it('removes reconnect listeners and revokes the protected blob on unmount', async () => {
  vi.mocked(apiFetch).mockResolvedValue(imageResponse());
  const { unmount } = render(<ProtectedImage src='/api/images/1/content' alt='Saved course image' />);
  await screen.findByRole('img', { name: 'Saved course image' });
  unmount();
  await act(async () => window.dispatchEvent(new Event('lernium-session-renewed')));
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:saved-image'));
  expect(apiFetch).toHaveBeenCalledTimes(1);
});
