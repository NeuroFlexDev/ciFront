import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthContext';
import { api, setAuthToken } from '@/shared/api';

afterEach(() => {cleanup(); vi.unstubAllGlobals(); localStorage.clear();});
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data),
  {status,headers:{'content-type':'application/json'}});

describe('session recovery', () => {
  it('keeps the mounted editor and its unsaved text when authentication expires', async () => {
    setAuthToken('expired-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({id:7,email:'editor@example.com'}))
      .mockResolvedValueOnce(response({access_token:'renewed',user:{id:7,email:'editor@example.com'}})));
    function Editor() {
      const [text,setText] = useState('');
      return <input aria-label="Lesson draft" value={text} onChange={e => setText(e.target.value)}/>;
    }
    render(<AuthProvider><Editor/></AuthProvider>);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText('Lesson draft'),{target:{value:'Unsaved content'}});
    act(() => window.dispatchEvent(new CustomEvent('lernium-session-expired')));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Lesson draft')).toHaveValue('Unsaved content');
    fireEvent.change(screen.getByLabelText('Пароль'),{target:{value:'example-password'}});
    fireEvent.click(screen.getByRole('button',{name:'Продолжить работу'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Lesson draft')).toHaveValue('Unsaved content');
  });

  it('keeps keyboard focus inside reauthentication and restores the draft field on Escape', async () => {
    setAuthToken('existing-session');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({id:7,email:'editor@example.com'})));
    render(<AuthProvider><input aria-label="Draft" defaultValue="Keep my answer"/></AuthProvider>);
    await act(async()=>{});
    const draft=screen.getByLabelText('Draft');
    draft.focus();
    act(()=>window.dispatchEvent(new CustomEvent('lernium-session-expired')));
    const password=await screen.findByLabelText('Пароль');
    expect(password).toHaveFocus();
    fireEvent.keyDown(password,{key:'Tab',shiftKey:true});
    expect(screen.getByRole('button',{name:'Вернуться к черновику'})).toHaveFocus();
    fireEvent.keyDown(document.activeElement!,{key:'Tab'});
    expect(password).toHaveFocus();
    fireEvent.keyDown(password,{key:'Escape'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(draft).toHaveFocus();
    expect(draft).toHaveValue('Keep my answer');
  });

  it('shows the actionable backend error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({detail:{code:'generation_run_active',
      message:'Генерация курса уже запущена'}},409)));
    await expect(api.post('/courses/1/generation-runs',{})).rejects.toThrow('Генерация курса уже запущена');
  });
});
