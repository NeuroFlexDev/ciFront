import { useLocale } from '@/i18n/useLocale';
export const editorEnglish: Record<string, string> = {
  'Визуальный редактор': 'Visual editor', 'Исходник': 'Source', 'Предпросмотр': 'Preview',
  'Режим редактирования': 'Editing mode', 'Форматирование текста': 'Text formatting',
  'Текст урока': 'Lesson text', 'Текст урока (Markdown)': 'Lesson text (Markdown)', 'Исходный HTML': 'HTML source',
  'Отменить': 'Undo', 'Повторить': 'Redo', 'Стиль текста': 'Text style', 'Обычный текст': 'Normal text',
  'Заголовок 1': 'Heading 1', 'Заголовок 2': 'Heading 2', 'Заголовок 3': 'Heading 3',
  'Полужирный': 'Bold', 'Курсив': 'Italic', 'Подчёркнутый': 'Underline', 'Зачёркнутый': 'Strikethrough',
  'Код': 'Inline code', 'Маркированный список': 'Bullet list', 'Нумерованный список': 'Numbered list',
  'Цитата': 'Quote', 'Блок кода': 'Code block', 'Ссылка': 'Link', 'Убрать ссылку': 'Remove link',
  'Очистить форматирование': 'Clear formatting', 'Разделитель': 'Divider', 'Таблица': 'Table', 'Формула': 'Formula',
  'Текст ссылки': 'Link text', 'Адрес ссылки': 'Link address', 'Применить ссылку': 'Apply link', 'Отмена': 'Cancel',
  'Введите адрес https://, http://, mailto:, tel: или относительную ссылку.': 'Enter an https://, http://, mailto:, tel: or relative link.',
  'Редактировать исходник блока': 'Edit block source', 'Готово': 'Done', 'Исходный текст блока': 'Block source',
  'Схема': 'Diagram', 'Изображение': 'Image', 'Специальный блок': 'Special block', 'HTML-блок': 'HTML block',
  'HTML сохранён в исходнике; выполнение разметки отключено.': 'HTML is retained in the source; executing markup is disabled.',
  'Формулы, схемы и таблицы сохраняют исходную разметку.': 'Formulas, diagrams and tables retain their source markup.',
  'Начните писать текст урока…': 'Start writing your lesson…', 'Символов': 'Characters',
  'Основные сведения': 'Basic information', 'Содержание урока': 'Lesson content',
  'Закрыть редактор, сохранив черновик': 'Close editor and keep draft', 'Редактирование': 'Editing',
};
export function useEditorCopy() {
  const { locale, t } = useLocale();
  return (key: string) => {
    const contextual = t(key);
    return contextual !== key ? contextual : locale === 'en' ? editorEnglish[key] ?? key : key;
  };
}
