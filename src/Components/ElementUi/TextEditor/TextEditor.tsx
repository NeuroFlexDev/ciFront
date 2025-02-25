import { useState, useRef, useCallback } from 'react';
import { Editor, EditorState, RichUtils, Modifier, convertToRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import styles from './styles.module.css';
import slideIcon from "@/assets/icons/TextEditor/slideIcon.svg";
import prevIcon from "@/assets/icons/TextEditor/prevIcon.svg";
import nextIcon from "@/assets/icons/TextEditor/nextIcon.svg";
import dropdownArrowIcon from "@/assets/icons/TextEditor/dropdownArrowIcon.svg";
import boldIcon from "@/assets/icons/TextEditor/bold.svg";
import italicIcon from "@/assets/icons/TextEditor/italic.svg";
import underlineIcon from "@/assets/icons/TextEditor/underline.svg";
import strikethroughIcon from "@/assets/icons/TextEditor/strikethrough.svg";
import codeIcon from "@/assets/icons/TextEditor/code.svg";
import unorderedListIcon from "@/assets/icons/TextEditor/bulleted.svg";
import orderedListIcon from "@/assets/icons/TextEditor/numbered.svg";
import blockquoteIcon from "@/assets/icons/TextEditor/quotes.svg";
import leftAlignIcon from "@/assets/icons/TextEditor/alignLeft.svg";
import centerAlignIcon from "@/assets/icons/TextEditor/alignCenter.svg";
import rightAlignIcon from "@/assets/icons/TextEditor/alignRight.svg";
import justifyAlignIcon from "@/assets/icons/TextEditor/alignJustify.svg";
import clearFormatIcon from "@/assets/icons/TextEditor/clear.svg";

const fontFamilies = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const textFormats = [
  { value: 'unstyled', label: 'Обычный текст' },
  { value: 'header-one', label: 'Заголовок' },
  { value: 'header-two', label: 'Подзаголовок' }
];

const textColors = [
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' }
];

const textAlignments = [
  { value: 'left', icon: leftAlignIcon, alt: 'Left' },
  { value: 'center', icon: centerAlignIcon, alt: 'Center' },
  { value: 'right', icon: rightAlignIcon, alt: 'Right' },
  { value: 'justify', icon: justifyAlignIcon, alt: 'Justify' }
];

const TextEditor = () => {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const editorRef = useRef<Editor>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showFonts, setShowFonts] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showAlign, setShowAlign] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(textFormats[0].value);
  const [selectedFont, setSelectedFont] = useState(fontFamilies[0]);
  const [selectedColor, setSelectedColor] = useState(textColors[0].value);
  const [selectedAlignment, setSelectedAlignment] = useState(textAlignments[0].value);

  const toggleDropdown = useCallback((dropdown: 'fonts' | 'formats' | 'colors' | 'align') => {
    if (dropdown === 'fonts') {
      setShowFonts(prev => !prev);
      setShowFormats(false);
      setShowColors(false);
      setShowAlign(false);
    } else if (dropdown === 'formats') {
      setShowFormats(prev => !prev);
      setShowFonts(false);
      setShowColors(false);
      setShowAlign(false);
    } else if (dropdown === 'colors') {
      setShowColors(prev => !prev);
      setShowFonts(false);
      setShowFormats(false);
      setShowAlign(false);
    } else if (dropdown === 'align') {
      setShowAlign(prev => !prev);
      setShowFonts(false);
      setShowFormats(false);
      setShowColors(false);
    }
  }, []);

  const inlineStyleIcons: Record<string, string> = {
    BOLD: boldIcon,
    ITALIC: italicIcon,
    UNDERLINE: underlineIcon,
    STRIKETHROUGH: strikethroughIcon,
    CODE: codeIcon,
  };

  const blockTypeIcons: Record<string, string> = {
    "unordered-list-item": unorderedListIcon,
    "ordered-list-item": orderedListIcon,
    "blockquote": blockquoteIcon,
  };

  const handleKeyCommand = (command: string, state: EditorState) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const handleClearStyles = () => {
    const selection = editorState.getSelection();
    let contentState = editorState.getCurrentContent();

    // Удаляем все инлайн-стили
    const inlineStyles = ['BOLD', 'ITALIC', 'UNDERLINE', 'STRIKETHROUGH', 'CODE'];
    inlineStyles.forEach(style => {
      contentState = Modifier.removeInlineStyle(contentState, selection, style);
    });

    // Удаляем цвет текста
    contentState.getBlockMap().forEach(block => {
      block.getInlineStyleAt(0).forEach(style => {
        if (style.startsWith('color-')) {
          contentState = Modifier.removeInlineStyle(contentState, selection, style);
        }
      });
    });

    // Сбрасываем выделение и применяем изменения
    const newEditorState = EditorState.push(editorState, contentState, 'change-inline-style');
    setEditorState(EditorState.forceSelection(newEditorState, selection));
  };

  const handleSave = () => {
    const content = editorState.getCurrentContent();
    const rawContent = convertToRaw(content);
    console.log(JSON.stringify(rawContent, null, 2));
  };

  const toggleInlineStyle = (style: string) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const toggleBlockType = (blockType: string) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const handleUndo = () => {
    setEditorState(EditorState.undo(editorState));
  };

  const handleRedo = () => {
    setEditorState(EditorState.redo(editorState));
  };

  const handleFontChange = (font: string) => {
    const selection = editorState.getSelection();
    const nextState = EditorState.push(
      editorState,
      Modifier.applyInlineStyle(
        editorState.getCurrentContent(),
        selection,
        `font-family-${font}`
      ),
      'change-inline-style'
    );
    setEditorState(nextState);
    setSelectedFont(font);
    setShowFonts(false);
  };

  const handleTextColorChange = (color: string) => {
    const selection = editorState.getSelection();
    let contentState = editorState.getCurrentContent();
    // Удаляем ранее применённые стили цвета
    textColors.forEach(colorItem => {
      contentState = Modifier.removeInlineStyle(contentState, selection, `color-${colorItem.value}`);
    });
    contentState = Modifier.applyInlineStyle(contentState, selection, `color-${color}`);
    const newEditorState = EditorState.push(editorState, contentState, 'change-inline-style');
    setEditorState(newEditorState);
    setSelectedColor(color);
    setShowColors(false);
  };

  const handleAddLink = () => {
    const selection = editorState.getSelection();
    if (!selection.isCollapsed()) {
      setShowLinkInput(true);
    }
  };

  const confirmLink = () => {
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity('LINK', 'MUTABLE', { url: linkUrl });
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
    setEditorState(RichUtils.toggleLink(newEditorState, newEditorState.getSelection(), entityKey));
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const onLinkInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      confirmLink();
    }
  };

  const handleTextAlignment = (alignment: string) => {
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    
    const newContentState = Modifier.mergeBlockData(
      contentState,
      selection,
      { textAlign: alignment }
    );
    
    const newEditorState = EditorState.push(
      editorState,
      newContentState,
      'change-block-data'
    );
    
    setEditorState(newEditorState);
  };

  const styleMap = {
    'STRIKETHROUGH': { textDecoration: 'line-through' },
    'CODE': { fontFamily: 'monospace' },
    ...fontFamilies.reduce((acc: Record<string, object>, font) => {
      acc[`font-family-${font}`] = { fontFamily: font };
      return acc;
    }, {}),
    ...textColors.reduce((acc: Record<string, object>, color) => {
      acc[`color-${color.value}`] = { color: color.value };
      return acc;
    }, {}),
  };

  const blockStyleFn = (contentBlock: any) => {
    const textAlign = contentBlock.getData().get('textAlign');
    return textAlign ? `${textAlign}Align` : '';
  };

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
            onClick={handleUndo}
            disabled={!editorState.getUndoStack().size}
          >
            <img src={prevIcon} alt="↩" />
          </button>
          <button 
            className={styles.buttonArrow} 
            onClick={handleRedo}
            disabled={!editorState.getRedoStack().size}
          >
            <img src={nextIcon} alt="↪" />
          </button>
        </div>

        {/* Dropdown выбора формата */}
        <div className={styles.dropdownContainer}>
          <button 
            className={styles.button}
            onClick={() => toggleDropdown('formats')}
          >
            {textFormats.find(format => format.value === selectedFormat)?.label || 'Format'} <img src={dropdownArrowIcon} alt="\/" />
          </button>
          {showFormats && (
            <div className={styles.dropdown}>
              {textFormats.map(format => (
                <div
                  key={format.value}
                  className={styles.dropdownItem}
                  onClick={() => {
                    toggleBlockType(format.value);
                    setSelectedFormat(format.value);
                    setShowFormats(false);
                  }}
                >
                  {format.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown выбора шрифта */}
        <div className={styles.dropdownContainer}>
          <button 
            className={styles.button}
            onClick={() => toggleDropdown('fonts')}
          >
            {selectedFont} <img src={dropdownArrowIcon} alt="\/" />
          </button>
          {showFonts && (
            <div className={styles.dropdown}>
              {fontFamilies.map(font => (
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

        {/* Dropdown выбора цвета (отображаются квадратные образцы) */}
        <div className={styles.dropdownContainer}>
          <button 
            className={styles.button}
            onClick={() => toggleDropdown('colors')}
          >
            <div className={styles.colorSquare} style={{ backgroundColor: selectedColor }} />
            <img src={dropdownArrowIcon} alt="\/" />
          </button>
          {showColors && (
            <div className={styles.dropdown}>
              {textColors.map(color => (
                <div
                  key={color.value}
                  className={styles.dropdownItem}
                  onClick={() => handleTextColorChange(color.value)}
                >
                  <div className={styles.colorSquare} style={{ backgroundColor: color.value }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown выбора выравнивания */}
        <div className={styles.dropdownContainer}>
          <button 
            className={styles.button}
            onClick={() => toggleDropdown('align')}
          >
            <img src={textAlignments.find(item => item.value === selectedAlignment)?.icon} alt={selectedAlignment} className={styles.icon} />
            <img src={dropdownArrowIcon} alt="\/" />
          </button>
          {showAlign && (
            <div className={styles.dropdown}>
              {textAlignments.map(item => (
                <div
                  key={item.value}
                  className={styles.dropdownItem}
                  onClick={() => {
                    handleTextAlignment(item.value);
                    setSelectedAlignment(item.value);
                    setShowAlign(false);
                  }}
                >
                  <img src={item.icon} alt={item.alt} className={styles.iconAlign} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.buttonGroup}>
          {['BOLD', 'ITALIC', 'UNDERLINE', 'STRIKETHROUGH', 'CODE'].map(style => (
            <button
              key={style}
              className={`${styles.button} ${editorState.getCurrentInlineStyle().has(style) ? styles.active : ''}`}
              onClick={() => toggleInlineStyle(style)}
            >
              <img src={inlineStyleIcons[style]} alt={style} className={styles.icon} />
            </button>
          ))}
        </div>

        <button className={styles.button} onClick={handleClearStyles}>
          <img src={clearFormatIcon} alt="Очистить форматирование" className={styles.icon} />
        </button>

        <div className={styles.buttonGroup}>
          {['unordered-list-item', 'ordered-list-item', 'blockquote'].map(type => (
            <button
              key={type}
              className={styles.button}
              onClick={() => toggleBlockType(type)}
            >
              <img src={blockTypeIcons[type]} alt={type} className={styles.icon} />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.editorWrapper}>
        <Editor
          ref={editorRef}
          editorState={editorState}
          onChange={setEditorState}
          handleKeyCommand={handleKeyCommand}
          customStyleMap={styleMap}
          blockStyleFn={blockStyleFn}
        />
      </div>
      
      <button className={styles.saveButton} onClick={handleSave}>
        Сохранить
      </button>
    </div>
  );
};

export default TextEditor;