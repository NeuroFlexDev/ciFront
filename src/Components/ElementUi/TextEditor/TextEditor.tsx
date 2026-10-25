import { Extension, Node as TiptapNode } from '@tiptap/core';
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { DOMSerializer } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Eraser,
  Minus,
  Table2,
  Sigma,
  Code2,
  ChevronDown,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import MarkdownContent from '@/Components/MarkdownContent';
import {
  decodeSource,
  encodeSource,
  validLink,
  type SourceDocument,
  type SourceFormat,
} from './sourceCodec';
import { useEditorCopy } from './editorCopy';
import styles from './styles.module.css';

function SourceBlockView({ node, editor, updateAttributes }: NodeViewProps) {
  const t = useEditorCopy();
  const [editing, setEditing] = useState(false);
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const sync = () => setEditable(editor.isEditable);
    editor.on('update', sync);
    return () => {
      editor.off('update', sync);
    };
  }, [editor]);
  const raw = String(node.attrs.raw ?? '');
  const html = node.attrs.kind === 'html';
  const title = html
    ? 'HTML-блок'
    : /^\s*(?:```|~~~)(?:mermaid|plantuml|puml)/i.test(raw)
      ? 'Схема'
      : node.attrs.kind === 'table'
        ? 'Таблица'
        : /\$/.test(raw)
          ? 'Формула'
          : /!\[/.test(raw)
            ? 'Изображение'
            : 'Специальный блок';
  return (
    <NodeViewWrapper className={styles.sourceBlock} contentEditable={false}>
      <div className={styles.blockHeader}>
        <span>{t(title)}</span>
        <button
          type='button'
          className={styles.blockAction}
          disabled={!editable}
          onClick={() => setEditing((value) => !value)}
          aria-expanded={editing}
        >
          {editing ? <Check size={15} /> : <Pencil size={15} />}{' '}
          {t(editing ? 'Готово' : 'Редактировать исходник блока')}
        </button>
      </div>
      {editing ? (
        <textarea
          className={styles.blockSource}
          aria-label={t('Исходный текст блока')}
          value={raw}
          disabled={!editable}
          rows={Math.min(16, Math.max(4, raw.split('\n').length))}
          onChange={(event) => {
            if (editor.isEditable) updateAttributes({ raw: event.target.value });
          }}
          onKeyDown={(event) => event.stopPropagation()}
        />
      ) : html && node.attrs.format === 'html' ? (
        <div
          className={styles.blockPreview}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(raw) }}
        />
      ) : html ? (
        <div className={styles.blockPreview}>
          <p className={styles.hint}>
            {t('HTML сохранён в исходнике; выполнение разметки отключено.')}
          </p>
          <pre>{raw}</pre>
        </div>
      ) : (
        <div className={styles.blockPreview}>
          <MarkdownContent>{raw}</MarkdownContent>
        </div>
      )}
    </NodeViewWrapper>
  );
}
const SourceLink = Link.extend({
  addAttributes() {
    return { ...this.parent?.(), title: { default: null } };
  },
});
const SourceBlock = TiptapNode.create({
  name: 'sourceBlock',
  group: 'block',
  atom: true,
  selectable: true,
  isolating: true,
  addAttributes() {
    return Object.fromEntries(
      ['raw', 'kind', 'format'].map((name) => [
        name,
        {
          default: name === 'raw' ? '' : name === 'kind' ? 'special' : 'markdown',
          parseHTML: (element: HTMLElement) => element.getAttribute(`data-source-${name}`),
          renderHTML: (attributes: Record<string, unknown>) => ({
            [`data-source-${name}`]: String(attributes[name] ?? ''),
          }),
        },
      ]),
    );
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-source-block]',
        getAttrs: (element) =>
          element.hasAttribute('data-source-raw') &&
          ['markdown', 'html'].includes(element.getAttribute('data-source-format') ?? '')
            ? {}
            : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-source-block': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SourceBlockView);
  },
});
const SourceMetadata = Extension.create({
  name: 'sourceMetadata',
  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'blockquote',
          'bulletList',
          'orderedList',
          'codeBlock',
          'horizontalRule',
          'sourceBlock',
        ],
        attributes: {
          source: { default: null, rendered: false },
          leading: { default: null, rendered: false },
          originalFingerprint: { default: null, rendered: false },
          previousFingerprint: { default: null, rendered: false },
        },
      },
      {
        types: ['codeBlock'],
        attributes: {
          sourceCodeMeta: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-source-code-meta'),
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.sourceCodeMeta
                ? { 'data-source-code-meta': String(attributes.sourceCodeMeta) }
                : {},
          },
        },
      },
    ];
  },
});
export type TextEditorHandle = { insertMarkdown: (source: string) => boolean };
type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  format?: SourceFormat;
  disabled?: boolean;
  documentKey?: string | number;
  ariaLabel?: string;
};

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(function TextEditor(
  { value, onChange, format = 'html', disabled = false, documentKey, ariaLabel },
  ref,
) {
  const t = useEditorCopy();
  const [mode, setMode] = useState<'visual' | 'source' | 'preview'>('visual');
  const [link, setLink] = useState<{ from: number; to: number; url: string; text: string } | null>(
    null,
  );
  const [linkError, setLinkError] = useState(false);
  const [, refreshControls] = useState(0);
  const sourceInput = useRef<HTMLTextAreaElement>(null);
  const source = useRef<SourceDocument | null>(null);
  const loaded = useRef<string | null>(null);
  const hydratedEditor = useRef<object | null>(null);
  const hydrating = useRef(true);
  const latest = useRef({ value, onChange, disabled, documentKey });
  latest.current = { value, onChange, disabled, documentKey };
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const emit = (next: string) => {
    if (!alive.current || latest.current.disabled || next === latest.current.value) return;
    latest.current = { ...latest.current, value: next };
    latest.current.onChange(next);
  };
  const emitRef = useRef(emit);
  emitRef.current = emit;
  const editor = useEditor(
    {
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({ link: false, underline: false, trailingNode: false }),
        SourceLink.configure({
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: null },
        }),
        ...(format === 'html'
          ? [
              TextStyle,
              FontFamily,
              Color,
              Underline,
              TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: null }),
            ]
          : []),
        SourceBlock,
        SourceMetadata,
      ],
      content: '',
      editable: false,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': ariaLabel ?? t('Текст урока'),
          'data-placeholder': t('Начните писать текст урока…'),
        },
      },
      onUpdate: ({ editor: current }) => {
        if (!source.current || hydrating.current) return;
        const next = encodeSource(current.getJSON(), source.current, (block) => {
          if (block.type === 'sourceBlock') return String(block.attrs?.raw ?? '');
          const wrapper = document.createElement('div');
          wrapper.appendChild(
            DOMSerializer.fromSchema(current.schema).serializeNode(
              current.schema.nodeFromJSON(block),
            ),
          );
          return wrapper.innerHTML;
        });
        loaded.current = next;
        emitRef.current(next);
      },
      onTransaction: ({ transaction }) => {
        if (transaction.docChanged)
          setLink((previous) =>
            previous
              ? {
                  ...previous,
                  from: transaction.mapping.map(previous.from, -1),
                  to: transaction.mapping.map(previous.to, 1),
                }
              : null,
          );
      },
    },
    [format, documentKey],
  );
  useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      (hydratedEditor.current === editor &&
        loaded.current === value &&
        source.current?.format === format)
    )
      return;
    const document = decodeSource(value, format, editor.schema);
    let cancelled = false;
    hydrating.current = true;
    editor.setEditable(false, false);
    // React node views flush synchronously; hydration must run outside an effect.
    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed || !alive.current) return;
      source.current = document;
      // External documents start their own undo history. Undo must never restore
      // another lesson or erase the initial server document.
      editor.view.updateState(
        EditorState.create({
          schema: editor.schema,
          doc: editor.schema.nodeFromJSON(document.document),
          plugins: editor.state.plugins,
        }),
      );
      hydratedEditor.current = editor;
      loaded.current = value;
      hydrating.current = false;
      editor.setEditable(!latest.current.disabled);
      setLink(null);
      refreshControls((count) => count + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [value, format, editor, documentKey]);
  useEffect(() => {
    if (editor && !editor.isDestroyed && !hydrating.current) editor.setEditable(!disabled);
  }, [editor, disabled]);
  const label = ariaLabel ?? t('Текст урока');
  useEffect(() => {
    if (editor && !editor.isDestroyed)
      editor.setOptions({
        editorProps: {
          attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
        },
      });
  }, [editor, label]);

  const insertMarkdown = (markdown: string) => {
    if (
      !editor ||
      editor.isDestroyed ||
      hydrating.current ||
      latest.current.disabled ||
      format !== 'markdown' ||
      !alive.current
    )
      return false;
    if (mode === 'source' && sourceInput.current) {
      const input = sourceInput.current,
        identity = latest.current.documentKey;
      const start = input.selectionStart,
        end = input.selectionEnd;
      emit(latest.current.value.slice(0, start) + markdown + latest.current.value.slice(end));
      requestAnimationFrame(() => {
        if (
          !input.isConnected ||
          sourceInput.current !== input ||
          latest.current.documentKey !== identity
        )
          return;
        input.focus();
        input.setSelectionRange(start + markdown.length, start + markdown.length);
      });
    } else {
      setMode('visual');
      if (!markdown.trim())
        return editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      const fragment = decodeSource(markdown, 'markdown', editor.schema);
      editor
        .chain()
        .focus()
        .insertContent(fragment.document.content ?? [])
        .run();
    }
    return true;
  };
  useImperativeHandle(ref, () => ({ insertMarkdown }));
  if (!editor) return <div className={styles.container} aria-busy='true' />;
  const action = (
    name: string,
    icon: ReactNode,
    command: () => void,
    active = false,
    unavailable = false,
  ) => (
    <button
      type='button'
      className={styles.tool}
      title={t(name)}
      aria-label={t(name)}
      aria-pressed={active}
      disabled={disabled || hydrating.current || unavailable}
      onMouseDown={(event) => event.preventDefault()}
      onClick={command}
    >
      {icon}
    </button>
  );
  const openLink = () => {
    const { from, to } = editor.state.selection;
    setLink({
      from,
      to,
      url: editor.getAttributes('link').href ?? 'https://',
      text: editor.state.doc.textBetween(from, to, ' '),
    });
    setLinkError(false);
  };
  const applyLink = () => {
    if (!link || disabled) return;
    if (!validLink(link.url.trim())) {
      setLinkError(true);
      return;
    }
    const href = link.url.trim();
    if (link.from === link.to && !editor.isActive('link'))
      editor
        .chain()
        .focus()
        .setTextSelection({ from: link.from, to: link.to })
        .insertContent({
          type: 'text',
          text: link.text || href,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    else
      editor
        .chain()
        .focus()
        .setTextSelection({ from: link.from, to: link.to })
        .extendMarkRange('link')
        .setLink({ href })
        .run();
    setLink(null);
  };
  const style = editor.isActive('heading')
    ? 'heading-' + editor.getAttributes('heading').level
    : 'paragraph';
  return (
    <section className={styles.container}>
      <div className={styles.modeBar}>
        <div className={styles.modes} role='group' aria-label={t('Режим редактирования')}>
          {(
            [
              ['visual', 'Визуальный редактор'],
              ['source', 'Исходник'],
              ['preview', 'Предпросмотр'],
            ] as const
          ).map(([key, name]) => (
            <button
              type='button'
              key={key}
              aria-pressed={mode === key}
              onClick={() => {
                setMode(key);
                setLink(null);
              }}
            >
              {t(name)}
            </button>
          ))}
        </div>
        <span className={styles.count}>
          {t('Символов')}: {value.length.toLocaleString()}
        </span>
      </div>
      {mode === 'visual' && (
        <>
          <div className={styles.toolbar} role='toolbar' aria-label={t('Форматирование текста')}>
            <div className={styles.group}>
              {action(
                'Отменить',
                <Undo2 />,
                () => editor.chain().focus().undo().run(),
                false,
                !editor.can().undo(),
              )}
              {action(
                'Повторить',
                <Redo2 />,
                () => editor.chain().focus().redo().run(),
                false,
                !editor.can().redo(),
              )}
            </div>
            <div className={styles.group}>
              <div className={styles.selectWrap}>
                <select
                  aria-label={t('Стиль текста')}
                  value={style}
                  disabled={disabled}
                  onChange={(event) => {
                    const level = Number(event.target.value.split('-')[1]);
                    if (level)
                      editor
                        .chain()
                        .focus()
                        .setHeading({ level: level as 1 | 2 | 3 })
                        .run();
                    else editor.chain().focus().setParagraph().run();
                  }}
                >
                  <option value='paragraph'>{t('Обычный текст')}</option>
                  {[1, 2, 3].map((level) => (
                    <option key={level} value={`heading-${level}`}>
                      {t(`Заголовок ${level}`)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
            <div className={styles.group}>
              {action(
                'Полужирный',
                <Bold />,
                () => editor.chain().focus().toggleBold().run(),
                editor.isActive('bold'),
              )}
              {action(
                'Курсив',
                <Italic />,
                () => editor.chain().focus().toggleItalic().run(),
                editor.isActive('italic'),
              )}
              {format === 'html' &&
                action(
                  'Подчёркнутый',
                  <UnderlineIcon />,
                  () => editor.chain().focus().toggleUnderline().run(),
                  editor.isActive('underline'),
                )}
              {action(
                'Зачёркнутый',
                <Strikethrough />,
                () => editor.chain().focus().toggleStrike().run(),
                editor.isActive('strike'),
              )}
              {action(
                'Код',
                <Code />,
                () => editor.chain().focus().toggleCode().run(),
                editor.isActive('code'),
              )}
            </div>
            <div className={styles.group}>
              {action(
                'Маркированный список',
                <List />,
                () => editor.chain().focus().toggleBulletList().run(),
                editor.isActive('bulletList'),
              )}
              {action(
                'Нумерованный список',
                <ListOrdered />,
                () => editor.chain().focus().toggleOrderedList().run(),
                editor.isActive('orderedList'),
              )}
              {action(
                'Цитата',
                <Quote />,
                () => editor.chain().focus().toggleBlockquote().run(),
                editor.isActive('blockquote'),
              )}
            </div>
            <div className={styles.group}>
              {action('Ссылка', <LinkIcon />, openLink, editor.isActive('link'))}
              {action(
                'Блок кода',
                <Code2 />,
                () => editor.chain().focus().toggleCodeBlock().run(),
                editor.isActive('codeBlock'),
              )}
              {action('Разделитель', <Minus />, () =>
                editor.chain().focus().setHorizontalRule().run(),
              )}
              {action('Очистить форматирование', <Eraser />, () =>
                editor.chain().focus().unsetAllMarks().clearNodes().run(),
              )}
            </div>
            {format === 'markdown' && (
              <div className={styles.group}>
                {action('Таблица', <Table2 />, () =>
                  insertMarkdown('\n\n|  |  |\n| --- | --- |\n|  |  |\n\n'),
                )}
                {action('Формула', <Sigma />, () => insertMarkdown('\n\n$$\nx = y\n$$\n\n'))}
              </div>
            )}
          </div>
          {link && (
            <div
              className={styles.linkPanel}
              role='group'
              aria-label={t('Ссылка')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  setLink(null);
                  editor.commands.focus();
                }
              }}
            >
              {link.from === link.to && !editor.isActive('link') && (
                <label>
                  {t('Текст ссылки')}
                  <input
                    disabled={disabled}
                    value={link.text}
                    onChange={(event) => setLink({ ...link, text: event.target.value })}
                  />
                </label>
              )}
              <label>
                {t('Адрес ссылки')}
                <input
                  autoFocus
                  disabled={disabled}
                  type='url'
                  aria-invalid={linkError}
                  value={link.url}
                  onChange={(event) => {
                    setLink({ ...link, url: event.target.value });
                    setLinkError(false);
                  }}
                />
              </label>
              <div className={styles.linkActions}>
                <button
                  type='button'
                  className={styles.apply}
                  disabled={disabled}
                  onClick={applyLink}
                >
                  {t('Применить ссылку')}
                </button>
                {editor.isActive('link') && (
                  <button
                    type='button'
                    disabled={disabled}
                    onClick={() => {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run();
                      setLink(null);
                    }}
                  >
                    {t('Убрать ссылку')}
                  </button>
                )}
                <button
                  type='button'
                  aria-label={t('Отмена')}
                  onClick={() => {
                    setLink(null);
                    editor.commands.focus();
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              {linkError && (
                <p role='alert'>
                  {t('Введите адрес https://, http://, mailto:, tel: или относительную ссылку.')}
                </p>
              )}
            </div>
          )}
          <EditorContent className={styles.editor} editor={editor} />
        </>
      )}
      {mode === 'source' && (
        <div className={styles.sourceArea}>
          <label>
            {t(format === 'markdown' ? 'Текст урока (Markdown)' : 'Исходный HTML')}
            <textarea
              ref={sourceInput}
              className={styles.source}
              value={value}
              disabled={disabled}
              spellCheck={false}
              rows={18}
              onChange={(event) => emit(event.target.value)}
            />
          </label>
          <p className={styles.hint}>
            {t('Формулы, схемы и таблицы сохраняют исходную разметку.')}
          </p>
        </div>
      )}
      {mode === 'preview' && (
        <div className={styles.preview}>
          {format === 'markdown' ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />
          )}
        </div>
      )}
    </section>
  );
});
export default TextEditor;
