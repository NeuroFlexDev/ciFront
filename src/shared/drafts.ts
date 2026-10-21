/** Local recovery copies are scoped to an authenticated user and a browser tab.
 * Mutations never replay automatically. Server revisions still guard every save.
 */
export type Draft<T>={value:T;updatedAt:number;baseRevision?:number;storageKey:string};
const PREFIX='lernium-draft:v1:';
let owner:number|null=null;
let tab:string|undefined;
let storageError='';
const memory=new Map<string,Draft<unknown>>();
export function setDraftOwner(id:number|null){owner=id;storageError='';notify();}
export function getDraftOwner(){return owner;}
const notify=()=>window.dispatchEvent(new Event('lernium-drafts-changed'));
function tabId(){
  if(tab)return tab;
  try{tab=sessionStorage.getItem('lernium-draft-tab')||crypto.randomUUID();sessionStorage.setItem('lernium-draft-tab',tab);}
  catch{tab=crypto.randomUUID();}
  return tab;
}
function prefix(resource:string,id=owner){return id===null?null:`${PREFIX}${id}:${encodeURIComponent(resource)}:`;}
function entries(start:string):Draft<unknown>[] {
  const records=new Map<string,Draft<unknown>>();
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith(start))continue;
      try{const record=JSON.parse(localStorage.getItem(key)||'null');if(record&&typeof record.updatedAt==='number'&&'value' in record)records.set(key,{...record,storageKey:key});}
      catch{/* Keep corrupt records for explicit export/recovery; never overwrite a different tab. */}
    }
  }catch{storageError='Браузер запретил хранение черновиков.';}
  memory.forEach((value,key)=>{if(key.startsWith(start))records.set(key,value);});
  return Array.from(records.values()).sort((a,b)=>b.updatedAt-a.updatedAt);
}
export function readDraft<T>(resource:string,id=owner):Draft<T>|null {
  const start=prefix(resource,id);if(!start)return null;
  const list=entries(start);
  return (list.find(r=>r.storageKey===start+tabId())??list[0]??null) as Draft<T>|null;
}
export function writeDraft<T>(resource:string,value:T,baseRevision?:number,id=owner):boolean {
  const start=prefix(resource,id);if(!start)return false;
  const storageKey=start+tabId();const record={value,baseRevision,updatedAt:Date.now(),storageKey};
  memory.set(storageKey,record);
  try{localStorage.setItem(storageKey,JSON.stringify(record));storageError='';notify();return true;}
  catch{storageError='Не удалось записать черновик на этом устройстве. Не закрывайте вкладку: скачайте копию или сохраните изменения на сервере.';notify();return false;}
}
/** Remove only a matching value: an in-flight save must never erase newer typing. */
export function clearDraft<T>(resource:string,savedValue:T,id=owner){
  const start=prefix(resource,id);if(!start)return;
  const serialized=JSON.stringify(savedValue);
  for(const record of entries(start)){
    if(JSON.stringify(record.value)!==serialized)continue;
    try{localStorage.removeItem(record.storageKey);memory.delete(record.storageKey);}catch{/* Recovery copy can remain safely. */}
  }
  notify();
}
export function draftStorageError(){return storageError;}
export function downloadDrafts(){
  if(owner===null)return;
  const records=entries(`${PREFIX}${owner}:`);
  const url=URL.createObjectURL(new Blob([JSON.stringify({format:'lernium-recovery-v1',exportedAt:new Date().toISOString(),drafts:records},null,2)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='lernium-drafts.json';anchor.click();URL.revokeObjectURL(url);
}
