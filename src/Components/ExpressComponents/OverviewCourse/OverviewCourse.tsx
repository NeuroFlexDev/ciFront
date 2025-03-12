import React, { useState, useEffect } from "react";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader"; // Прелоадер

interface OverviewCourseProps {
  onBack: () => void;
  onNext?: () => void;
  setModules: (modules: Module[]) => void;
}

// Интерфейсы
interface Lesson {
  lesson: string;
  description: string;
}

interface Test {
  test: string;
  description: string;
}

interface Task {
  name: string;
}

interface Module {
  title: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
  loadingLessons?: boolean;
}

const OverviewCourse: React.FC<OverviewCourseProps> = ({ onBack, onNext, setModules }) => {
  const [modules, setLocalModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchModules = async () => {
      try {
        console.log("🔄 Запрашиваем список модулей...");
        const modResp = await fetch("http://127.0.0.1:8000/api/generate_modules", {
          signal: abortController.signal,
        });

        if (!modResp.ok) throw new Error("Ошибка генерации модулей");
        const modData = await modResp.json();

        console.log("✅ Получены модули:", modData.modules);

        if (!modData.modules || modData.modules.length === 0) {
          throw new Error("❌ API вернул пустой список модулей");
        }

        let generatedModules: Module[] = [];

        for (const mod of modData.modules) {
          let newModule: Module = {
            title: mod.title,
            lessons: [],
            tests: [],
            tasks: [],
            loadingLessons: true,
          };

          setLocalModules((prev) => [...prev, newModule]);

          console.log(`🔄 Генерируем уроки для модуля: ${mod.title}`);
          const lessonResp = await fetch("http://127.0.0.1:8000/api/generate_module_lessons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: mod.title }),
            signal: abortController.signal,
          });

          if (!lessonResp.ok) throw new Error("Ошибка генерации уроков");
          const lessonData = await lessonResp.json();
          newModule.lessons = lessonData.lessons || [];

          setLocalModules((prev) =>
            prev.map((m) => (m.title === newModule.title ? newModule : m))
          );

          for (let i = 0; i < newModule.lessons.length; i++) {
            console.log(`🔄 Генерируем контент для урока: ${newModule.lessons[i].lesson}`);
            const contentResp = await fetch("http://127.0.0.1:8000/api/generate_lesson_content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: newModule.lessons[i].lesson }),
              signal: abortController.signal,
            });

            if (!contentResp.ok) throw new Error("Ошибка генерации контента урока");
            const contentData = await contentResp.json();

            newModule.lessons[i] = {
              ...newModule.lessons[i],
              description: contentData.theory,
            };

            newModule.tests = contentData.questions?.map((q) => ({
              test: q.question,
              description: `Варианты: ${q.answers.join(", ")} (Правильный: ${q.correct})`,
            })) || [];

            newModule.tasks = contentData.tasks || [];

            setLocalModules((prev) =>
              prev.map((m) => (m.title === newModule.title ? newModule : m))
            );
          }

          newModule.loadingLessons = false;
          setLocalModules((prev) =>
            prev.map((m) => (m.title === newModule.title ? newModule : m))
          );

          setCurrentIndex((prev) => prev + 1);
          generatedModules.push(newModule);
        }

        console.log("📦 Отправляемые модули:", JSON.stringify({ modules: generatedModules }, null, 2));

        saveModulesToServer(generatedModules);
        setModules(generatedModules); // Передаём актуальные модули

      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("❌ Ошибка загрузки:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchModules();

    return () => abortController.abort();
  }, []);

  const saveModulesToServer = async (modulesToSave: Module[]) => {
    if (!modulesToSave || modulesToSave.length === 0) {
      console.warn("🚨 Пустые модули! Отправка данных отменена.");
      return;
    }

    console.log("📦 Отправляем на сервер:", JSON.stringify({ modules: modulesToSave }, null, 2));

    const saveResponse = await fetch("http://127.0.0.1:8000/api/save_modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: modulesToSave }),
    });

    if (!saveResponse.ok) {
      throw new Error("❌ Ошибка сохранения модулей на сервере");
    }

    console.log("✅ Модули успешно сохранены на сервере.");
    setModules(modulesToSave);
  };

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
            <Loader text="Генерация курса..." />
          </div>
        ) : (
          modules.map((module, index) => (
            <div key={index} className={styles.moduleContainer}>
              <ModuleBlock
                index={index}
                height={400}
                moduleTitle={module.title}
                lessons={module.lessons}
                tests={module.tests}
                tasks={module.tasks}
              />
              {module.loadingLessons && (
                <div className={styles.moduleLoader}>
                  <Loader text="Загрузка уроков..." />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Button onClick={onNext} text="Сохранить и продолжить" disabled={loading || modules.length === 0} />
    </>
  );
};

export default OverviewCourse;
