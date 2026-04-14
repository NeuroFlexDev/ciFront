import { useMemo } from 'react';

import { useCanvasStore } from '@/store/canvasStore';

export function useCanvasActions() {
  const createNode = useCanvasStore((state) => state.createNode);
  const createFrameFromSelection = useCanvasStore((state) => state.createFrameFromSelection);
  const clearFrameForSelection = useCanvasStore((state) => state.clearFrameForSelection);
  const deleteSelection = useCanvasStore((state) => state.deleteSelection);
  const duplicateSelection = useCanvasStore((state) => state.duplicateSelection);
  const saveCourse = useCanvasStore((state) => state.saveCourse);
  const runAiAction = useCanvasStore((state) => state.runAiAction);
  const requestFocusNode = useCanvasStore((state) => state.requestFocusNode);
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);

  return useMemo(() => ({
    createNode,
    createFrameFromSelection,
    clearFrameForSelection,
    deleteSelection,
    duplicateSelection,
    saveCourse,
    runAiAction,
    requestFocusNode,
    setInteractionMode,
  }), [
    clearFrameForSelection,
    createFrameFromSelection,
    createNode,
    deleteSelection,
    duplicateSelection,
    requestFocusNode,
    runAiAction,
    saveCourse,
    setInteractionMode,
  ]);
}
