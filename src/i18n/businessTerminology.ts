import { learningEnglish } from './learning';
import { globalEnglish } from './global';
import { creatorEnglish } from './creator';
import { generationEnglish } from './generation';
import { businessEnglish } from './business';
import { publicationEnglish } from './publication';
import { materialsEnglish } from './materials';
import { tenantLifecycleEnglish } from './tenantLifecycle';
import { adminEditorEnglish } from './adminEditor';
import type { Locale, TranslationParams } from './locale';

// Only registered interface messages are eligible. Names, uploaded text,
// editor contents and interpolation values retain the customer's wording.
const interfaceKeys = new Set(Object.keys({ ...learningEnglish, ...globalEnglish,
  ...creatorEnglish, ...generationEnglish, ...businessEnglish, ...publicationEnglish,
  ...materialsEnglish, ...tenantLifecycleEnglish, ...adminEditorEnglish }));
const words: Record<string, string> = {
  курс: 'регламент', курса: 'регламента', курсу: 'регламенту', курсом: 'регламентом', курсе: 'регламенте',
  курсы: 'регламенты', курсов: 'регламентов', курсам: 'регламентам', курсами: 'регламентами', курсах: 'регламентах',
  модуль: 'раздел', модуля: 'раздела', модулю: 'разделу', модулем: 'разделом', модуле: 'разделе',
  модули: 'разделы', модулей: 'разделов', модулям: 'разделам', модулями: 'разделами', модулях: 'разделах',
  урок: 'пункт', урока: 'пункта', уроку: 'пункту', уроком: 'пунктом', уроке: 'пункте',
  уроки: 'пункты', уроков: 'пунктов', урокам: 'пунктам', уроками: 'пунктами', уроках: 'пунктах',
  course: 'regulation', courses: 'regulations', module: 'section', modules: 'sections', lesson: 'item', lessons: 'items',
};
for (const word of Object.keys(words)) {
  interfaceKeys.add(word);
  interfaceKeys.add(word[0].toUpperCase() + word.slice(1));
}
const exact: Record<string, [string, string]> = {
  'Моё обучение': ['Мои регламенты', 'My regulations'],
  'Мои курсы': ['Регламенты', 'Regulations'],
  'Настройки курса': ['Настройки регламента', 'Regulation settings'],
  'Редактор курса': ['Редактор регламента', 'Regulation editor'],
  'Содержание курса': ['Содержание регламента', 'Regulation contents'],
  'Текст урока': ['Текст регламента', 'Regulation text'],
  'Текст урока (Markdown)': ['Текст регламента (Markdown)', 'Regulation text (Markdown)'],
  'Начните писать текст урока…': ['Начните писать текст регламента…', 'Start writing your regulation…'],
  'Содержание урока': ['Текст регламента', 'Regulation text'],
  'Сохранить урок': ['Сохранить текст', 'Save text'],
  'Урок сохранён': ['Текст сохранён', 'Text saved'],
  'Итоговый тест (': ['Проверка знаний (', 'Knowledge check ('],
  'В курсе пока нет уроков': ['Регламент пока не заполнен', 'This regulation is empty'],
  'Добавьте модуль и уроки вручную или подготовьте содержание из документов.':
    ['Подготовьте регламент из документов или добавьте текст вручную.', 'Prepare the regulation from documents or add its text manually.'],
  'Загрузите источники. ИИ подготовит структуру, уроки и задания для вашей проверки.':
    ['Загрузите документы. ИИ подготовит единый регламент и проверку знаний. Вы проверите и отредактируете результат перед публикацией.', 'Upload documents. AI prepares a single regulation and knowledge checks for your review before publication.'],
  'Создайте модули и уроки в редакторе. ИИ не расходуется.':
    ['Напишите регламент в редакторе. ИИ не расходуется.', 'Write the regulation in the editor without using AI.'],
  'Финальный тест': ['Проверка знания регламента', 'Regulation knowledge check'],
  'Генерация курса': ['Подготовка регламента', 'Preparing regulation'],
};

export function businessTranslation(locale: Locale, key: string, params: TranslationParams | undefined,
  translate: (key: string, params?: TranslationParams) => string): string {
  if (!interfaceKeys.has(key) && !exact[key]) return translate(key, params);
  const template = exact[key]?.[locale === 'en' ? 1 : 0] ?? translate(key).replace(/[A-Za-zА-Яа-яЁё]+/g, word => {
    const replacement = words[word.toLowerCase()];
    return replacement ? (word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement) : word;
  });
  return template.replace(/\{([\w]+)\}/g, (token, name: string) =>
    params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token);
}
