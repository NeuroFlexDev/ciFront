import { useEffect, useRef, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import DiagramBlock from "./DiagramBlock";
import { useDurableState } from "@/hooks/useDurableState";
import { useLocale } from "@/i18n/useLocale";
import { renderDiagram } from "@/shared/diagrams";
import styles from "./DiagramEditor.module.css";

const examples = {
  flowchart:
    'flowchart LR\n  A["Начало"] --> B{"Условие"}\n  B -->|Да| C["Действие"]\n  B -->|Нет| D["Проверка"]',
  sequence:
    "sequenceDiagram\n  participant U as Ученик\n  participant C as Курс\n  U->>C: Открыть урок\n  C-->>U: Материал урока",
  class:
    'classDiagram\n  class Course {\n    +title\n    +openLesson()\n  }\n  class Lesson {\n    +content\n  }\n  Course "1" --> "many" Lesson : содержит',
  state:
    "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review\n  Review --> Published\n  Published --> [*]",
  er: "erDiagram\n  COURSE ||--o{ LESSON : contains\n  COURSE {\n    int id\n    string title\n  }\n  LESSON {\n    int id\n    string content\n  }",
};
const labels = {
  flowchart: "Процесс",
  sequence: "Последовательность UML",
  class: "Классы UML",
  state: "Состояния UML",
  er: "Сущности и связи",
};
export default function DiagramEditor({
  draftKey,
  onInsert,
}: {
  draftKey: string;
  onInsert: (markdown: string) => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useDurableState(`diagram:${draftKey}`, {
    kind: "mermaid",
    source: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(0);
  const pending = useRef(false);
  const destination = useRef({ draftKey, onInsert });
  destination.current = { draftKey, onInsert };
  useEffect(() => {
    pending.current = false;
    setBusy(false);
    return () => {
      operation.current += 1;
    };
  }, [draftKey]);
  const insert = async () => {
    if (pending.current) return;
    pending.current = true;
    const request = ++operation.current;
    const sourceKey = draftKey;
    setBusy(true);
    setError("");
    try {
      await renderDiagram(draft.source, draft.kind);
      if (
        request !== operation.current ||
        destination.current.draftKey !== sourceKey
      )
        return;
      destination.current.onInsert(
        `\n\n\`\`\`${draft.kind}\n${draft.source.trim()}\n\`\`\`\n\n`,
      );
    } catch (reason) {
      if (request === operation.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Не удалось построить схему.",
        );
    } finally {
      if (request === operation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <section className={styles.editor} aria-label={t("Редактор схемы")}>
      <h3>
        <GitBranch size={22} />
        {t("Схема")}
      </h3>
      <p>
        {t(
          "Выберите пример или напишите свою схему. Исходный текст сохраняется в черновике; вставка добавит его в урок.",
        )}
      </p>
      <div className={styles.templates}>
        {Object.entries(examples).map(([key, value]) => (
          <button
            key={key}
            type="button"
            disabled={!!draft.source.trim()}
            onClick={() => setDraft({ kind: "mermaid", source: value })}
          >
            {t(labels[key as keyof typeof labels])}
          </button>
        ))}
      </div>
      {!!draft.source.trim() && (
        <p className={styles.hint}>
          {t(
            "Чтобы выбрать другой пример, сначала очистите поле схемы. Текущий текст не заменяется автоматически.",
          )}
        </p>
      )}
      <label>
        {t("Формат")}
        <select
          value={draft.kind}
          disabled={busy}
          onChange={(event) => setDraft({ ...draft, kind: event.target.value })}
        >
          <option value="mermaid">Mermaid</option>
          <option value="plantuml">PlantUML (class / sequence)</option>
        </select>
      </label>
      <label>
        {t("Исходный текст схемы")}
        <textarea
          value={draft.source}
          maxLength={12000}
          rows={10}
          spellCheck={false}
          disabled={busy}
          onChange={(event) =>
            setDraft({ ...draft, source: event.target.value })
          }
          placeholder={"flowchart LR\n  A --> B"}
        />
      </label>
      {draft.source.trim() && (
        <DiagramBlock source={draft.source} kind={draft.kind} />
      )}
      {error && <p role="alert">{t(error)}</p>}
      <button
        type="button"
        className={styles.insert}
        disabled={busy || !draft.source.trim()}
        onClick={() => void insert()}
      >
        <Plus size={18} />
        {busy ? t("Проверяем схему…") : t("Добавить схему в урок")}
      </button>
    </section>
  );
}
