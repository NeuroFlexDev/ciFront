import { api, apiFetch, assertAuthSession, captureAuthSession } from '@/shared/api';
import { ApiError } from '@/shared/errors';

export type ExportFormat = 'zip' | 'pdf';
export type ExportSelection = {
  course_version_id: number; snapshot_sha256: string; include_sources: boolean;
  include_answer_keys: boolean; confirm_transfer: boolean; confirm_private_materials: boolean;
};
type PDFPlan = {
  course_version_id: number; snapshot_sha256: string;
  diagrams: { id: string; kind: string; source: string }[];
};

/** Generate from the owner-confirmed immutable edition; never borrow a new session. */
export async function exportCourse(format: ExportFormat, selection: ExportSelection): Promise<Blob> {
  const session = captureAuthSession();
  let diagrams: { id: string; svg: string }[] = [];
  const payload = { ...selection, include_sources: format === 'pdf' ? false : selection.include_sources };
  if (format === 'pdf') {
    const { data: plan } = await api.post<PDFPlan>('/team/course-transfers/pdf-plan', payload);
    assertAuthSession(session);
    if (plan.course_version_id !== selection.course_version_id || plan.snapshot_sha256 !== selection.snapshot_sha256 ||
        !Array.isArray(plan.diagrams) || plan.diagrams.length > 80) {
      throw new ApiError('Состав PDF не совпал с выбранной версией. Обновите список версий.', 409, 'invalid_response');
    }
    if (plan.diagrams.length) {
      const { renderDiagram } = await import('@/shared/diagrams');
      diagrams = [];
      for (const diagram of plan.diagrams) {
        assertAuthSession(session);
        const result = await renderDiagram(diagram.source, diagram.kind, { theme: 'print' });
        assertAuthSession(session);
        diagrams.push({ id: diagram.id, svg: result.svg });
      }
    }
  }
  assertAuthSession(session);
  const response = await apiFetch(`/team/course-transfers/${format === 'pdf' ? 'export.pdf' : 'export'}`, {
    method: 'POST', body: JSON.stringify(format === 'pdf' ? { ...payload, diagrams } : payload),
  });
  if (!response.ok) {
    let message = 'Не удалось подготовить пакет курса.';
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') message = data.detail;
    } catch { /* Keep the actionable generic error. */ }
    assertAuthSession(session);
    throw new ApiError(message, response.status, 'http');
  }
  const expectedType = format === 'pdf' ? 'application/pdf' : 'application/zip';
  if (!response.headers.get('content-type')?.startsWith(expectedType)) {
    throw new ApiError('Сервер вернул неверный формат файла. Скачивание отменено.', 502, 'invalid_response');
  }
  const bytes = await response.arrayBuffer();
  assertAuthSession(session);
  if (!bytes.byteLength || (format === 'pdf' && new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')) {
    throw new ApiError('Сервер вернул неполный файл. Повторите экспорт.', 502, 'invalid_response');
  }
  return new Blob([bytes], { type: expectedType });
}
