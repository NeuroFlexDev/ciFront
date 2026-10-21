import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import CourseReviewsPage from '@/Pages/Learning/CourseReviewsPage';
import {setDraftOwner} from '@/shared/drafts';

const mock=vi.hoisted(()=>({user:{id:900,organization_id:22}}));
vi.mock('@/auth/useAuth',()=>({useAuth:()=>({...mock,isAuthenticated:true})}));
vi.mock('@/Components/Menu/Menu',()=>({default:()=>null}));
beforeEach(()=>{mock.user.id++;setDraftOwner(mock.user.id);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();sessionStorage.clear();});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const page=()=> <MemoryRouter initialEntries={['/course-reviews?course=4']}><CourseReviewsPage/></MemoryRouter>;

it('retains review comments after a stale-version conflict and requires reviewing the changed content',async()=>{
  let digest='a'.repeat(64),revision=1;const submissions:Record<string,unknown>[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:unknown,init?:RequestInit)=>{
    if(init?.method==='POST'){
      const body=JSON.parse(String(init.body));submissions.push(body);
      if(submissions.length===1){digest='b'.repeat(64);revision=2;return json({detail:'Content changed'},409);}
      return json({id:10,content_digest:digest});
    }
    if(String(url).includes('/approvals'))return json({required:true,content_digest:digest,items:[],next_cursor:null});
    if(String(url).includes('/review-content'))return json({content_digest:digest,content:{course:{id:4,title:'Review target',description:'Version '+revision,revision},modules:[],assessments:[]}});
    throw new Error('Unexpected '+String(url));
  }));
  const first=render(page());
  fireEvent.change(await screen.findByLabelText('Комментарий проверяющего'),{target:{value:'Detailed review survives network and reload'}});
  first.unmount();render(page());
  expect(await screen.findByLabelText('Комментарий проверяющего')).toHaveValue('Detailed review survives network and reload');
  fireEvent.click(screen.getByRole('button',{name:'Сохранить решение'}));
  await screen.findByText('Содержание изменилось во время проверки');
  expect(screen.getByRole('button',{name:'Сохранить решение'})).toBeDisabled();
  expect(screen.getByLabelText('Комментарий проверяющего')).toHaveValue('Detailed review survives network and reload');
  fireEvent.click(screen.getByRole('button',{name:'Я проверил текущее содержание'}));
  fireEvent.click(screen.getByRole('button',{name:'Сохранить решение'}));
  await waitFor(()=>expect(submissions).toHaveLength(2));
  expect(submissions[0].content_digest).toBe('a'.repeat(64));
  expect(submissions[1].content_digest).toBe('b'.repeat(64));
  await screen.findByText('Решение сохранено в истории.');
  expect(screen.getByLabelText('Комментарий проверяющего')).toHaveValue('');
});
