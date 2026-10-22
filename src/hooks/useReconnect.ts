import {useEffect,useLayoutEffect,useRef} from 'react';

/** Only idempotent reads subscribe here; a failed write always needs an explicit retry. */
export function useReconnect(retry:()=>void) {
  const ref=useRef(retry);
  // Session renewal can arrive after a commit but before passive effects run.
  // Publish the callback for the committed UI before processing that event.
  useLayoutEffect(()=>{ref.current=retry;},[retry]);
  useEffect(()=>{
    const listener=()=>ref.current();
    window.addEventListener('online',listener);
    window.addEventListener('lernium-session-renewed',listener);
    window.addEventListener('lernium-retry-reads',listener);
    return()=>{
      window.removeEventListener('online',listener);
      window.removeEventListener('lernium-session-renewed',listener);
      window.removeEventListener('lernium-retry-reads',listener);
    };
  },[]);
}
