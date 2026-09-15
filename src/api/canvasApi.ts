import type { CanvasSnapshot, CanvasNodeType } from '@/types/canvas';
import { api } from '@/shared/api';
import { createCanvasNode } from '@/utils/nodeFactory';
import { createCanvasEdge } from '@/utils/edgeFactory';
const versions = new Map<string, number>();
// Course IDs are global. Keep the revision across access-token renewal.
const key = (id: string) => id;
type Workspace = {version: number; snapshot: CanvasSnapshot | null; course_title?: string};
type Graph = {nodes: {id: string; type: string; label?: string; title?: string; description?: string; position?: {x:number;y:number}}[];
 edges: {source: string; target: string; relation?: string}[]; updated_at: string | null};
export async function loadCanvasSnapshot(courseId: string): Promise<CanvasSnapshot | null> {
  const {data} = await api.get<Workspace>(`/courses/${courseId}/workspace`);
  versions.set(key(courseId),data.version);
  if (data.snapshot) return data.snapshot;
  const graph = (await api.get<Graph>(`/courses/${courseId}/canvas`)).data;
  if (!graph.nodes.length) return null;
  const nodes = graph.nodes.map((n,i) => {
    const type = (n.type === 'task' ? 'practice' : n.type) as CanvasNodeType;
    const node = createCanvasNode(type,n.position ?? {x:(i%4)*300,y:Math.floor(i/4)*200},
      {title:n.label ?? n.title ?? n.id,description:n.description ?? '',status:'ready'});
    return {...node,id:n.id,data:{...node.data,id:n.id}};
  });
  return {courseId,courseTitle:data.course_title ?? `Курс ${courseId}`,nodes,
    edges:graph.edges.map(e => createCanvasEdge(e.source,e.target,e.relation === 'contains' ? 'contains' : e.relation === 'requires' ? 'prerequisite' : 'next')),
    viewport:{x:100,y:100,zoom:0.8},updatedAt:graph.updated_at ? Date.parse(graph.updated_at) : 0};
}
export async function saveCanvasSnapshot(snapshot: CanvasSnapshot): Promise<void> {
  const version = versions.get(key(snapshot.courseId));
  if (version === undefined) throw new Error('Перезагрузите канву перед сохранением');
  const {data} = await api.put<Workspace>(`/courses/${snapshot.courseId}/workspace`,{version,snapshot});
  versions.set(key(snapshot.courseId),data.version);
}
