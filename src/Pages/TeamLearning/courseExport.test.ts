import { beforeEach, expect, it, vi } from 'vitest';
import { api, apiFetch, assertAuthSession } from '@/shared/api';
import { renderDiagram } from '@/shared/diagrams';
import { exportCourse } from './courseExport';
vi.mock('@/shared/api', () => ({api:{post:vi.fn()},apiFetch:vi.fn(),captureAuthSession:vi.fn(() => ({generation:1,storedToken:'owner'})),assertAuthSession:vi.fn()}));
vi.mock('@/shared/diagrams', () => ({renderDiagram:vi.fn()}));
const selection={course_version_id:12,snapshot_sha256:'a'.repeat(64),include_sources:true,include_answer_keys:false,confirm_transfer:true,confirm_private_materials:false};
const diagram={id:'b'.repeat(64),kind:'mermaid',source:'flowchart LR\n A --> B'};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.post).mockResolvedValue({data:{course_version_id:12,snapshot_sha256:selection.snapshot_sha256,diagrams:[diagram]}});
  vi.mocked(renderDiagram).mockResolvedValue({svg:'<svg>safe local diagram</svg>',width:100,height:50});
  vi.mocked(apiFetch).mockResolvedValue(new Response('%PDF-1.4\ncontent', {headers:{'Content-Type':'application/pdf'}}));
});
it('renders only exact planned diagrams in print theme and submits the consent-bound edition', async () => {
  const file=await exportCourse('pdf',selection);
  expect(file.type).toBe('application/pdf');
  expect(renderDiagram).toHaveBeenCalledWith(diagram.source,diagram.kind,{theme:'print'});
  const [url,request]=vi.mocked(apiFetch).mock.calls[0];
  expect(url).toBe('/team/course-transfers/export.pdf');
  expect(JSON.parse(String(request?.body))).toEqual({...selection,include_sources:false,diagrams:[{id:diagram.id,svg:'<svg>safe local diagram</svg>'}]});
});
it('stops before download when a diagram cannot be rendered, without silently omitting it', async () => {
  vi.mocked(renderDiagram).mockRejectedValue(new Error('Invalid diagram'));
  await expect(exportCourse('pdf',selection)).rejects.toThrow('Invalid diagram');
  expect(apiFetch).not.toHaveBeenCalled();
});
it('rejects a plan for another edition before rendering', async () => {
  vi.mocked(api.post).mockResolvedValue({data:{course_version_id:13,snapshot_sha256:selection.snapshot_sha256,diagrams:[]}});
  await expect(exportCourse('pdf',selection)).rejects.toThrow('не совпал');
  expect(renderDiagram).not.toHaveBeenCalled();expect(apiFetch).not.toHaveBeenCalled();
});
it('never downloads a response whose account changed while reading the body', async () => {
  vi.mocked(api.post).mockResolvedValue({data:{course_version_id:12,snapshot_sha256:selection.snapshot_sha256,diagrams:[]}});
  const response=new Response('%PDF-1.4', {headers:{'Content-Type':'application/pdf'}});
  const original=response.arrayBuffer.bind(response);
  vi.spyOn(response,'arrayBuffer').mockImplementation(async () => {
    const result=await original();vi.mocked(assertAuthSession).mockImplementation(() => {throw new Error('Session changed');});return result;
  });
  vi.mocked(apiFetch).mockResolvedValue(response);
  await expect(exportCourse('pdf',selection)).rejects.toThrow('Session changed');
});
it('rejects a fake PDF even if the HTTP response claims application/pdf', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response('<html>error</html>',{headers:{'Content-Type':'application/pdf'}}));
  await expect(exportCourse('pdf',selection)).rejects.toThrow('неполный файл');
});
