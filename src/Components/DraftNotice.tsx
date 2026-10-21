import {useSyncExternalStore} from 'react';
import {downloadDrafts,draftStorageError} from '@/shared/drafts';
import './requestState.css';
const subscribe=(listener:()=>void)=>{window.addEventListener('lernium-drafts-changed',listener);return()=>window.removeEventListener('lernium-drafts-changed',listener);};
export default function DraftNotice({restored=false}:{restored?:boolean}){
  const error=useSyncExternalStore(subscribe,draftStorageError,()=> '');
  return <aside className={`draft-notice ${error?'draft-notice--error':''}`} role={error?'alert':'status'}>
    {error|| (restored?'Восстановлен несохранённый черновик. Проверьте его и сохраните на сервере.':'Изменения сохраняются в черновик на этом устройстве. Для публикации сохраните их на сервере.')}
    <button type="button" onClick={downloadDrafts}>Скачать копию черновиков</button>
  </aside>;
}
