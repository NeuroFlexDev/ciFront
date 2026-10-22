import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach,beforeEach, expect, it, vi } from 'vitest';
import ExpressPage from '@/Pages/ExpressPage/ExpressPage';
import { api } from '@/shared/api';
import {setDraftOwner,writeDraft} from '@/shared/drafts';
import {ApiError} from '@/shared/errors';
const {user}=vi.hoisted(()=>({user:{id:600,email:'test@example.invalid'}}));
vi.mock('@/auth/useAuth',()=>({useAuth:()=>({user})}));

vi.mock('@/Components/Menu/Menu', () => ({default: () => null}));
vi.mock('@/shared/api', () => ({api:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
beforeEach(()=>{user.id++;setDraftOwner(user.id);});
afterEach(() => {cleanup(); vi.clearAllMocks();localStorage.clear();setDraftOwner(null);});
const capabilities={document_formats:['pdf','docx','txt','md'],document_max_bytes:25*1024*1024,source_characters_limit:500000};
const preflight={allowed:true,reasons:[],source_characters:500,source_bytes:500,minimum_calls:8,calls_limit:250,output_token_reservation:8000,tokens_limit:500000,note:'Budget checked'};

it('resumes uploaded ready documents and launches the real generation API', async () => {
  const settings = {title:'Safety',goal:'Learn safe operation',target_audience:null,difficulty:'basic',
    language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,approved_plan:[],revision:4};
  const documents={items:[{id:42,original_filename:'policy.txt',status:'ready',size_bytes:500,extracted_characters:500,chunk_count:1}],total:1};
  let resolveDocuments:(value:{data:typeof documents})=>void=()=>{};
  vi.mocked(api.get).mockImplementation(path => path.includes('documents')
    ? new Promise(resolve=>{resolveDocuments=resolve;})
    : Promise.resolve({data:path.includes('capabilities')?capabilities:path.includes('generation-settings')?settings
      :{run_id:99,course_id:7,status:'completed',progress_percent:100,stages:[]}}));
  vi.mocked(api.put).mockResolvedValue({data:{...settings,revision:5}});
  vi.mocked(api.post).mockImplementation(async path=>({data:path.includes('preflight')?preflight:{run_id:99}}));
  render(<MemoryRouter initialEntries={['/express?course=7']}><ExpressPage/></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText('Название курса')).toHaveValue('Safety'));
  const continueButton=screen.getByRole('button',{name:'Сохранить и продолжить →'});
  // Settings and documents load independently. A populated title does not mean
  // the ready sources have arrived or that the form can be submitted yet.
  expect(continueButton).toBeDisabled();
  await act(async()=>resolveDocuments({data:documents}));
  await waitFor(()=>expect(continueButton).toBeEnabled());
  fireEvent.click(continueButton);
  const button = await screen.findByRole('button',{name:'Сгенерировать курс'});
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/courses/7/generation-runs',
    {document_ids:[42],settings:{title:settings.title,goal:settings.goal,target_audience:null,difficulty:'basic',language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,approved_plan:[],expected_revision:5},request_id:expect.any(String)}));
  expect(api.put).toHaveBeenCalledWith('/courses/7/generation-settings',expect.objectContaining({expected_revision:4}));
  expect(await screen.findByRole('link',{name:'Проверить и опубликовать курс'})).toHaveAttribute('href','/courses/7/edit');
});

it('loads server settings even when documents finish first', async()=>{
  let resolveSettings:(value:{data:unknown})=>void=()=>{};
  vi.mocked(api.get).mockImplementation(path=>path.includes('generation-settings')?new Promise(resolve=>{resolveSettings=resolve;}):Promise.resolve({data:path.includes('capabilities')?capabilities:{items:[],total:0}}));
  render(<MemoryRouter initialEntries={['/express?course=8']}><ExpressPage/></MemoryRouter>);
  await waitFor(()=>expect(api.get).toHaveBeenCalledWith('/courses/8/documents?limit=20&offset=0'));
  resolveSettings({data:{title:'Later server response',goal:'Actual server goal',target_audience:null,difficulty:'basic',language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,revision:3}});
  await waitFor(()=>expect(screen.getByLabelText('Название курса')).toHaveValue('Later server response'));
});

