import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { DOMParser as ProseMirrorParser, DOMSerializer } from '@tiptap/pm/model';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TextEditor from './TextEditor';

vi.mock('@/Components/DiagramBlock', () => ({ default: ({ source }: { source: string }) => <pre data-testid="diagram">{source}</pre> }));
vi.mock('@/shared/api', () => ({ apiFetch: vi.fn(() => Promise.reject(new Error('Synthetic image is not fetched'))) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const advanced = '\n\n$$\n\\frac{a}{b} = c\n$$\n\n~~~mermaid\nflowchart LR\nA --> B\n~~~\n\n![Original alt](/api/images/17/content "Original title")\n\n| First | Second |\n| :--- | ---: |\n| 1 | **2** |\n\n<div data-original="yes">Original HTML</div>\n\n[ref]: https://example.test "Title"\n';
function Controlled({ initial, disabled = false }: { initial: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return <><TextEditor format="markdown" value={value} onChange={setValue} disabled={disabled}/><output data-testid="source-value">{value}</output></>;
}
function engine() { return (screen.getByRole('textbox', { name: 'Текст урока' }) as HTMLElement & { editor: Editor }).editor; }

it('does not change any byte when opening and switching rich/source/preview modes', async () => {
  const source = '\r\n# Original title\r\n\r\nA  paragraph with __strong__ and *emphasis*.\r\n' + advanced;
  const onChange = vi.fn();
  render(<TextEditor format="markdown" value={source} onChange={onChange}/>);
  await screen.findByRole('textbox', { name: 'Текст урока' });
  fireEvent.scroll(screen.getByRole('textbox', { name: 'Текст урока' }).parentElement!, { target: { scrollTop: 180 } });
  fireEvent.click(screen.getByRole('button', { name: 'Исходник' }));
  expect(screen.getByRole('textbox', { name: 'Текст урока (Markdown)' })).toHaveValue(source.replaceAll('\r\n', '\n'));
  fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр' }));
  fireEvent.click(screen.getByRole('button', { name: 'Визуальный редактор' }));
  expect(onChange).not.toHaveBeenCalled();
});

it('edits a real rich-text paragraph and keeps every advanced source block byte-for-byte', async () => {
  render(<Controlled initial={'Original paragraph.' + advanced}/>);
  await screen.findByRole('textbox', { name: 'Текст урока' });
  const editor = engine();
  act(() => { editor.commands.insertContentAt({ from: 1, to: 20 }, 'Updated paragraph.'); });
  await waitFor(() => expect(screen.getByTestId('source-value').textContent).toBe('Updated paragraph.' + advanced));
  act(() => { editor.commands.setTextSelection({ from: 1, to: 8 }); editor.commands.toggleBold(); });
  expect(screen.getByTestId('source-value').textContent).toBe('**Updated** paragraph.' + advanced);
  act(() => editor.commands.undo());
  expect(screen.getByTestId('source-value').textContent).toBe('Updated paragraph.' + advanced);
});

it('edits only an advanced block through its exact source and preserves surrounding prose', async () => {
  render(<Controlled initial={'Untouched __prose__.\n\n$$\na+b\n$$\n\nFinal prose.\n'}/>);
  await screen.findByRole('textbox', { name: 'Текст урока' });
  fireEvent.click(screen.getByRole('button', { name: 'Редактировать исходник блока' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Исходный текст блока' }), { target: { value: '$$\na-b\n$$' } });
  expect(screen.getByTestId('source-value').textContent).toBe('Untouched __prose__.\n\n$$\na-b\n$$\n\nFinal prose.\n');
});

it('edits links inline, rejects executable URLs and never opens a browser prompt', async () => {
  const prompt = vi.spyOn(window, 'prompt');
  render(<Controlled initial="Existing text"/>);
  await screen.findByRole('textbox', { name: 'Текст урока' });
  fireEvent.click(screen.getByRole('button', { name: 'Ссылка' }));
  fireEvent.change(screen.getByLabelText('Адрес ссылки'), { target: { value: 'javascript:alert(1)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Применить ссылку' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Введите адрес');
  expect(screen.getByTestId('source-value')).toHaveTextContent('Existing text');
  expect(prompt).not.toHaveBeenCalled();
});

it('ignores editing events while disabled and does not emit on a server document replacement', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<TextEditor format="markdown" value="First" onChange={onChange} disabled/>);
  await screen.findByRole('textbox', { name: 'Текст урока' });
  expect(screen.getByRole('textbox', { name: 'Текст урока' })).toHaveAttribute('contenteditable', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Исходник' }));
  const input = screen.getByRole('textbox', { name: 'Текст урока (Markdown)' });
  expect(input).toBeDisabled();
  fireEvent.change(input, { target: { value: 'Unexpected change' } });
  rerender(<TextEditor format="markdown" value="Second" onChange={onChange} documentKey="second"/>);
  expect(input).toHaveValue('Second');
  expect(onChange).not.toHaveBeenCalled();
});

it('starts each external document with a clean undo history', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<TextEditor format="markdown" value="First lesson" onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.textContent).toBe('First lesson'));
  expect(screen.getByRole('button', { name: 'Отменить' })).toBeDisabled();
  act(() => engine().commands.insertContentAt(1, 'Updated '));
  expect(onChange).toHaveBeenCalledWith('Updated First lesson');
  rerender(<TextEditor format="markdown" value="Second lesson" onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.textContent).toBe('Second lesson'));
  expect(screen.getByRole('button', { name: 'Отменить' })).toBeDisabled();
  act(() => engine().commands.undo());
  expect(engine().state.doc.textContent).toBe('Second lesson');
});

it('keeps rich HTML and unsupported image attributes when another paragraph changes', async () => {
  const onChange = vi.fn();
  const source = '<p>Original paragraph</p><figure data-id="4"><img src="/api/images/4/content" alt="Original" width="320"><figcaption>Caption</figcaption></figure>';
  render(<TextEditor value={source} onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.textContent).toContain('Original paragraph'));
  act(() => engine().commands.insertContentAt(1, 'Updated '));
  expect(onChange).toHaveBeenLastCalledWith('<p>Updated Original paragraph</p><figure data-id="4"><img src="/api/images/4/content" alt="Original" width="320"><figcaption>Caption</figcaption></figure>');
});

it('keeps exact HTML bytes, comments, entities and quote choices in untouched blocks', async () => {
  const onChange = vi.fn();
  const rest = "\r\n<!--Original &copy;-->\r\n<figure data-original='yes'><img src='/api/images/4/content' width=320 alt='&copy;'></figure>\r\n<p><a href='https://example.test/a?x=1&amp;y=2'>Original &copy;</a></p>\r\n";
  render(<TextEditor value={'<p>Editable</p>' + rest} onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.textContent).toContain('Editable'));
  act(() => engine().commands.insertContentAt(1, 'Updated '));
  expect(onChange).toHaveBeenLastCalledWith('<p>Updated Editable</p>' + rest);
});

it('copies and pastes diagrams, math and tables without losing their exact source', async () => {
  render(<Controlled initial={'Intro' + advanced}/>);
  await waitFor(() => expect(engine().state.doc.firstChild?.textContent).toBe('Intro'));
  const editor = engine();
  const blocks = Array.from({ length: editor.state.doc.childCount }, (_, index) => editor.state.doc.child(index)).filter(node => node.type.name === 'sourceBlock');
  expect(blocks.length).toBeGreaterThanOrEqual(5);
  for (const block of blocks) {
    const host = document.createElement('div');
    host.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(block));
    const pasted = ProseMirrorParser.fromSchema(editor.schema).parse(host).firstChild;
    expect(pasted?.type.name).toBe('sourceBlock');
    expect(pasted?.attrs).toMatchObject({ raw: block.attrs.raw, kind: block.attrs.kind, format: 'markdown' });
    act(() => editor.commands.insertContentAt(editor.state.doc.content.size, pasted!.toJSON()));
    expect(screen.getByTestId('source-value').textContent).toContain(block.attrs.raw);
  }
  const invalid = document.createElement('div');
  invalid.innerHTML = '<div data-source-block></div>';
  expect(ProseMirrorParser.fromSchema(editor.schema).parse(invalid).firstChild?.type.name).not.toBe('sourceBlock');
});

it('keeps a selected formula when normalizing text formatting', async () => {
  render(<Controlled initial={'Before\n\n$$\nx = 1\n$$\n\nAfter'}/>);
  await waitFor(() => expect(engine().state.doc.firstChild?.textContent).toBe('Before'));
  act(() => engine().commands.setNodeSelection(engine().state.doc.firstChild!.nodeSize));
  fireEvent.click(screen.getByRole('button', { name: 'Очистить форматирование' }));
  expect(screen.getByTestId('source-value').textContent).toBe('Before\n\n$$\nx = 1\n$$\n\nAfter');
});

it('keeps code fence metadata through visual editing and clipboard serialization', async () => {
  render(<Controlled initial={'```js title="important.js" {2}\nconst count = 1;\n```'}/>);
  await waitFor(() => expect(engine().state.doc.firstChild?.type.name).toBe('codeBlock'));
  const editor = engine();
  act(() => editor.commands.insertContentAt(1, '// Updated\n'));
  expect(screen.getByTestId('source-value').textContent).toBe('```js title="important.js" {2}\n// Updated\nconst count = 1;\n```');
  const host = document.createElement('div');
  host.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(editor.state.doc.firstChild!));
  const pasted = ProseMirrorParser.fromSchema(editor.schema).parse(host).firstChild;
  expect(pasted?.attrs).toMatchObject({ language: 'js', sourceCodeMeta: 'title="important.js" {2}' });
  expect(pasted?.textContent).toBe('// Updated\nconst count = 1;');
});

it('retains attributes unsupported by the HTML prose schema through exact block editing', async () => {
  const onChange = vi.fn();
  const original = '<p>Editable</p><p title="Tooltip">Keep this tooltip</p><h2 title="Section">Heading</h2>';
  render(<TextEditor value={original} onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.firstChild?.textContent).toBe('Editable'));
  expect(engine().state.doc.child(1).type.name).toBe('sourceBlock');
  expect(engine().state.doc.child(2).type.name).toBe('sourceBlock');
  act(() => engine().commands.insertContentAt(1, 'Updated '));
  expect(onChange).toHaveBeenLastCalledWith(original.replace('<p>Editable', '<p>Updated Editable'));
});

