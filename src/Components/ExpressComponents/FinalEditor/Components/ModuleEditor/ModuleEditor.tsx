import React from "react";
import trash from "@/assets/icons/common/deleteIcon.svg";
import ai from "@/assets/icons/common/ai.svg";
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";
import AddLessonMenu from "../AddLessonMenu/AddLessonMenu";

import type {
  Lesson,
  Module,
} from "../types/types";
import styles from "./styles.module.css";

interface ModuleEditorProps {
  module: Module;
  selectedLesson: Lesson | null;

  onLessonSelect: (lesson: Lesson) => void;
  onEditorChange: (value: string) => void;

  onClose: () => void;
  onDeleteModule?: () => void;
  onImproveWithAI?: () => void;

  onAddLesson?: () => void;
  onDeleteLesson?: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({
  module,
  selectedLesson,
  onLessonSelect,
  onEditorChange,
  onClose,
  onDeleteModule,
  onImproveWithAI,
  onAddLesson,
  onDeleteLesson,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] =
    React.useState(false);

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.moduleInfo}>
          <span className={styles.moduleLabel}>
            Модуль {module.id}
          </span>

          <h2 className={styles.title}>
            {module.title}
          </h2>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={onDeleteModule}
          >
            <img src={trash} alt="Удалить модуль" />
            Удалить модуль
          </button>

          <button
            type="button"
            className={styles.aiButton}
            onClick={onImproveWithAI}
          >
            <img src={ai} alt="Улучшить с ИИ-агентом" />
            Улучшить с ИИ-агентом
          </button>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть редактор"
          >
            ×
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.editorSide}>
          {selectedLesson ? (
            <>
              <div className={styles.editor}>
                <TextEditor
                  value={selectedLesson.description}
                  onChange={onEditorChange}
                />
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              В этом модуле нет уроков
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.lessonList}>
            {module.lessons.map((lesson, index) => {
            const isActive =
                selectedLesson?.id === lesson.id;

            return (
                <button
                key={lesson.id}
                type="button"
                className={`${styles.lesson} ${
                    isActive ? styles.lessonActive : ""
                }`}
                onClick={() => onLessonSelect(lesson)}
                >
                <span className={styles.lessonNumber}>
                    {index + 1}
                </span>

                <span className={styles.lessonName}>
                    Урок {index + 1}. {lesson.lesson}
                </span>
                </button>
            );
            })}

            {module.tests.map((test, index) => {
            const number =
                module.lessons.length + index + 1;

            return (
                <button
                key={`test-${test.id ?? index}`}
                type="button"
                className={styles.lesson}
                >
                <span className={styles.lessonNumber}>
                    {number}
                </span>

                <span className={styles.lessonName}>
                    Тест {index + 1}. {test.test}
                </span>
                </button>
            );
            })}
          </div>

          <div className={styles.sidebarActions}>
            <button
              type="button"
              className={styles.addLesson}
              onClick={() =>
                setIsAddMenuOpen((prev) => !prev)
              }
            >
              <span>+</span>
              Добавить
            </button>

            {isAddMenuOpen && (
                <AddLessonMenu
                    onClose={() =>
                    setIsAddMenuOpen(false)
                    }

                    onAddLesson={() => {
                    setIsAddMenuOpen(false);
                    onAddLesson?.();
                    }}

                    onAddTest={() => {
                    setIsAddMenuOpen(false);

                    console.log(
                        "Добавить тест"
                    );
                    }}

                    onAddHomework={() => {
                    setIsAddMenuOpen(false);

                    console.log(
                        "Добавить домашнее задание"
                    );
                    }}
                />
            )}

            <button
              type="button"
              className={styles.removeLesson}
              onClick={onDeleteLesson}
              disabled={!selectedLesson}
            >
              <span>−</span>
              Удалить урок
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ModuleEditor;