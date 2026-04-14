import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import { apiFetch } from "@/shared/api";

// Импортируем ваш кастомный TextEditor
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";

// Типы для уроков/модулей (соответствуют FinalEditorProps)
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

interface LoadedLessonPayload {
  lesson: string;
  description: string;
}

interface LoadedTestPayload {
  test: string;
  description: string;
}

interface LoadedTaskPayload {
  name: string;
  description?: string;
}

interface LoadedModulePayload {
  title: string;
  lessons: LoadedLessonPayload[];
  tests: LoadedTestPayload[];
  tasks: LoadedTaskPayload[];
}

interface LoadModulesResponse {
  modules: LoadedModulePayload[];
}

const CourseEditPage: React.FC = () => {
  const { id } = useParams();        // ID курса из URL
  const navigate = useNavigate();

  // Локальный стейт для списка модулей
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // === 1) Загрузка модулей и уроков ===
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        // Пример: GET /courses/{id}/modules + для каждого модуля уроки
        // или если бэкенд возвращает сразу modules со списком lessons/tests/tasks.
        // Предположим, у вас есть GET /courses/{id}/load_modules, который возвращает:
        // { "modules": [ { "title": ..., "lessons": [...], "tests": [...], "tasks": [...] }, ... ] }

        const resp = await apiFetch(`/courses/${id}/load_modules`);
        if (!resp.ok) {
          throw new Error(`Ошибка при загрузке модулей: ${resp.statusText}`);
        }
        const data: LoadModulesResponse = await resp.json();

        // data.modules => [{title: string, lessons: [{lesson, description}], tests, tasks}]
        // Нужно преобразовать к типу Module (c id, ...).
        // Допустим, ваш load_modules не возвращает module.id — тогда
        // можно генерировать искусственные id, или доработать бэкенд.

        // Пример (упрощённо):
        const loadedModules = data.modules.map((m, index) => ({
          id: index + 100, // искусственно, если нет ID
          title: m.title,
          lessons: m.lessons.map((ls, i) => ({
            id: i + 1000,
            lesson: ls.lesson,
            description: ls.description,
          })),
          tests: m.tests.map((t) => ({
            test: t.test,
            description: t.description,
          })),
          tasks: m.tasks.map((tsk) => ({
            name: tsk.name,
            description: tsk.description,
          })),
        })) as Module[];

        setModules(loadedModules);
        console.log("Модули загружены:", loadedModules);
      } catch (err) {
        console.error("Ошибка загрузки модулей:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // === 2) Клик по уроку => выбираем, чтобы редактировать
  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  // === 3) Когда TextEditor меняет текст => обновляем описание урока
  const handleEditorChange = (newHTML: string) => {
    if (!selectedLesson) return;

    setModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((ls) =>
          ls.id === selectedLesson.id
            ? { ...ls, description: newHTML }
            : ls
        ),
      }))
    );

    setSelectedLesson({ ...selectedLesson, description: newHTML });
  };

  // === 4) Сохранение на сервер
  const saveModulesToServer = async () => {
    try {
      console.log("Сохраняем изменения на сервер...");

      // Если у вас на бэкенде есть save_modules: POST /courses/{id}/save_modules
      // и принимает {modules: [...]}, можно просто отправить новые данные:

      const body = {
        modules: modules.map((m) => ({
          title: m.title,
          lessons: m.lessons.map((ls) => ({
            lesson: ls.lesson,
            description: ls.description,
          })),
          tests: m.tests,
          tasks: m.tasks,
        })),
      };

      const resp = await apiFetch(`/courses/${id}/save_modules`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        throw new Error("Ошибка сохранения модулей");
      }

      console.log("✅ Все изменения успешно сохранены!");
      alert("Изменения сохранены!");
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert(String(err));
    }
  };

  // === Экспорт MD
  const exportToMarkdown = () => {
    let markdownContent = "";
    modules.forEach((mod) => {
      markdownContent += `# ${mod.title}\n\n`;
      mod.lessons.forEach((lesson) => {
        const textOnly = lesson.description.replace(/<\/?[^>]+(>|$)/g, "");
        markdownContent += `## ${lesson.lesson}\n\n${textOnly}\n\n`;
      });
      mod.tests.forEach((test) => {
        markdownContent += `### Тест: ${test.test}\n\n${test.description}\n\n`;
      });
      mod.tasks.forEach((task) => {
        markdownContent += `### Задание: ${task.name}\n\n`;
      });
    });

    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // === Экспорт PDF
  const exportToPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 10;

    modules.forEach((mod) => {
      doc.setFontSize(16);
      doc.text(mod.title, 10, y);
      y += 8;

      mod.lessons.forEach((lesson) => {
        doc.setFontSize(14);
        doc.text(lesson.lesson, 10, y);
        y += 6;
        doc.setFontSize(12);
        const textNoTags = lesson.description.replace(/<\/?[^>]+(>|$)/g, "");
        const splitText = doc.splitTextToSize(textNoTags, 180);
        doc.text(splitText, 10, y);
        y += splitText.length * 6 + 4;
      });

      mod.tests.forEach((test) => {
        doc.setFontSize(14);
        doc.text(`Тест: ${test.test}`, 10, y);
        y += 6;
        doc.setFontSize(12);
        doc.text(test.description, 10, y);
        y += 8;
      });

      mod.tasks.forEach((task) => {
        doc.setFontSize(14);
        doc.text(`Задание: ${task.name}`, 10, y);
        y += 8;
      });

      y += 10;
    });

    doc.save("course.pdf");
  };

  // === 5) Кнопка «Назад» => возвращаемся на /courses
  const handleBack = () => {
    navigate("/courses");
  };

  // === 6) Кнопка «Готово» => тоже возвращаемся на /courses
  const handleFinish = () => {
    navigate("/courses");
  };

  if (loading) {
    return <p>Загрузка...</p>;
  }

  // === РЕНДЕР ===
  return (
    <div className={styles.container}>
      <h2>Редактирование курса</h2>

      <div className={styles.content}>
        {/* Боковая панель */}
        <div className={styles.sidebar}>
          {modules.map((mod) => (
            <div key={mod.id} className={styles.module}>
              <h3>{mod.title}</h3>
              {mod.lessons.map((lesson) => (
                <p
                  key={lesson.id}
                  className={`${styles.lesson} ${
                    selectedLesson?.id === lesson.id ? styles.activeLesson : ""
                  }`}
                  onClick={() => handleLessonClick(lesson)}
                >
                  {lesson.lesson}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Основная часть */}
        <div className={styles.editorContainer}>
          {selectedLesson ? (
            <>
              <h3>{selectedLesson.lesson}</h3>
              <TextEditor
                value={selectedLesson.description}
                onChange={handleEditorChange}
              />
            </>
          ) : (
            <p className={styles.placeholder}>Выберите урок для редактирования</p>
          )}
        </div>
      </div>

      <div className={styles.buttons}>
        <Button onClick={handleBack} text="Назад" />
        <Button onClick={saveModulesToServer} text="💾 Сохранить" />
        <Button onClick={exportToMarkdown} text="📄 Экспорт в MD" />
        <Button onClick={exportToPDF} text="📄 Экспорт в PDF" />
        <Button onClick={handleFinish} text="Готово" />
      </div>
    </div>
  );
};

export default CourseEditPage;
