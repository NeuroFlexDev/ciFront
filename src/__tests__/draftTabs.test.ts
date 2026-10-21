import {afterEach,expect,it,vi} from 'vitest';

afterEach(()=>{localStorage.clear();sessionStorage.clear();vi.resetModules();});

it('keeps independent edits when a browser duplicates sessionStorage and later reloads a tab',async()=>{
  vi.resetModules();const original=await import('@/shared/drafts');
  original.writeDraft('lesson:1','Original tab draft',7,450);
  const firstKey=original.readDraft('lesson:1',450)!.storageKey;
  // A duplicated browser tab starts with a copy of sessionStorage but a new JS document.
  vi.resetModules();const duplicate=await import('@/shared/drafts');
  expect(duplicate.readDraft('lesson:1',450)?.value).toBe('Original tab draft');
  duplicate.writeDraft('lesson:1','Duplicated tab draft',7,450);
  expect(duplicate.readDraft('lesson:1',450)?.storageKey).not.toBe(firstKey);
  expect(original.readDraft('lesson:1',450)?.value).toBe('Original tab draft');
  original.writeDraft('lesson:1','New original edit',7,450);
  vi.resetModules();const reloaded=await import('@/shared/drafts');
  expect(reloaded.readDraft('lesson:1',450)?.value).toBe('Duplicated tab draft');
  reloaded.clearDraft('lesson:1','Duplicated tab draft',450);
  expect(original.readDraft('lesson:1',450)?.value).toBe('New original edit');
});
