import {useEffect,useRef,useState,type SetStateAction} from 'react';
import {useAuth} from '@/auth/useAuth';
import {readDraft,writeDraft,clearDraft} from '@/shared/drafts';

/** For fixed-key non-secret forms. Passwords and authentication tokens must not use this hook. */
export function useDurableState<T>(resource:string,initial:T){
  const {user}=useAuth();
  const id=user?.id??null;
  const key=`${id}:${resource}`;
  const [state,setState]=useState(()=>({key,value:readDraft<T>(resource,id)?.value??initial}));
  const current=useRef(state);
  if(state.key!==key){
    current.current={key,value:readDraft<T>(resource,id)?.value??initial};
    setState(current.current);
  }
  useEffect(()=>{
    const recover=()=>{
      const latest=readDraft<T>(resource,id);
      if(latest&&JSON.stringify(latest.value)!==JSON.stringify(current.current.value)){
        current.current={key,value:latest.value};setState(current.current);
      }
    };
    window.addEventListener('lernium-drafts-changed',recover);
    window.addEventListener('storage',recover);
    return()=>{window.removeEventListener('lernium-drafts-changed',recover);window.removeEventListener('storage',recover);};
  },[resource,id,key]);
  const update=(next:SetStateAction<T>)=>{
    const result=typeof next==='function'?(next as (p:T)=>T)(current.current.value):next;
    current.current={key,value:result};
    // Persist before React renders: navigation or a render crash cannot lose the last keystroke.
    writeDraft(resource,result,undefined,id);setState(current.current);
  };
  return [current.current.value,update,(savedValue:T=current.current.value)=>clearDraft(resource,savedValue,id)] as const;
}
