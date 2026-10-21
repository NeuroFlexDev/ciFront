import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDurableState } from '@/hooks/useDurableState';
import { setDraftOwner } from '@/shared/drafts';

vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 91 } }) }));
beforeEach(() => { localStorage.clear(); setDraftOwner(91); });
afterEach(cleanup);

function Form() {
  const [value, setValue, clear] = useDurableState('independent-form', 'Server value');
  return <><input aria-label='Draft' value={value} onChange={e => setValue(e.target.value)} />
    <button onClick={() => clear(value)}>Save acknowledged</button></>;
}

it('never replaces an acknowledged form with a stale sibling draft after clearing its own recovery copy', () => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'My saved text' } });
  const siblingKey = 'lernium-draft:v1:91:independent-form:other-tab';
  localStorage.setItem(siblingKey, JSON.stringify({ value: 'Stale sibling text', updatedAt: Date.now(), storageKey: siblingKey }));
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByLabelText('Draft')).toHaveValue('My saved text');
  fireEvent(window, new StorageEvent('storage', { key: siblingKey }));
  expect(screen.getByLabelText('Draft')).toHaveValue('My saved text');
  expect(localStorage.getItem(siblingKey)).toContain('Stale sibling text');
});

it('still restores this tab\'s latest unsaved typing after the form remounts', () => {
  const view = render(<Form />);
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'My unsaved text' } });
  view.unmount();
  render(<Form />);
  expect(screen.getByLabelText('Draft')).toHaveValue('My unsaved text');
});
