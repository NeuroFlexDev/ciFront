import React, { useMemo, useState } from "react";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";
import { apiFetch } from "@/shared/api";
import CourseStats from "./Components/CourseStats/CourseStats";
import ModuleTimeline from "./Components/ModuleTimeline/ModuleTimeline";
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';

interface Lesson {
  id: number;
  lesson: string;
  description: string;
}

interface Test {
  id?: number;
  test: string;
  description: string;
}

interface Task {
  id?: number;
  name: string;
  description?: string;
}

interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
}

interface FinalEditorProps {
  modules: Module[];
  onBack: () => void;
  onFinish: () => void;
}

const FinalEditor: React.FC<FinalEditorProps> = ({
  modules: initialModules,
  onBack,
  onFinish,
}) => {
  const [modules, setModules] =
    useState<Module[]>(initialModules);

  const [selectedModule, setSelectedModule] =
    useState<Module | null>(null);

  const [selectedLesson, setSelectedLesson] =
    useState<Lesson | null>(null);

  const lessonsCount = useMemo(() => {
    return modules.reduce(
      (total, module) =>
        total + module.lessons.length,
      0
    );
  }, [modules]);

  const duration = useMemo(() => {
    const hours = Math.max(
      1,
      Math.round(lessonsCount * 2)
    );

    return `~${hours} часа`;
  }, [lessonsCount]);

  const handleModuleClick = (module: Module) => {
    setSelectedModule(module);

    if (module.lessons.length > 0) {
      setSelectedLesson(module.lessons[0]);
    } else {
      setSelectedLesson(null);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleEditorChange = (newHTML: string) => {
    if (!selectedLesson) {
      return;
    }

    setModules((prev) =>
      prev.map((module) => ({
        ...module,

        lessons: module.lessons.map((lesson) =>
          lesson.id === selectedLesson.id
            ? {
                ...lesson,
                description: newHTML,
              }
            : lesson
        ),
      }))
    );

    setSelectedLesson((prev) =>
      prev
        ? {
            ...prev,
            description: newHTML,
          }
        : null
    );
  };

  const handleAddModule = () => {
    console.log("Добавить новый модуль");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Онбординг отдела продаж
        </h1>
      </header>

      <CourseStats
        modulesCount={modules.length}
        lessonsCount={lessonsCount}
        duration={duration}
      />

      <ModuleTimeline
        modules={modules}
        onModuleClick={handleModuleClick}
        onAddModule={handleAddModule}
      />

      {selectedModule && (
        <div className={styles.editorSection}>
          <div className={styles.editorHeader}>
            <div>
              <span className={styles.editorOverline}>
                Редактирование
              </span>

              <h2>
                {selectedModule.title}
              </h2>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => {
                setSelectedModule(null);
                setSelectedLesson(null);
              }}
            >
              ×
            </button>
          </div>

          <div className={styles.editorContent}>
            <div className={styles.lessons}>
              {selectedModule.lessons.map(
                (lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className={
                      selectedLesson?.id ===
                      lesson.id
                        ? styles.lessonActive
                        : styles.lesson
                    }
                    onClick={() =>
                      handleLessonClick(
                        lesson
                      )
                    }
                  >
                    {lesson.lesson}
                  </button>
                )
              )}
            </div>

            <div className={styles.editor}>
              {selectedLesson ? (
                <>
                  <h3>
                    {selectedLesson.lesson}
                  </h3>

                  <TextEditor
                    value={
                      selectedLesson.description
                    }
                    onChange={
                      handleEditorChange
                    }
                  />
                </>
              ) : (
                <div className={styles.empty}>
                  В модуле нет уроков
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.buttons}>
        <div style={{ maxWidth: '145px' }}>
          <Button
            onClick={onBack}
            text="Назад"
            icon={<img src={arrowLeft} alt="back" />}
            iconPosition="left"
          />
        </div>

        <div style={{ maxWidth: '220px' }}>
          <Button
            onClick={onFinish}
            text="Опубликовать"
            iconPosition="right"
            icon={<img src={arrowRight} alt="next" />}
          />
        </div>
      </div>
    </div>
  );
};

export default FinalEditor;