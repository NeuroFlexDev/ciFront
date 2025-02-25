import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback } from 'react'
import styles from './styles.module.css'
import slideIcon from '@/assets/icons/TextEditor/slideIcon.svg'
import prevIcon from '@/assets/icons/TextEditor/prevIcon.svg'
import nextIcon from '@/assets/icons/TextEditor/nextIcon.svg'
import dropdownArrowIcon from '@/assets/icons/TextEditor/dropdownArrowIcon.svg'
import boldIcon from '@/assets/icons/TextEditor/bold.svg'
import italicIcon from '@/assets/icons/TextEditor/italic.svg'
import underlineIcon from '@/assets/icons/TextEditor/underline.svg'
import strikethroughIcon from '@/assets/icons/TextEditor/strikethrough.svg'
import codeIcon from '@/assets/icons/TextEditor/code.svg'
import unorderedListIcon from '@/assets/icons/TextEditor/bulleted.svg'
import orderedListIcon from '@/assets/icons/TextEditor/numbered.svg'
import blockquoteIcon from '@/assets/icons/TextEditor/quotes.svg'
import leftAlignIcon from '@/assets/icons/TextEditor/alignLeft.svg'
import centerAlignIcon from '@/assets/icons/TextEditor/alignCenter.svg'
import rightAlignIcon from '@/assets/icons/TextEditor/alignRight.svg'
import justifyAlignIcon from '@/assets/icons/TextEditor/alignJustify.svg'
import clearFormatIcon from '@/assets/icons/TextEditor/clear.svg'
import linkIcon from '@/assets/icons/TextEditor/link.svg'

const fontFamilies = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']
const textFormats = [
  { value: 'paragraph', label: 'Обычный текст' },
  { value: 'heading-1', label: 'Заголовок' },
  { value: 'heading-2', label: 'Подзаголовок' },
]

const textColors = [
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
]

const textAlignments = [
  { value: 'left', icon: leftAlignIcon, alt: 'Left' },
  { value: 'center', icon: centerAlignIcon, alt: 'Center' },
  { value: 'right', icon: rightAlignIcon, alt: 'Right' },
  { value: 'justify', icon: justifyAlignIcon, alt: 'Justify' },
]

