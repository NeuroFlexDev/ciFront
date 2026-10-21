import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AuthProvider} from '@/auth/AuthContext';
import {api,getAuthToken,setAuthToken} from '@/shared/api';
import {AppErrorBoundary} from '@/Components/AppErrorBoundary';
import CourseEditPage from '@/Components/CourseEditPage/CourseEditPage';
import AdminPage from '@/Pages/AdminPage/AdminPage';
import MyCourses from '@/Pages/MyCourses/MyCourses';
import AccountPage from '@/Pages/AccountPage/AccountPage';
import {clearDraft,readDraft,setDraftOwner,writeDraft} from '@/shared/drafts';
import {useCanvasStore} from '@/store/canvasStore';

const {user}=vi.hoisted(()=>({user:{id:100,email:'test@example.invalid',full_name:'Test',is_admin:false}}));
vi.mock('@/Components/Menu/Menu',()=>({default:()=>null}));
vi.mock('@/auth/useAuth',()=>({useAuth:()=>({user,isAuthenticated:true,isLoading:false,logout:vi.fn()})}));
beforeEach(()=>{user.id++;setDraftOwner(user.id);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();sessionStorage.clear();setDraftOwner(null);});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const editor=()=> <MemoryRouter initialEntries={['/courses/7/edit']}><Routes><Route path="/courses/:id/edit" element={<CourseEditPage/>}/></Routes></MemoryRouter>;
const courseFetch=async (url:unknown,init?:RequestInit)=>{
  if(init?.method==='PUT')throw new TypeError('Failed to fetch');
  const path=String(url);
  if(path.endsWith('/structure'))return json({course_id:7,title:'Test course',status:'draft',modules_timeline:[{module_id:3}]});
  if(path.endsWith('/modules/3'))return json({id:3,title:'Module',revision:1,lessons:[{id:4,title:'Lesson',description:'',content:'Saved original',revision:1},{id:5,title:'Second lesson',description:'',content:'Second original',revision:1}],tests:[],tasks:[]});
  if(path.endsWith('/tests/'))return json([]);
  throw new Error('Unexpected URL '+path);
};

