import React, { useState, useEffect } from "react";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader";
import { apiFetch } from "@/shared/api";

// Типы
interface OverviewCourseProps {
  courseId: number;              // ID курса (после создания)
  csId: number;                  // ID структуры курса
  onBack: () => void;            // Кнопка "Вернуться назад"
  onNext?: () => void;           // Кнопка "Сохранить и продолжить"
  setModules?: (modules: ModuleItem[]) => void; // Функция, чтобы передавать список модулей "наверх"
}

// Интерфейсы урока, теста, задачи, модуля
interface Lesson {
  id: number;
  lesson: string;        // Название урока (для ModuleBlock)
  description: string;   // Текст/HTML
}
interface Test {
  test: string;
  description: string;
}
interface Task {
  name: string;
  description?: string;
}
interface ModuleItem {
  id: number;
  title: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
  loadingLessons?: boolean;
}

interface ModuleListItem {
  id: number;
  title: string;
  course_id: number;
}

interface LessonListItem {
  id: number;
  title: string;
  description: string;
  module_id: number;
}

const OverviewCourse: React.FC<OverviewCourseProps> = ({
  courseId,
  csId,
  onBack,
  onNext,
  setModules,
}) => {
  const [modules, setLocalModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        const genResp = await apiFetch(`/courses/${courseId}/generate_modules?cs_id=${csId}`);
        if (!genResp.ok) {
          throw new Error("Ошибка при генерации модулей");
        }
        await genResp.json();

        const modsListResp = await apiFetch(`/courses/${courseId}/modules/`);
        if (!modsListResp.ok) {
          throw new Error("Ошибка при загрузке списка модулей");
        }
        const modsList: ModuleListItem[] = await modsListResp.json();

        const loadedModules: ModuleItem[] = modsList.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: [],
          tests: [],
          tasks: [],
        }));

        for (const moduleItem of loadedModules) {
          const genLessonsUrl =
            `/courses/${courseId}/generate_module_lessons?cs_id=${csId}` +
            `&module_id=${moduleItem.id}&module_title=${encodeURIComponent(moduleItem.title)}`;
          const genLessonsResp = await apiFetch(genLessonsUrl, {
            method: "POST",
          });
          if (!genLessonsResp.ok) {
            throw new Error("Ошибка генерации уроков");
          }
          await genLessonsResp.json();

          const lessonsResp = await apiFetch(`/courses/${courseId}/modules/${moduleItem.id}/lessons/`);
          if (!lessonsResp.ok) {
            throw new Error("Ошибка при загрузке уроков");
          }
          const lessonsData: LessonListItem[] = await lessonsResp.json();

          const typedLessons = lessonsData.map((ls) => ({
            id: ls.id,
            lesson: ls.title,
            description: ls.description,
          }));

          moduleItem.lessons = typedLessons;
        }

        // Сохраняем модули в стейт
        if (!abort) {
          setLocalModules(loadedModules);
          if (setModules) {
            setModules(loadedModules); // если нужно поднять наверх
          }
        }
      } catch (error) {
        if (!abort) {
          console.error("Ошибка при генерации или загрузке модулей:", error);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [courseId, csId, setModules]);

  // Рендер
  return (
    <div className={styles.page}>
      <p className={styles.title}>Обзор курса</p>
      <p className={styles.description}>
        Система собирает модули и уроки. Ниже можно проверить результат перед переходом в редактор.
      </p>
      <button className={styles.backButton} onClick={onBack}>
        <img src={arrowIcon} alt="<" />
        Вернуться назад
      </button>

      <div className={styles.containerModules}>
        {loading ? (
          <div className={styles.loaderWrapper}>
            <Loader text="Генерация курса и загрузка модулей..." />
          </div>
        ) : (
          modules.map((module, index) => (
            <div key={module.id} className={styles.moduleContainer}>
              <ModuleBlock
                index={index}
                height={400}
                moduleTitle={module.title}
                lessons={module.lessons}
                tests={module.tests}
                tasks={module.tasks}
                onTitleChange={() => {}}
                onLessonAdd={() => {}}
                onLessonRemove={() => {}}
                onTestAdd={() => {}}
                onTestRemove={() => {}}
                onTaskAdd={() => {}}
                onTaskRemove={() => {}}
                onModuleRemove={() => {}}
              />
            </div>
          ))
        )}
      </div>

      <Button
        onClick={onNext}
        text="Сохранить и продолжить"
        disabled={loading || modules.length === 0}
      />
    </div>
  );
};

export default OverviewCourse;
