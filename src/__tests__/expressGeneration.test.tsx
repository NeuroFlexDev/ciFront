import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ExpressPage from '@/Pages/ExpressPage/ExpressPage';
import { api } from '@/shared/api';

vi.mock('@/Components/Menu/Menu', () => ({default: () => null}));
vi.mock('@/shared/api', () => ({api:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
afterEach(() => {cleanup(); vi.clearAllMocks();});

it('resumes uploaded ready documents and launches the real generation API', async () => {
  const settings = {title:'Safety',goal:'Learn safe operation',target_audience:null,difficulty:'basic',
    language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true};
  vi.mocked(api.get).mockImplementation(async path => ({data: path.includes('generation-settings') ? settings
    : path.includes('documents') ? {items:[{id:42,original_filename:'policy.txt',status:'ready'}]}
      : {run_id:99,course_id:7,status:'completed',progress_percent:100,stages:[]}}));
  vi.mocked(api.put).mockResolvedValue({data:settings});
  vi.mocked(api.post).mockResolvedValue({data:{run_id:99}});
  render(<MemoryRouter initialEntries={['/express?course=7']}><ExpressPage/></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText('Название курса')).toHaveValue('Safety'));
  const button = screen.getByRole('button',{name:'Сгенерировать курс'});
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/courses/7/generation-runs',
    {document_ids:[42],settings}));
  expect(await screen.findByRole('link',{name:'Проверить и опубликовать курс'})).toHaveAttribute('href','/courses/7/edit');
});
