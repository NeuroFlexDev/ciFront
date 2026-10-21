import { StrictMode } from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TextEditor from '../Components/ElementUi/TextEditor/TextEditor';
afterEach(cleanup);
it('mounts and switches document content without emitting a user edit',async()=>{
  const onChange=vi.fn();
  const {container,rerender}=render(<StrictMode><TextEditor value="<p>Первый урок</p>" onChange={onChange}/></StrictMode>);
  await waitFor(()=>expect(container.querySelector('[contenteditable=true]')).toHaveTextContent('Первый урок'));
  rerender(<StrictMode><TextEditor value="<p>Второй урок</p>" onChange={onChange}/></StrictMode>);
  await waitFor(()=>expect(container.querySelector('[contenteditable=true]')).toHaveTextContent('Второй урок'));
  expect(onChange).not.toHaveBeenCalled();
});
