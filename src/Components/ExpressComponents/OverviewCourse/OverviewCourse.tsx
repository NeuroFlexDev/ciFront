import React, { useState, useEffect } from "react";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import arrowIcon from "@/assets/icons/common/arrowIcon.svg";
import Button from "@/Components/ElementUi/Button/Button";

interface OverviewCourseProps {
  onBack: () => void;
  onNext?: () => void;
}

// Модуль «черновой»
interface ModuleOverview {
  title: string;
  description: string;
  expanded?: boolean; // Показываем ли детальную инфу
  lessons?: Array<{ lesson: string; description: string }>;
  tests?: Array<{ test: string; description: string }>;
  tasks?: Array<{ name: string }>;
}

const OverviewCourse: React.FC<OverviewCourseProps> = ({ onBack, onNext }) => {
  const [modules, setModules] = useState<ModuleOverview[]>([]);
  const [loading, setLoading] = useState(true);

  // Шаг 1. Получаем структуру + генерируем список модулей (title/description)
  useEffect(() => {
    (async () => {
      try {
        // 1) Удостоверяемся, что структура есть
        const sResp = await fetch("http://127.0.0.1:8000/api/course-structure/");
        if (!sResp.ok) throw new Error("Нет структуры курса");
        // 2) Генерируем «обзор»
        const gResp = await fetch("http://127.0.0.1:8000/api/generate_content_overview", {
          method: "POST"
        });
        if (!gResp.ok) throw new Error("Ошибка при генерации обзора модулей");
        const data = await gResp.json();
        // data.modules = [ { title: "...", description: "..." }, ... ]
        setModules(data.modules);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExpandModule = async (index: number) => {
    try {
      if (!modules[index].expanded) {
        // Вызываем API для детализации
        const modTitle = modules[index].title;
        const resp = await fetch("http://127.0.0.1:8000/api/generate_module_details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: modTitle })
        });
        if (!resp.ok) throw new Error("Ошибка генерации деталей модуля");
        const detail = await resp.json();
        // detail = { lessons: [...], tests: [...], tasks: [...] }
        const updated = [...modules];
        updated[index].lessons = detail.lessons;
        updated[index].tests = detail.tests;
        updated[index].tasks = detail.tasks;
        updated[index].expanded = true; // помечаем как «детализированный»
        setModules(updated);
      } else {
        // Скрываем (можно убрать, если хотим только один раз грузить)
        const updated = [...modules];
        updated[index].expanded = false;
        setModules(updated);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    // Допустим, сохраняем куда-то
    console.log("Сохраняем всё:", modules);
    onNext?.();
  };

  if (loading) {
    return <p>Генерируем обзор...</p>;
  }

  return (
    <>
      <p className={styles.title}>Обзор курса (черновой)</p>
      <button className={styles.backButton} onClick={onBack}>
        <img src={arrowIcon} alt="<" />
        Вернуться назад
      </button>

      <div className={styles.conaiterModules}>
        {modules.map((mod, i) => (
          <div key={i} className={styles.moduleItem}>
            <h3>{mod.title}</h3>
            <p>{mod.description}</p>
            <Button
              text={mod.expanded ? "Скрыть детали" : "Показать детали"}
              onClick={() => handleExpandModule(i)}
            />
            {mod.expanded && (
              <div>
                <h4>Уроки:</h4>
                {mod.lessons?.map((l, idx) => (
                  <p key={idx}>{l.lesson} – {l.description}</p>
                ))}
                <h4>Тесты:</h4>
                {mod.tests?.map((t, idx) => (
                  <p key={idx}>{t.test} – {t.description}</p>
                ))}
                <h4>Задания:</h4>
                {mod.tasks?.map((ta, idx) => (
                  <p key={idx}>{ta.name}</p>
                ))}
              </div>
            )}
          </div>
        ))}

        <Button onClick={handleSave} text="Сохранить результат" />
      </div>
    </>
  );
};

export default OverviewCourse;
