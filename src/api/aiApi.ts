import type { CanvasAiActionType, CanvasAiResult, CanvasNodeType, LerniumNode } from '@/types/canvas';
import { api } from '@/shared/api';
import { createCanvasEdge } from '@/utils/edgeFactory';
import { createCanvasNode } from '@/utils/nodeFactory';
type AiRequest = {courseId: string; action: CanvasAiActionType; selectedNodes: LerniumNode[]};
type Proposal = {nodes: {kind: CanvasNodeType; title: string; description: string; source_ref_ids: number[]}[];summary: string};
export async function requestAiAction({courseId,action,selectedNodes}: AiRequest): Promise<CanvasAiResult> {
  const anchor = selectedNodes[0];
  if (!anchor) throw new Error('Выберите узлы для работы с AI');
  const {data} = await api.post<Proposal>(`/courses/${courseId}/ai/actions`,{action,selected_nodes:selectedNodes.map(n => ({...n.data,id:n.id}))});
  const nodes = data.nodes.map((n,i) => createCanvasNode(n.kind,{x:anchor.position.x+320,y:anchor.position.y+i*180},
    {title:n.title,description:n.description + (n.source_ref_ids.length ? `\n\nИсточники: ${n.source_ref_ids.map(id => `[chunk:${id}]`).join(', ')}` : ''),status:'draft'}));
  return {nodes,edges:nodes.map(n => createCanvasEdge(anchor.id,n.id,action === 'generate_test' ? 'assesses' : 'contains')),summary:data.summary};
}