describe('R02 recovery',()=>{
  it.each(['network','server'])('keeps the login token after initial %s failure and can retry',async mode=>{
    setAuthToken('test-token');
    const fetchMock=mode==='network'?vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')):vi.fn().mockResolvedValueOnce(json({detail:'failure'},500));
    fetchMock.mockResolvedValue(json({id:user.id,email:user.email}));vi.stubGlobal('fetch',fetchMock);
    render(<AuthProvider><p>Workspace loaded</p></AuthProvider>);
    const retry=await screen.findByRole('button',{name:'Повторить загрузку'});
    expect(getAuthToken()).toBe('test-token');
    fireEvent.click(retry);expect(await screen.findByText('Workspace loaded')).toBeInTheDocument();
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Повторить загрузку'})).not.toBeInTheDocument());
  });

  it('recovers from React failure with an in-place retry',()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});let broken=true;
    function Page(){if(broken)throw new Error('synthetic failure');return <h1>Recovered page</h1>;}
    render(<AppErrorBoundary><Page/></AppErrorBoundary>);
    expect(screen.getByText('500')).toBeInTheDocument();broken=false;
    fireEvent.click(screen.getByRole('button',{name:'Повторить'}));
    expect(screen.getByRole('heading',{name:'Recovered page'})).toBeInTheDocument();
  });

  it('shows a dedicated 403 for an unauthorized admin route',()=>{
    render(<MemoryRouter><AdminPage/></MemoryRouter>);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Доступ заблокирован'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/В рабочее пространство/})).toHaveAttribute('href','/dashboard');
  });

  it.each([403,404,500])('distinguishes a course API %s and exposes the appropriate next action',async status=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({detail:'Access error'},status)));
    render(editor());expect(await screen.findByText(String(status))).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'В рабочее пространство'})).toHaveAttribute('href','/dashboard');
    expect(Boolean(screen.queryByRole('button',{name:'Повторить загрузку'}))).toBe(status===500);
    expect(screen.queryByText('В курсе пока нет уроков')).not.toBeInTheDocument();
  });

  it('restores a failed lesson write after a full editor remount',async()=>{
    vi.stubGlobal('fetch',vi.fn(courseFetch));const first=render(editor());
    fireEvent.change(await screen.findByLabelText('Текст урока (Markdown)'),{target:{value:'Important unsaved answer'}});
    fireEvent.click(screen.getByRole('button',{name:'Сохранить урок'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Сохранить урок'})).toBeEnabled());
    first.unmount();render(editor());
    await waitFor(()=>expect(screen.getByLabelText('Текст урока (Markdown)')).toHaveValue('Important unsaved answer'));
    expect(screen.getByRole('button',{name:'Опубликовать курс'})).toBeDisabled();
  });

  it('does not allow publishing while a different lesson has an unsaved draft',async()=>{
    vi.stubGlobal('fetch',vi.fn(courseFetch));render(editor());
    fireEvent.change(await screen.findByLabelText('Текст урока (Markdown)'),{target:{value:'Pending first lesson'}});
    fireEvent.click(screen.getByRole('button',{name:'Second lesson'}));
    expect(screen.getByLabelText('Текст урока (Markdown)')).toHaveValue('Second original');
    expect(screen.getByRole('button',{name:'Опубликовать курс'})).toBeDisabled();
  });

  it('retrying a failed list read recovers without showing a false empty state',async()=>{
    const fetchMock=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(json([{id:2,title:'Recovered course',module_count:1,lesson_count:2,publication_status:'draft'}]));
    vi.stubGlobal('fetch',fetchMock);render(<MemoryRouter><MyCourses/></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button',{name:'Повторить загрузку'}));
    expect(await screen.findByRole('heading',{name:'Recovered course'})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Создайте первый курс'})).not.toBeInTheDocument();
  });

  it('shows receipt failure after changing tabs and supports retry',async()=>{
    const fetchMock=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(json({receipts:[],marketing_active:false}));
    vi.stubGlobal('fetch',fetchMock);render(<MemoryRouter><AccountPage/></MemoryRouter>);
    await act(async()=>{});fireEvent.click(screen.getByRole('button',{name:'Документы и согласия'}));
    expect(screen.queryByText(/Для этого аккаунта записей пока нет/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button',{name:'Повторить загрузку'}));
    expect(await screen.findByText('Рекламная подписка отключена.')).toBeInTheDocument();
  });

  it('does not erase newer input when an older save finishes, and isolates users',()=>{
    writeDraft('response:4','older',3);writeDraft('response:4','newer',3);
    clearDraft('response:4','older');expect(readDraft<string>('response:4')?.value).toBe('newer');
    setDraftOwner(user.id+1000);expect(readDraft('response:4')).toBeNull();
  });

  it('treats malformed JSON as a recoverable server error',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{',{headers:{'content-type':'application/json'}})));
    await expect(api.get('/broken')).rejects.toMatchObject({status:502,code:'invalid_response'});
  });

  it('recovers canvas edits and keeps the original revision to detect concurrent changes',async()=>{
    const snapshot={courseId:'25',courseTitle:'Canvas',nodes:[],edges:[],viewport:{x:0,y:0,zoom:1},updatedAt:0};
    const fetchMock=vi.fn().mockResolvedValueOnce(json({version:2,snapshot}));vi.stubGlobal('fetch',fetchMock);
    await useCanvasStore.getState().loadCourse('25');
    useCanvasStore.getState().createNode('lesson');
    const title=useCanvasStore.getState().nodes[0].data.title;
    fetchMock.mockResolvedValueOnce(json({version:3,snapshot}));
    await useCanvasStore.getState().loadCourse('25');
    expect(useCanvasStore.getState().nodes[0].data.title).toBe(title);
    expect(useCanvasStore.getState().recoveredDraft).toBe(true);
    fetchMock.mockResolvedValueOnce(json({detail:'Concurrent change'},409));
    await useCanvasStore.getState().saveCourse();
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).version).toBe(2);
    expect(useCanvasStore.getState().lastErrorStatus).toBe(409);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });
});

