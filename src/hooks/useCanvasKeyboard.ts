import { useEffect } from 'react';

type CanvasKeyboardOptions = {
  onCreateNode: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSave: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
      || target.closest('[contenteditable="true"]') !== null
    );
}

export function useCanvasKeyboard({
  onCreateNode,
  onDelete,
  onDuplicate,
  onSave,
}: CanvasKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        onDuplicate();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDelete();
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        onCreateNode();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreateNode, onDelete, onDuplicate, onSave]);
}
