import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCanvasSnapshot, saveCanvasSnapshot } from '@/api/canvasApi';
import { requestAiAction } from '@/api/aiApi';
import { createCanvasNode } from '@/utils/nodeFactory';
import { useCanvasStore } from '@/store/canvasStore';
import {setDraftOwner,readDraft} from '@/shared/drafts';
const fetchMock = vi.fn();
beforeEach(() => {vi.stubGlobal('fetch',fetchMock);fetchMock.mockReset();localStorage.clear();setDraftOwner(null);useCanvasStore.setState({aiProposal:null,isAiRunning:false});});
const json = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
describe('server canvas persistence', () => {
  it('keeps an AI proposal separate and durable until explicit acceptance',async()=>{
    setDraftOwner(42);
    const anchor=createCanvasNode('module',{x:0,y:0},{title:'Author material'});
    useCanvasStore.setState({courseId:'9',nodes:[anchor],edges:[],selectedNodeIds:[anchor.id],selectedEdgeIds:[],lastError:null});
    fetchMock.mockResolvedValueOnce(json({nodes:[{kind:'lesson',title:'Proposed lesson',description:'Source grounded content',source_ref_ids:[17]}],summary:'One new lesson'}));
    await useCanvasStore.getState().runAiAction('split_module');
    expect(useCanvasStore.getState().nodes).toEqual([anchor]);
    expect(useCanvasStore.getState().aiProposal?.result.nodes).toHaveLength(1);
    expect(readDraft('canvas-ai:9',42)).not.toBeNull();
    useCanvasStore.getState().acceptAiProposal();
    expect(useCanvasStore.getState().nodes).toHaveLength(2);
    expect(useCanvasStore.getState().edges).toHaveLength(1);
    expect(readDraft('canvas-ai:9',42)).toBeNull();
    useCanvasStore.getState().acceptAiProposal();
    expect(useCanvasStore.getState().nodes).toHaveLength(2);
  });
  it('rejects proposals without changing author content and guards a deleted anchor',async()=>{
    const anchor=createCanvasNode('module',{x:0,y:0},{title:'Keep this'});
    const proposed=createCanvasNode('lesson',{x:320,y:0},{title:'New'});
    const proposal={result:{nodes:[proposed],edges:[],summary:'Review'},anchorIds:[anchor.id]};
    useCanvasStore.setState({courseId:'9',nodes:[anchor],edges:[],aiProposal:proposal});
    useCanvasStore.getState().rejectAiProposal();
    expect(useCanvasStore.getState().nodes).toEqual([anchor]);
    useCanvasStore.setState({nodes:[],aiProposal:proposal});
    useCanvasStore.getState().acceptAiProposal();
    expect(useCanvasStore.getState().nodes).toEqual([]);
    expect(useCanvasStore.getState().lastError).toContain('Исходный узел удалён');
  });
  it('imports generated nodes and saves with server revision',async () => {
    fetchMock.mockResolvedValueOnce(json({version:3,snapshot:null})).mockResolvedValueOnce(json({nodes:[{id:'lesson:42',type:'lesson',label:'Реальный урок',description:'Из документов'}],edges:[],updated_at:null}));
    const snapshot = await loadCanvasSnapshot('9');
    expect(snapshot?.nodes[0].id).toBe('lesson:42');
    expect(snapshot?.nodes[0].data.title).toBe('Реальный урок');
    fetchMock.mockResolvedValueOnce(json({version:4,snapshot}));
    await saveCanvasSnapshot(snapshot!);
    const request = fetchMock.mock.calls[2];
    expect(request[0]).toBe('/api/courses/9/workspace');
    expect(JSON.parse(request[1].body).version).toBe(3);
    expect(localStorage.length).toBe(0);
  });
  it('reports conflicts instead of pretending changes were saved',async () => {
    fetchMock.mockResolvedValueOnce(json({version:1,snapshot:{courseId:'10',nodes:[],edges:[],viewport:{x:0,y:0,zoom:1},courseTitle:'Test',updatedAt:0}}));
    const snapshot = await loadCanvasSnapshot('10');
    fetchMock.mockResolvedValueOnce(json({detail:'Canvas version conflict'},409));
    await expect(saveCanvasSnapshot(snapshot!)).rejects.toThrow('Canvas version conflict');
  });
  it('uses actual AI proposal text and citations',async () => {
    fetchMock.mockResolvedValueOnce(json({nodes:[{kind:'lesson',title:'Проверка давления',description:'Проверить 8 бар',source_ref_ids:[17]}],summary:'Предложен урок'}));
    const anchor=createCanvasNode('module',{x:0,y:0},{title:'Модуль'});
    const result=await requestAiAction({courseId:'9',action:'split_module',selectedNodes:[anchor]});
    expect(result.nodes[0].data.title).toBe('Проверка давления');
    expect(result.nodes[0].data.description).toContain('[chunk:17]');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/courses/9/ai/actions');
  });
  it('preserves editable nodes and selection when AI returns a local notice',async () => {
    const node = createCanvasNode('module',{x:0,y:0},{title:'Материал пользователя'});
    useCanvasStore.setState({courseId:'9',nodes:[node],edges:[],selectedNodeIds:[node.id],selectedEdgeIds:[],lastError:null});
    fetchMock.mockResolvedValueOnce(json({nodes:[],summary:'Доступно ручное редактирование.',degraded:true}));
    await useCanvasStore.getState().runAiAction('split_module');
    const state = useCanvasStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].data.title).toBe('Материал пользователя');
    expect(state.selectedNodeIds).toEqual([node.id]);
    expect(state.edges).toEqual([]);
    expect(state.lastError).toBeNull();
    expect(state.isAiRunning).toBe(false);
    expect(state.aiNotice).toBe('Доступно ручное редактирование.');
  });
});
