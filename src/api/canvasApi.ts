import type { CanvasSnapshot } from '@/types/canvas';

const STORAGE_PREFIX = 'lernium_canvas';

function storageKey(courseId: string) {
  return `${STORAGE_PREFIX}:${courseId}`;
}

export async function loadCanvasSnapshot(courseId: string): Promise<CanvasSnapshot | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey(courseId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CanvasSnapshot;
  } catch {
    window.localStorage.removeItem(storageKey(courseId));
    return null;
  }
}

export async function saveCanvasSnapshot(snapshot: CanvasSnapshot): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey(snapshot.courseId), JSON.stringify(snapshot));
}