const TextEditor = () => {
  const [showFonts, setShowFonts] = useState(false)
  const [showFormats, setShowFormats] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showAlign, setShowAlign] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('paragraph')
  const [selectedFont, setSelectedFont] = useState('Arial')
  const [selectedColor, setSelectedColor] = useState('black')
  const [selectedAlignment, setSelectedAlignment] = useState('left')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        bulletList: {
          HTMLAttributes: { class: styles.ulList },
        },
        orderedList: {
          HTMLAttributes: { class: styles.olList },
        },
        blockquote: {
          HTMLAttributes: { class: styles.blockquote },
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: styles.link,
        },
      }),
      TextStyle,
      FontFamily,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
    ],
    content: '<p></p>',
    onUpdate: () => {
      // Обновление состояний на основе текущего форматирования
      if (editor?.isActive('heading-1')) setSelectedFormat('heading-1')
      else if (editor?.isActive('heading-2')) setSelectedFormat('heading-2')
      else setSelectedFormat('paragraph')

      setSelectedColor(editor?.getAttributes('textStyle').color || 'black')
      setSelectedFont(editor?.getAttributes('fontFamily')?.fontFamily || 'Arial')
      setSelectedAlignment(editor?.getAttributes('textAlign')?.textAlign || 'left')
    },
  })

  const toggleDropdown = useCallback((dropdown: 'fonts' | 'formats' | 'colors' | 'align') => {
    setShowFonts(dropdown === 'fonts' ? (prev) => !prev : false)
    setShowFormats(dropdown === 'formats' ? (prev) => !prev : false)
    setShowColors(dropdown === 'colors' ? (prev) => !prev : false)
    setShowAlign(dropdown === 'align' ? (prev) => !prev : false)
  }, [])

  const toggleInlineStyle = (style: string) => {
    switch (style) {
      case 'BOLD':
        editor?.chain().focus().toggleBold().run()
        break
      case 'ITALIC':
        editor?.chain().focus().toggleItalic().run()
        break
      case 'UNDERLINE':
        editor?.chain().focus().toggleUnderline().run()
        break
      case 'STRIKETHROUGH':
        editor?.chain().focus().toggleStrike().run()
        break
      case 'CODE':
        editor?.chain().focus().toggleCode().run()
        break
    }
  }

  const toggleBlockType = (blockType: string) => {
    switch (blockType) {
      case 'paragraph':
        editor?.chain().focus().setParagraph().run()
        break
      case 'heading-1':
        editor?.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case 'heading-2':
        editor?.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case 'unordered-list-item':
        editor?.chain().focus().toggleBulletList().run()
        break
      case 'ordered-list-item':
        editor?.chain().focus().toggleOrderedList().run()
        break
      case 'blockquote':
        editor?.chain().focus().toggleBlockquote().run()
        break
    }
    setSelectedFormat(blockType)
  }

  const handleFontChange = (font: string) => {
    editor?.chain().focus().setFontFamily(font).run()
    setSelectedFont(font)
    setShowFonts(false)
  }

  const handleTextColorChange = (color: string) => {
    editor?.chain().focus().setColor(color).run()
    setSelectedColor(color)
    setShowColors(false)
  }

  const handleTextAlignment = (alignment: string) => {
    editor?.chain().focus().setTextAlign(alignment).run()
    setSelectedAlignment(alignment)
    setShowAlign(false)
  }

  const handleClearStyles = () => {
    editor?.chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .setParagraph()
      .run()
  }

  const promptForLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Введите URL', previousUrl)

    if (url === null) return
    if (url === '') {
      editor?.chain().focus().unsetLink().run()
      return
    }

    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run()
  }, [editor])

  const handleSave = () => {
    const content = editor?.getJSON()
    console.log(JSON.stringify(content, null, 2))
  }

  if (!editor) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <img src={slideIcon} alt="" />
        <p className={styles.title}>Текстовый редактор</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.buttonGroup}>
          <button
            className={styles.buttonArrow}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <img src={prevIcon} alt="Undo" />
          </button>
          <button
            className={styles.buttonArrow}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <img src={nextIcon} alt="Redo" />
          </button>
        </div>

        {/* Форматы текста */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.button}
            onClick={() => toggleDropdown('formats')}
          >
            {textFormats.find((f) => f.value === selectedFormat)?.label}
            <img src={dropdownArrowIcon} alt="▼" />
          </button>
          {showFormats && (
            <div className={styles.dropdown}>
              {textFormats.map((format) => (
                <div
                  key={format.value}
                  className={styles.dropdownItem}
                  onClick={() => toggleBlockType(format.value)}
                >
                  {format.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Шрифты */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.button}
            onClick={() => toggleDropdown('fonts')}
          >
            {selectedFont}
            <img src={dropdownArrowIcon} alt="▼" />
          </button>
          {showFonts && (
            <div className={styles.dropdown}>
              {fontFamilies.map((font) => (
                <div
                  key={font}
                  className={styles.dropdownItem}
                  onClick={() => handleFontChange(font)}
                >
                  {font}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Цвета */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.button}
            onClick={() => toggleDropdown('colors')}
          >
            <div
              className={styles.colorSquare}
              style={{ backgroundColor: selectedColor }}
            />
            <img src={dropdownArrowIcon} alt="▼" />
          </button>
          {showColors && (
            <div className={styles.dropdown}>
              {textColors.map((color) => (
                <div
                  key={color.value}
                  className={styles.dropdownItem}
                  onClick={() => handleTextColorChange(color.value)}
                >
                  <div
                    className={styles.colorSquare}
                    style={{ backgroundColor: color.value }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Выравнивание */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.button}
            onClick={() => toggleDropdown('align')}
          >
            <img
              src={textAlignments.find(a => a.value === selectedAlignment)?.icon}
              alt={selectedAlignment}
              className={styles.icon}
            />
            <img src={dropdownArrowIcon} alt="▼" />
          </button>
          {showAlign && (
            <div className={styles.dropdown}>
              {textAlignments.map((align) => (
                <div
                  key={align.value}
                  className={styles.dropdownItem}
                  onClick={() => handleTextAlignment(align.value)}
                >
                  <img
                    src={align.icon}
                    alt={align.alt}
                    className={styles.iconAlign}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Инлайн-стили */}
        <div className={styles.buttonGroup}>
          {['BOLD', 'ITALIC', 'UNDERLINE', 'STRIKETHROUGH', 'CODE'].map((style) => (
            <button
              key={style}
              className={`${styles.button} ${
                editor.isActive(style.toLowerCase()) ? styles.active : ''
              }`}
              onClick={() => toggleInlineStyle(style)}
            >
              <img
                src={
                  style === 'BOLD' ? boldIcon :
                  style === 'ITALIC' ? italicIcon :
                  style === 'UNDERLINE' ? underlineIcon :
                  style === 'STRIKETHROUGH' ? strikethroughIcon :
                  codeIcon
                }
                alt={style}
                className={styles.icon}
              />
            </button>
          ))}
        </div>

        {/* Очистка стилей */}
        <button
          className={styles.button}
          onClick={handleClearStyles}
        >
          <img src={clearFormatIcon} alt="Clear" className={styles.icon} />
        </button>

        {/* Списки и блоки */}
        <div className={styles.buttonGroup}>
          {['unordered-list-item', 'ordered-list-item', 'blockquote'].map((type) => (
            <button
              key={type}
              className={`${styles.button} ${
                editor.isActive(type) ? styles.active : ''
              }`}
              onClick={() => toggleBlockType(type)}
            >
              <img
                src={
                  type === 'unordered-list-item' ? unorderedListIcon :
                  type === 'ordered-list-item' ? orderedListIcon :
                  blockquoteIcon
                }
                alt={type}
                className={styles.icon}
              />
            </button>
          ))}
        </div>

        {/* Ссылки */}
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${editor.isActive('link') ? styles.active : ''}`}
            onClick={promptForLink}
          >
            <img src={linkIcon} alt="Link" className={styles.icon} />
          </button>
          <button
            className={styles.button}
            onClick={removeLink}
          >
            Убрать ссылку
          </button>
        </div>
      </div>

      <div className={styles.editorWrapper}>
        <EditorContent editor={editor} />
      </div>

      <button
        className={styles.saveButton}
        onClick={handleSave}
      >
        Сохранить
      </button>
    </div>
  )
}

export default TextEditor
