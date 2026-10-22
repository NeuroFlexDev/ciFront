import type { JSONContent } from '@tiptap/core';
import { DOMParser as ProseMirrorParser, type Schema } from '@tiptap/pm/model';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { mathToMarkdown } from 'mdast-util-math';
import { parseFragment } from 'parse5';

export type SourceFormat = 'markdown' | 'html';
type Syntax = { type: string; value?: string; depth?: number; ordered?: boolean; start?: number; url?: string; title?: string | null; lang?: string | null; meta?: string | null; checked?: boolean | null; children?: Syntax[]; position?: { start: { offset?: number }; end: { offset?: number } } };
export type SourceDocument = { document: JSONContent; trailing: string; original: string; signature: string; format: SourceFormat };
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const important = new Set(['level', 'start', 'language', 'href', 'title', 'raw', 'kind', 'format', 'textAlign', 'color', 'fontFamily', 'sourceCodeMeta']);

/** Source metadata never influences the semantic fingerprint. */
export function fingerprint(node: JSONContent): string {
  const clean = (item: JSONContent): unknown => ({
    type: item.type,
    ...(item.text !== undefined ? { text: item.text } : {}),
    attrs: Object.fromEntries(Object.entries(item.attrs ?? {}).filter(([key, value]) => important.has(key) && value !== null && value !== undefined)),
    marks: item.marks?.map(mark => clean(mark)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    content: item.content?.map(clean),
  });
  return JSON.stringify(clean(node));
}

export function validLink(value: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value) && !Array.from(value).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127 || /\s/.test(character));
}

function convert(node: Syntax): JSONContent[] | null {
  if (node.type === 'text') return node.value ? [{ type: 'text', text: node.value }] : [];
  if (node.type === 'inlineCode') return [{ type: 'text', text: node.value ?? '', marks: [{ type: 'code' }] }];
  if (node.type === 'break') return [{ type: 'hardBreak' }];
  if (node.type === 'thematicBreak') return [{ type: 'horizontalRule' }];
  if (node.type === 'code') {
    if (['mermaid', 'plantuml', 'puml'].includes(node.lang?.toLowerCase() ?? '')) return null;
    return [{ type: 'codeBlock', attrs: { language: node.lang ?? null, sourceCodeMeta: node.meta ?? null }, content: node.value ? [{ type: 'text', text: node.value }] : [] }];
  }
  const supported: Record<string, string> = { paragraph: 'paragraph', heading: 'heading', listItem: 'listItem', blockquote: 'blockquote' };
  const mark = ({ strong: 'bold', emphasis: 'italic', delete: 'strike', link: 'link' } as Record<string, string>)[node.type];
  if (!supported[node.type] && node.type !== 'list' && !mark) return null;
  if (node.type === 'listItem' && node.checked !== undefined && node.checked !== null) return null;
  if (node.type === 'link' && !validLink(node.url ?? '')) return null;
  const children = (node.children ?? []).map(convert);
  if (children.some(child => child === null)) return null;
  const content = children.flat() as JSONContent[];
  if (mark) return content.map(child => ({ ...child, marks: [...(child.marks ?? []), { type: mark, ...(mark === 'link' ? { attrs: { href: node.url, title: node.title ?? null } } : {}) }] }));
  if (node.type === 'list') return [{ type: node.ordered ? 'orderedList' : 'bulletList', ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}), content }];
  return [{ type: supported[node.type], ...(node.type === 'heading' ? { attrs: { level: node.depth } } : {}), content }];
}

function opaque(raw: string, kind: string, format: SourceFormat): JSONContent {
  return { type: 'sourceBlock', attrs: { raw, kind, format } };
}
function seal(block: JSONContent, source: string, leading: string, schema: Schema): JSONContent {
  const normalized = schema.nodeFromJSON(block).toJSON() as JSONContent;
  return { ...normalized, attrs: { ...normalized.attrs, source, leading, originalFingerprint: fingerprint(normalized) } };
}

