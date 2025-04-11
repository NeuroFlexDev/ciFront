import React, { useState, useEffect } from "react";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader";

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
        console.log("🔄 Генерация модулей (GET /generate_modules)...");

        // 1) Генерация модулей
        const generateUrl = `http://127.0.0.1:8000/api/courses/${courseId}/generate_modules?cs_id=${csId}`;
        const genResp = await fetch(generateUrl);
        if (!genResp.ok) {
          throw new Error("Ошибка при генерации модулей");
        }
        const genData = await genResp.json();
        console.log("✅ generate_modules ответ:", genData);

        // 2) Загружаем реально созданные модули через CRUD
        console.log("🔄 Загружаем список модулей (GET /courses/{courseId}/modules/)...");
        const modsListResp = await fetch(
          `http://127.0.0.1:8000/api/courses/${courseId}/modules/`
        );
        if (!modsListResp.ok) {
          throw new Error("Ошибка при загрузке списка модулей");
        }
        const modsList = await modsListResp.json(); // [{ id, title, course_id }, ...]

        // Преобразуем в local-стейт
        let loadedModules: ModuleItem[] = modsList.map((mod: any) => ({
          id: mod.id,
          title: mod.title,
          lessons: [],
          tests: [],
          tasks: [],
        }));

        // 3) Для каждого модуля: генерация уроков + загрузка уроков
        for (const moduleItem of loadedModules) {
          console.log(
            `🔄 Генерация уроков для модуля ID=${moduleItem.id}, title=${moduleItem.title}`
          );

          // generate_module_lessons через query, т.к. backend = Depends()
          const genLessonsUrl =
            `http://127.0.0.1:8000/api/courses/${courseId}/generate_module_lessons?cs_id=${csId}` +
            `&module_id=${moduleItem.id}&module_title=${encodeURIComponent(moduleItem.title)}`;
          const genLessonsResp = await fetch(genLessonsUrl, {
            method: "POST",
          });
          if (!genLessonsResp.ok) {
            throw new Error("Ошибка генерации уроков");
          }
          const genLessonsData = await genLessonsResp.json();
          console.log("Уроки сгенерированы:", genLessonsData);

          // 4) Теперь загружаем уроки (CRUD)
          console.log(
            `🔄 Загружаем уроки из /courses/${courseId}/modules/${moduleItem.id}/lessons/`
          );
          const lessonsResp = await fetch(
            `http://127.0.0.1:8000/api/courses/${courseId}/modules/${moduleItem.id}/lessons/`
          );
          if (!lessonsResp.ok) {
            throw new Error("Ошибка при загрузке уроков");
          }
          const lessonsData = await lessonsResp.json(); // [{ id, title, description, module_id }, ...]

          const typedLessons = lessonsData.map((ls: any) => ({
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
          console.error("❌ Ошибка при генерации/загрузке модулей:", error);
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
