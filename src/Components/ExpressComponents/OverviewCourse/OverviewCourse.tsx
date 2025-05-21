// src/Components/ExpressComponents/OverviewCourse/OverviewCourse.tsx

import React, { useState, useEffect } from "react";
import { api } from "@/shared/api";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader";

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
        const genRes = await api.get(
          `/courses/${courseId}/generate_modules`,
          { signal, params: { cs_id: csId } }
        );
        console.log("✅ generate_modules ответ:", genRes.data);

        // 2) Загрузка списка модулей
        console.log("🔄 Загружаем список модулей...");
        const modsListRes = await api.get<ModuleItem[]>(
          `/courses/${courseId}/modules/`,
          { signal }
        );
        const loadedModules: ModuleItem[] = modsListRes.data.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: [],
          tests: [],
          tasks: [],
        }));

        // 3) Генерация и загрузка уроков для каждого модуля
        for (const moduleItem of loadedModules) {
          console.log(`🔄 Генерация уроков для модуля ID=${moduleItem.id}`);

          await api.post(
            `/courses/${courseId}/generate_module_lessons`,
            null,
            {
              signal,
              params: { cs_id: csId, module_id: moduleItem.id, module_title: moduleItem.title },
            }
          );

          console.log(`🔄 Загружаем уроки модуля ID=${moduleItem.id}`);
          const lessonsRes = await api.get<Lesson[]>(
            `/courses/${courseId}/modules/${moduleItem.id}/lessons/`,
            { signal }
          );
          moduleItem.lessons = lessonsRes.data.map((ls) => ({
            id: ls.id,
            lesson: ls.lesson,
            description: ls.description,
          }));
        }

        if (!signal.aborted) {
          setLocalModules(loadedModules);
          setModules?.(loadedModules);
        }
      } catch (err: any) {
        if (!signal.aborted) {
          console.error("❌ Ошибка при загрузке данных:", err);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [courseId, csId, setModules]);

  return (
    <>
      <h1 className={styles.title}>Шаг 3 : Предварительная структура курса</h1>
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
