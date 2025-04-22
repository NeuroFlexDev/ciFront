import React, { useState, useEffect } from "react";
import axios from "axios";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader";

// Типы
interface OverviewCourseProps {
  courseId: number;
  csId: number;
  onBack: () => void;
  onNext?: () => void;
  setModules?: (modules: ModuleItem[]) => void;
}

interface Lesson {
  id: number;
  lesson: string;
  description: string;
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
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        setLoading(true);
        console.log("🔄 Генерация модулей (GET /generate_modules)...");

        // 1) Генерация модулей
        const generateUrl = `http://127.0.0.1:8000/api/courses/${courseId}/generate_modules?cs_id=${csId}`;
        const { data: genData } = await axios.get(generateUrl, { signal });
        console.log("✅ generate_modules ответ:", genData);

        // 2) Загрузка списка модулей
        console.log("🔄 Загружаем список модулей...");
        const { data: modsList } = await axios.get(
          `http://127.0.0.1:8000/api/courses/${courseId}/modules/`,
          { signal }
        );

        // Преобразование в local-стейт
        let loadedModules: ModuleItem[] = modsList.map((mod: any) => ({
          id: mod.id,
          title: mod.title,
          lessons: [],
          tests: [],
          tasks: [],
        }));

        // 3) Генерация и загрузка уроков для каждого модуля
        for (const moduleItem of loadedModules) {
          console.log(`🔄 Генерация уроков для модуля ID=${moduleItem.id}`);

          const genLessonsUrl = 
          `http://127.0.0.1:8000/api/courses/${courseId}/generate_module_lessons?cs_id=${csId}&module_id=${moduleItem.id}&module_title=${encodeURIComponent(moduleItem.title)}`;
          await axios.post(genLessonsUrl, { signal });

          // 4) Загрузка уроков модуля
          const { data: lessonsData } = await axios.get(
            `http://127.0.0.1:8000/api/courses/${courseId}/modules/${moduleItem.id}/lessons/`,
            { signal }
          );

          const typedLessons = lessonsData.map((ls: any) => ({
            id: ls.id,
            lesson: ls.title,
            description: ls.description,
          }));

          moduleItem.lessons = typedLessons;
        }

        // Сохраняем модули в стейт
        if (!signal.aborted) {
          setLocalModules(loadedModules);
          setModules?.(loadedModules);
        }
      } catch (error) {
        if (!axios.isCancel(error) && !signal.aborted) {
          console.error("❌ Ошибка при загрузке данных:", error);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [courseId, csId, setModules]);

  // Рендер
  return (
    <>
      <p className={styles.title}>Обзор курса</p>
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
    </>
  );
};

export default OverviewCourse;
