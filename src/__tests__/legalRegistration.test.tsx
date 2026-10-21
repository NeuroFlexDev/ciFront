import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AuthPage from '../Pages/AuthPage/AuthPage';
import catalog from '../legal/catalog.json';
const mocks=vi.hoisted(()=>({register:vi.fn(),login:vi.fn()}));
vi.mock('@/auth/useAuth',()=>({useAuth:()=>({isLoading:false,isAuthenticated:false,...mocks})}));
vi.mock('@/shared/api',()=>({apiFetch:vi.fn(async()=>({ok:true,json:async()=>({registration_enabled:true})}))}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('requires terms and keeps marketing optional, transmitting a versioned explicit choice',async()=>{
  render(<MemoryRouter initialEntries={['/auth?mode=register']}><AuthPage/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Зарегистрироваться'})).toBeEnabled());
  const boxes=screen.getAllByRole('checkbox');
  expect(boxes[0]).not.toBeChecked();expect(boxes[0]).toBeRequired();
  expect(boxes[1]).not.toBeChecked();expect(boxes[1]).not.toBeRequired();
  fireEvent.change(screen.getByLabelText('Ваша почта'),{target:{value:'person@example.edu'}});
  fireEvent.change(screen.getByPlaceholderText('Минимум 8 символов'),{target:{value:'long-safe-password'}});
  fireEvent.click(boxes[0]);fireEvent.click(screen.getByRole('button',{name:'Зарегистрироваться'}));
  await waitFor(()=>expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({terms_accepted:true,marketing_accepted:false,legal_version:catalog.version})));
});
it('login does not collect a fresh advertising or terms consent',async()=>{
  render(<MemoryRouter initialEntries={['/auth']}><AuthPage/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Войти'})).toBeEnabled());
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.getByRole('link',{name:'Не помню пароль'})).toHaveAttribute('href','/forgot-password');
});