it('keeps the old draft revision on reload and never generates after a conflicting save',async()=>{
  const settings={title:'Local plan',goal:'Local goal',target_audience:null,difficulty:'basic',language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,approved_plan:[],expected_revision:2};
  writeDraft('generation:9',{settings,document_ids:[42],selection_initialized:true,request_id:'stable-generation-key'});
  vi.mocked(api.get).mockImplementation(async path=>({data:path.includes('capabilities')?capabilities:path.includes('generation-settings')?{...settings,title:'Server plan',revision:7}:{items:[],total:0}}));
  vi.mocked(api.put).mockRejectedValue(new ApiError('Conflict',409,'conflict'));
  render(<MemoryRouter initialEntries={['/express?course=9']}><ExpressPage/></MemoryRouter>);
  expect(await screen.findByText('Настройки на сервере изменились')).toBeInTheDocument();
  expect(screen.getByLabelText('Название курса')).toHaveValue('Local plan');
  fireEvent.click(screen.getByRole('button',{name:'Сохранить и продолжить →'}));
  await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/courses/9/generation-settings',expect.objectContaining({expected_revision:2,title:'Local plan'})));
  expect(vi.mocked(api.post).mock.calls.filter(([path])=>path.includes('generation-preflight') || path.includes('generation-runs'))).toEqual([]);
  expect(screen.getByLabelText('Название курса')).toHaveValue('Local plan');
});

it('resumes polling when a paused run keeps the same checkpoint ID', async () => {
  let resumed = false;
  vi.mocked(api.get).mockImplementation(async path => ({data: path.includes('capabilities')?capabilities:path.includes('documents') ? {items:[],total:0}
    : {run_id:99,course_id:7,status:resumed ? 'completed' : 'paused',progress_percent:resumed ? 100 : 60,
       stages:[],status_error:null,status_notice:resumed ? null : 'Материалы и готовые этапы сохранены.'}}));
  vi.mocked(api.post).mockImplementation(async () => {resumed = true; return {data:{run_id:99}};});
  render(<MemoryRouter initialEntries={['/express?course=7&run=99']}><ExpressPage/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Прогресс сохранён'})).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Продолжить генерацию'}));
  expect(await screen.findByRole('link',{name:'Проверить и опубликовать курс'})).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/generation-runs/99/retry');
});

