import {useEffect, useRef, type RefObject} from 'react';

const activeDialogs: HTMLElement[] = [];

/** Keep keyboard focus inside the foremost dialog and restore it when dismissed. */
export function useDialogFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  {active = true, busy = false, onClose}: {active?: boolean; busy?: boolean; onClose?: () => void},
) {
  const current = useRef({busy, onClose});
  current.current = {busy, onClose};
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    activeDialogs.push(element);
    const isTop = () => activeDialogs.at(-1) === element;
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, a[href], summary, [tabindex]',
    )).filter(item => item.tabIndex >= 0 && !item.matches(':disabled') &&
      !item.closest('[hidden], [inert], [aria-hidden="true"]'));
    const focusFirst = () => (controls()[0] ?? element).focus();
    focusFirst();
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!current.current.busy) current.current.onClose?.();
      }
      if (event.key !== 'Tab') return;
      const list = controls();
      if (!list.length) {event.preventDefault(); element.focus(); return;}
      if (event.shiftKey && (document.activeElement === list[0] || document.activeElement === element)) {
        event.preventDefault(); list.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === list.at(-1)) {
        event.preventDefault(); list[0].focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (isTop() && !element.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      activeDialogs.splice(activeDialogs.lastIndexOf(element), 1);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      if (previous?.isConnected) previous.focus();
    };
  }, [active, ref]);
}