it('retains link titles when editing the link text visually', async () => {
  render(<Controlled initial={'[Original](https://example.test "Tooltip")'}/>);
  await waitFor(() => expect(engine().state.doc.firstChild?.textContent).toBe('Original'));
  expect(engine().state.doc.firstChild?.firstChild?.marks[0].attrs.title).toBe('Tooltip');
  act(() => engine().commands.insertContentAt(4, 'updated'));
  expect(screen.getByTestId('source-value').textContent).toBe('[Oriupdatedginal](https://example.test "Tooltip")');
});

it('preserves a non-one ordered list after inserting prose before its original single-newline boundary', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<TextEditor format="markdown" value={'# Heading\n3. item\n'} onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.child(1).type.name).toBe('orderedList'));
  act(() => engine().commands.insertContentAt(engine().state.doc.firstChild!.nodeSize, { type: 'paragraph', content: [{ type: 'text', text: 'New paragraph' }] }));
  const saved = onChange.mock.lastCall![0];
  expect(saved).toBe('# Heading\n\nNew paragraph\n\n3. item\n');
  rerender(<TextEditor format="markdown" value={saved} documentKey="reopened" onChange={onChange}/>);
  await waitFor(() => expect(engine().state.doc.childCount).toBe(3));
  expect(engine().state.doc.child(2).type.name).toBe('orderedList');
  expect(engine().state.doc.child(2).attrs.start).toBe(3);
});
