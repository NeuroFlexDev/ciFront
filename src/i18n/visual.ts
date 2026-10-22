export const visualEnglish: Record<string, string> = {
  Схема: "Diagram",
  Уместить: "Fit",
  Увеличить: "Enlarge",
  "Скачать схему SVG": "Download SVG diagram",
  "Схема урока; текст доступен ниже":
    "Lesson diagram; source text available below",
  "Строим схему…": "Rendering diagram…",
  "Исходный текст схемы": "Diagram source",
  "Редактор схемы": "Diagram editor",
  Формат: "Format",
  Процесс: "Process",
  "Последовательность UML": "UML sequence",
  "Классы UML": "UML classes",
  "Состояния UML": "UML states",
  "Сущности и связи": "Entities and relationships",
  "Выберите пример или напишите свою схему. Исходный текст сохраняется в черновике; вставка добавит его в урок.":
    "Choose an example or write your diagram. Its source is saved as a draft; inserting adds it to the lesson.",
  "Чтобы выбрать другой пример, сначала очистите поле схемы. Текущий текст не заменяется автоматически.":
    "Clear the source field to choose a different example. Your text is never replaced automatically.",
  "Проверяем схему…": "Checking diagram…",
  "Добавить схему в урок": "Insert diagram into lesson",
  "Добавить схему": "Add diagram",
  "Закрыть редактор схемы": "Close diagram editor",
  "Неизвестный формат схемы.": "Unknown diagram format.",
  "Схема слишком большая. Разделите её на несколько схем (до 12 000 символов и 160 строк).":
    "The diagram is too large. Split it into smaller diagrams (up to 12,000 characters and 160 lines).",
  "Этот синтаксис PlantUML не поддерживается. Доступны class, participant/actor, связи, сообщения и alt/loop/opt/par. Используйте Mermaid для других схем.":
    "This PlantUML syntax is unsupported. Classes, participants/actors, relationships, messages and alt/loop/opt/par are supported. Use Mermaid for other diagrams.",
  "Схема содержит недопустимые ссылки, HTML, стили или директивы. Используйте обычные подписи и связи.":
    "The diagram contains disallowed links, HTML, styles or directives. Use plain labels and connections.",
  "Начните схему с flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, journey, timeline, mindmap, quadrantChart или xychart.":
    "Start with flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, journey, timeline, mindmap, quadrantChart or xychart.",
  "В схеме слишком много связей. Разделите её на несколько небольших схем.":
    "The diagram has too many connections. Split it into smaller diagrams.",
  "Полученная схема превышает допустимый размер.":
    "The rendered diagram exceeds the size limit.",
  "Не удалось прочитать SVG схемы.": "The diagram SVG could not be read.",
  "Схема не имеет допустимых размеров.": "The diagram has invalid dimensions.",
  "Не удалось построить схему. Проверьте её синтаксис; исходный текст сохранён.":
    "The diagram could not be rendered. Check its syntax; your source text is saved.",
  "Не удалось построить схему.": "The diagram could not be rendered.",
  "Выберите PNG, JPEG или WebP.": "Choose PNG, JPEG or WebP.",
  "Администратор ещё не настроил бюджет генерации изображений.":
    "The administrator has not configured the image generation budget yet.",
  "Настройки генератора изменились. Запрос не отправлялся; описание сохранено для нового запуска.":
    "Generator settings changed. The request was not sent; your description is saved for a new attempt.",
  "Провайдер вернул изображение с неразрешённого адреса. Администратору нужно проверить разрешённые адреса сервиса.":
    "The provider returned an image from an unapproved address. The administrator needs to check the service's allowed hosts.",
  "Провайдер создал результат, но файл не удалось получить. Автоматического платного повтора не было.":
    "The provider created a result, but its file could not be retrieved. There was no automatic paid retry.",
  "Провайдер вернул недопустимое изображение. Автоматического платного повтора не было.":
    "The provider returned an invalid image. There was no automatic paid retry.",
  "Доступ изменился во время генерации. Обновите библиотеку или обратитесь к администратору.":
    "Access changed during generation. Refresh the library or contact your administrator.",
  "Очередь занята. Этот запрос не отправлен провайдеру; можно запустить новую попытку.":
    "The queue is busy. This request was not sent to the provider; you can start a new attempt.",
  "На один запуск резервируется до {v0} ₽ из бюджета организации. Это верхняя граница резерва, а не точная стоимость счёта провайдера.":
    "Up to ₽{v0} is reserved from your organization's budget per attempt. This is a reservation ceiling, not the provider's exact invoice amount.",
};
