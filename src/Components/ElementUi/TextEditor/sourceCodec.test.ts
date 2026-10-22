import { expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { markdownBlock } from './sourceCodec';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
type Parsed = { type: string; value?: string; url?: string; children?: Parsed[] };
type Character = { text: string; marks: string[] };
function parsedCharacters(node: Parsed, marks: string[] = []): Character[] {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return Array.from(node.value ?? '', text => ({ text, marks: [...marks, ...(node.type === 'inlineCode' ? ['code'] : [])].sort() }));
  }
  const mark = ({ strong: 'bold', emphasis: 'italic', delete: 'strike', link: `link:${node.url}` } as Record<string, string>)[node.type];
  return (node.children ?? []).flatMap(child => parsedCharacters(child, mark ? [...marks, mark] : marks));
}
function editorCharacters(nodes: JSONContent[]): Character[] {
  return nodes.flatMap(node => Array.from(node.text ?? '', text => ({
    text, marks: (node.marks ?? []).map(mark => mark.type === 'link' ? `link:${mark.attrs?.href}` : mark.type!).sort(),
  })));
}
const text = (value: string, ...marks: string[]): JSONContent => ({ type: 'text', text: value, marks: marks.map(type => ({ type })) });

it.each([
  ['math, entities, HTML and markdown literals', [text('Costs $5 and $10 today. Use &copy; verbatim <tag> _hello_ *world* [label](url) ~~strike~~ # title | column')]],
  ['leading and trailing whitespace inside bold', [text(' Hello ', 'bold'), text('world')]],
  ['adjacent nested marks', [text('one', 'italic'), text('two', 'bold', 'italic'), text('three', 'italic')]],
  ['adjacent nested marks in reverse order', [text('a', 'bold', 'italic'), text('b', 'italic')]],
  ['strikethrough and whitespace', [text('a ', 'strike'), text(' b ', 'italic', 'strike'), text('c')]],
  ['inline code delimiters', [text(' use `code` ', 'code'), text(' and '), text('**literal**', 'bold', 'code')]],
  ['literal entities', [text('&lt; &#32; &#x20; &copy;')]],
  ['links with parentheses and titles', [{ type: 'text', text: 'link <&>', marks: [{ type: 'link', attrs: { href: 'https://example.test/a_(b)?x=1&y=2', title: 'A "quoted" title' } }] }]],
] as [string, JSONContent[]][])('preserves visible characters and marks after %s is saved and parsed again', (_name, content) => {
  const encoded = markdownBlock({ type: 'paragraph', content });
  expect(parsedCharacters(parser.parse(encoded) as Parsed)).toEqual(editorCharacters(content));
});

it('retains code fence language and metadata when its contents change', () => {
  const encoded = markdownBlock({ type: 'codeBlock', attrs: { language: 'typescript', sourceCodeMeta: 'title="sample.ts" {2}' }, content: [text('const count = 2;\n```')] });
  expect(parser.parse(encoded).children[0]).toMatchObject({ type: 'code', lang: 'typescript', meta: 'title="sample.ts" {2}', value: 'const count = 2;\n```' });
});

it('retains ordered starts, nested lists, quotes and hard breaks', () => {
  const encoded = markdownBlock({ type: 'orderedList', attrs: { start: 4 }, content: [{ type: 'listItem', content: [
    { type: 'paragraph', content: [text('First'), { type: 'hardBreak' }, text('second line')] },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [text('Quoted &copy; $5')] }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('Nested')] }] }] },
  ] }] });
  const list = parser.parse(encoded).children[0];
  expect(list).toMatchObject({ type: 'list', ordered: true, start: 4, children: [{ type: 'listItem', children: [
    { type: 'paragraph', children: [{ type: 'text', value: 'First' }, { type: 'break' }, { type: 'text', value: 'second line' }] },
    { type: 'blockquote' }, { type: 'list', ordered: false },
  ] }] });
});

// GFM deliberately recognizes bare URLs as links, including escaped punctuation.
// Their visible text must still survive exactly.
it('retains literal URL text with the renderer’s existing GFM autolink behavior', () => {
  const value = 'www.example.test and user@example.test https://example.test';
  const parsed = parsedCharacters(parser.parse(markdownBlock({ type: 'paragraph', content: [text(value)] })) as Parsed);
  expect(parsed.map(character => character.text).join('')).toBe(value);
});
