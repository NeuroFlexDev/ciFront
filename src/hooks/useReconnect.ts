import {useEffect,useRef} from 'react';

/** Only idempotent reads subscribe here; a failed write always needs an explicit retry. */
export function useReconnect(retry:()=>void) {
  const ref=useRef(retry);
  useEffect(()=>{ref.current=retry;},[retry]);
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