it('locks editable settings while a save is pending so its receipt cannot overwrite newer typing',async()=>{
  const settings={title:'Original',goal:'Learning goal',target_audience:null,difficulty:'basic',language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,approved_plan:[],revision:4};
  vi.mocked(api.get).mockImplementation(async path=>({data:path.includes('capabilities')?capabilities:path.includes('generation-settings')?settings:{items:[{id:42,status:'ready',original_filename:'source.txt'}],total:1}}));
  let resolveSave:(value:{data:unknown})=>void=()=>{};vi.mocked(api.put).mockImplementation(()=>new Promise(resolve=>{resolveSave=resolve;}));vi.mocked(api.post).mockResolvedValue({data:preflight});
  render(<MemoryRouter initialEntries={['/express?course=17']}><ExpressPage/></MemoryRouter>);
  const title=await screen.findByLabelText('Название курса');await waitFor(()=>expect(title).toHaveValue('Original'));
  fireEvent.change(title,{target:{value:'Submitted title'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить и продолжить →'}));
  await waitFor(()=>expect(api.put).toHaveBeenCalled());expect(title).toBeDisabled();expect(screen.getByLabelText('Описание и цель курса')).toBeDisabled();expect(screen.getByLabelText('Язык курса')).toBeDisabled();
  fireEvent.change(title,{target:{value:'Must not overwrite'}});expect(title).toHaveValue('Submitted title');
  await act(async()=>resolveSave({data:{...settings,title:'Submitted title',revision:5}}));
  await screen.findByRole('button',{name:'Сгенерировать курс'});
  expect(api.post).toHaveBeenCalledWith('/courses/17/generation-preflight',expect.objectContaining({settings:expect.objectContaining({title:'Submitted title',expected_revision:5})}));
});

it('shows pending acceptance, keeps its durable request ID after a lost response, and never retries the paid launch automatically', async () => {
  const settings={title:'Safety',goal:'Safe operation',target_audience:null,difficulty:'basic',language:'ru',lesson_count:2,module_tests_enabled:true,final_test_enabled:true,approved_plan:[],revision:4};
  vi.mocked(api.get).mockImplementation(async path => ({data:path.includes('capabilities')?capabilities:path.includes('generation-settings')?settings:path.includes('documents')?{items:[{id:42,status:'ready',original_filename:'source.txt'}],total:1}:{run_id:99,course_id:7,status:'completed',progress_percent:100,stages:[]}}));
  vi.mocked(api.put).mockResolvedValue({data:{...settings,revision:5}});
  let rejectLaunch:(reason:unknown)=>void=()=>{};
  let launches=0;
  vi.mocked(api.post).mockImplementation(path => {
    if(path.includes('preflight')) return Promise.resolve({data:preflight});
    if(path.endsWith('/generation-runs')) {
      launches++;
      return launches===1?new Promise((_resolve,reject)=>{rejectLaunch=reject;}):Promise.resolve({data:{run_id:99}});
    }
    return Promise.resolve({data:{}});
  });
  render(<MemoryRouter initialEntries={['/express?course=7&step=4']}><ExpressPage/></MemoryRouter>);
  await screen.findByText('Safety');
  fireEvent.click(screen.getByRole('button',{name:'Проверить параметры'}));
  fireEvent.click(await screen.findByRole('button',{name:'Сгенерировать курс'}));
  expect(await screen.findByRole('heading',{name:'Запускаем генерацию'})).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  await act(async()=>rejectLaunch(new ApiError('Response lost',0,'timeout')));
  expect(await screen.findByRole('heading',{name:'Проверим, принят ли запуск'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Настройка курса/})).toBeDisabled();
  await act(async()=>window.dispatchEvent(new Event('online')));
  expect(launches).toBe(1);
  fireEvent.click(screen.getByRole('button',{name:'Проверить запуск'}));
  expect(await screen.findByRole('link',{name:'Проверить и опубликовать курс'})).toBeInTheDocument();
  const requests=vi.mocked(api.post).mock.calls.filter(([path])=>path.endsWith('/generation-runs'));
  expect(requests).toHaveLength(2);
  expect(requests[1][1]).toEqual(requests[0][1]);
});

it('restores an existing run after session renewal without launching generation again', async () => {
  let renewed=false;
  vi.mocked(api.get).mockImplementation(async path => {
    if(path.startsWith('/generation-runs/') && !renewed) throw new ApiError('Expired',401);
    return {data:path.includes('capabilities')?capabilities:path.includes('documents')?{items:[],total:0}:{run_id:99,course_id:7,status:'completed',progress_percent:100,stages:[]}};
  });
  render(<MemoryRouter initialEntries={['/express?course=7&run=99']}><ExpressPage/></MemoryRouter>);
  expect(await screen.findByText('Нужно обновить сеанс')).toBeInTheDocument();
  renewed=true;
  await act(async()=>window.dispatchEvent(new Event('lernium-session-renewed')));
  expect(await screen.findByRole('link',{name:'Проверить и опубликовать курс'})).toBeInTheDocument();
  expect(vi.mocked(api.post).mock.calls.filter(([path])=>path.includes('generation-runs'))).toEqual([]);
});

it('stops only on request, keeps the checkpoint visible, and offers an explicit resume', async () => {
  let stopped=false;
  vi.mocked(api.get).mockImplementation(async path=>({data:path.includes('capabilities')?capabilities:path.includes('documents')?{items:[],total:0}:{run_id:99,course_id:7,status:stopped?'paused':'running',progress_percent:50,current_stage:'lesson_writing',stages:[{code:'lesson_writing',title:'Написание уроков',status:stopped?'pending':'running'}]}}));
  vi.mocked(api.post).mockImplementation(async()=>{stopped=true;return{data:{}};});
  render(<MemoryRouter initialEntries={['/express?course=7&run=99']}><ExpressPage/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Остановить после текущего этапа'}));
  expect(await screen.findByRole('heading',{name:'Прогресс сохранён'})).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','50');
  expect(screen.getByRole('button',{name:'Продолжить генерацию'})).toBeEnabled();
  expect(vi.mocked(api.post).mock.calls.filter(([path])=>path.includes('generation-runs'))).toEqual([['/generation-runs/99/cancel']]);
});