/** Parse supported prose, retaining exact source for every untouched top-level block. */
export function decodeSource(source: string, format: SourceFormat, schema: Schema): SourceDocument {
  const content: JSONContent[] = [];
  let end = 0;
  if (format === 'markdown') {
    const tree = parser.parse(source) as Syntax;
    for (const node of tree.children ?? []) {
      const start = node.position?.start.offset ?? end;
      const finish = node.position?.end.offset ?? start;
      const raw = source.slice(start, finish);
      const converted = convert(node);
      content.push(seal(converted?.[0] ?? opaque(raw, node.type === 'paragraph' ? 'special' : node.type, format), raw, source.slice(end, start), schema));
      end = finish;
    }
  } else {
    const fragment = parseFragment(source, { sourceCodeLocationInfo: true });
    const nodes = fragment.childNodes;
    // A browser can repair malformed HTML into implicit/overlapping elements.
    // Keep such input as a single exact-source block instead of guessing ranges.
    const ranges = nodes.map(node => node.sourceCodeLocation);
    const safe = ranges.every((range, index) => range && range.startOffset >= (index ? ranges[index - 1]!.endOffset : 0));
    if (!safe) {
      content.push(seal(opaque(source, 'html', format), source, '', schema));
      end = source.length;
    } else {
      for (const node of nodes) {
        const range = node.sourceCodeLocation!;
        const raw = source.slice(range.startOffset, range.endOffset);
        if (node.nodeName === '#text' && !raw.trim()) continue;
        const document = new DOMParser().parseFromString(raw, 'text/html');
        const allowed = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'B', 'EM', 'I', 'S', 'DEL', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'BR', 'HR', 'A']);
        const supported = node.nodeName !== '#comment' && Array.from(document.body.querySelectorAll('*')).every(element => allowed.has(element.tagName) && Array.from(element.attributes).every(attr => (element.tagName === 'A' ? ['href', 'title'] : element.tagName === 'OL' ? ['start'] : []).includes(attr.name)) && (element.tagName !== 'A' || validLink(element.getAttribute('href') ?? '')));
        const parsed = supported ? ProseMirrorParser.fromSchema(schema).parse(document.body).toJSON() as JSONContent : null;
        content.push(seal(parsed?.content?.length === 1 ? parsed.content[0] : opaque(raw, 'html', format), raw, source.slice(end, range.startOffset), schema));
        end = range.endOffset;
      }
    }
  }
  const blocks = content.map((block, index) => ({ ...block, attrs: { ...block.attrs, previousFingerprint: index ? fingerprint(content[index - 1]) : null } }));
  const document = schema.nodeFromJSON({ type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] }).toJSON() as JSONContent;
  return { document, trailing: source.slice(end), original: source, signature: fingerprint(document), format };
}

type MarkdownNode = Parameters<typeof toMarkdown>[0];
function asMarkdown(node: JSONContent): MarkdownNode {
  const children = (node.content ?? []).map(asMarkdown);
  let converted: unknown;
  if (node.type === 'text') converted = { type: 'text', value: node.text ?? '' };
  else if (node.type === 'hardBreak') converted = { type: 'break' };
  else if (node.type === 'sourceBlock') converted = { type: 'html', value: String(node.attrs?.raw ?? '') };
  else if (node.type === 'heading') converted = { type: 'heading', depth: Number(node.attrs?.level ?? 2), children };
  else if (node.type === 'horizontalRule') converted = { type: 'thematicBreak' };
  else if (node.type === 'codeBlock') converted = { type: 'code', lang: node.attrs?.language ?? null, meta: node.attrs?.sourceCodeMeta ?? null, value: (node.content ?? []).map(item => item.text ?? '').join('') };
  else if (node.type === 'bulletList' || node.type === 'orderedList') converted = { type: 'list', ordered: node.type === 'orderedList', start: Number(node.attrs?.start ?? 1), children };
  else converted = { type: node.type === 'doc' ? 'root' : node.type, children };
  for (const mark of [...(node.marks ?? [])].reverse()) {
    if (mark.type === 'code') converted = { type: 'inlineCode', value: node.text ?? '' };
    else if (mark.type === 'link') converted = { type: 'link', url: String(mark.attrs?.href ?? ''), title: mark.attrs?.title ?? null, children: [converted] };
    else {
      const type = ({ bold: 'strong', italic: 'emphasis', strike: 'delete' } as Record<string, string>)[mark.type];
      if (type) converted = { type, children: [converted] };
    }
  }
  return converted as MarkdownNode;
}

/** Standards-based serialization includes GFM/math escaping and delimiter rules. */
export function markdownBlock(node: JSONContent): string {
  if (node.type === 'sourceBlock') return String(node.attrs?.raw ?? '');
  return toMarkdown(asMarkdown(node), { extensions: [gfmToMarkdown(), mathToMarkdown()], bullet: '-', emphasis: '*', fences: true }).replace(/\n$/, '');
}

/** Only blocks actually edited are serialized; untouched math/HTML/assets remain byte-for-byte. */
export function encodeSource(document: JSONContent, original: SourceDocument, htmlBlock?: (node: JSONContent) => string): string {
  if (fingerprint(document) === original.signature) return original.original;
  const blocks = document.content ?? [];
  return blocks.map((block, index) => {
    const untouched = block.attrs?.originalFingerprint === fingerprint(block);
    const raw = untouched ? String(block.attrs?.source ?? '') : original.format === 'html' && htmlBlock ? htmlBlock(block) : markdownBlock(block);
    let leading = block.attrs?.leading !== null && block.attrs?.leading !== undefined ? String(block.attrs.leading) : index ? original.format === 'markdown' ? '\n\n' : '' : '';
    // Retain original spacing while its preceding block is unchanged. Inserted,
    // moved or rewritten neighbors may require a blank line: e.g. an ordered
    // list starting at 3 cannot interrupt an ordinary paragraph with one LF.
    if (index && original.format === 'markdown' && block.attrs?.previousFingerprint !== fingerprint(blocks[index - 1]) && !/\r?\n[ \t]*\r?\n/.test(leading)) {
      leading = leading.includes('\n') ? leading + (leading.includes('\r\n') ? '\r\n' : '\n') : '\n\n' + leading;
    }
    return (index && original.format === 'markdown' && !leading ? '\n\n' : leading) + raw;
  }).join('') + original.trailing;
}
