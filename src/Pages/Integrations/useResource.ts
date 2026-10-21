import {useCallback, useEffect, useState} from 'react';
import {api} from '@/shared/api';
import {useReconnect} from '@/hooks/useReconnect';

export function useResource<T>(path:string|null) {
  const [data,setData]=useState<T|null>(null);
  const [error,setError]=useState<unknown>(null);
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  useReconnect(reload);
  useEffect(()=>{
    let active=true;
    if(!path){setLoading(false);return;}
    setLoading(true);setError(null);
    void api.get<T>(path).then(result=>{if(active)setData(result.data);}).catch(reason=>{if(active)setError(reason);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[path,revision]);
  return {data,error,loading,reload};
}
