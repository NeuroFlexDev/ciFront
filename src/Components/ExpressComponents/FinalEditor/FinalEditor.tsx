import React, { useState } from "react";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import { apiFetch } from "@/shared/api";

// 1) Импортируем ваш кастомный TextEditor
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";

// Интерфейсы
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
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Когда кликают урок в сайдбаре, выбираем его
  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  // Когда ваш TextEditor меняет текст, обновляем description выбранного урока
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

    // Обновляем local selectedLesson тоже
    setSelectedLesson((prev) =>
      prev ? { ...prev, description: newHTML } : null
    );
  };

  // Сохранение на сервер (PUT /modules/{id}, PUT /lessons/{id}, ...)
  const saveModulesToServer = async () => {
    try {
      for (const mod of modules) {
        const respMod = await apiFetch(`/modules/${mod.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: mod.title }),
        });
        if (!respMod.ok) {
          throw new Error(`Ошибка при обновлении модуля ID=${mod.id}`);
        }

        for (const les of mod.lessons) {
          const respLes = await apiFetch(`/lessons/${les.id}`, {
            method: "PUT",
            body: JSON.stringify({
              title: les.lesson,
              description: les.description,
            }),
          });
          if (!respLes.ok) {
            throw new Error(`Ошибка при обновлении урока ID=${les.id}`);
          }
        }
      }

      alert("Изменения сохранены!");
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert(String(err));
    }
  };

  // Экспорт MD
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

  // Экспорт PDF
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Редактор курса</h2>
        <p className={styles.description}>
          Выберите урок слева, отредактируйте содержание справа и сохраните изменения.
        </p>
      </div>

      <div className={styles.content}>
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

        <div className={styles.editorContainer}>
          {selectedLesson ? (
            <>
              <h3 className={styles.lessonHeading}>{selectedLesson.lesson}</h3>
              <TextEditor value={selectedLesson.description} onChange={handleEditorChange} />
            </>
          ) : (
            <p className={styles.placeholder}>Выберите урок для редактирования</p>
          )}
        </div>
      </div>

      <div className={styles.buttons}>
        <Button onClick={onBack} text="Назад" />
        <Button onClick={saveModulesToServer} text="Сохранить" />
        <Button onClick={exportToMarkdown} text="Экспорт в MD" />
        <Button onClick={exportToPDF} text="Экспорт в PDF" />
        <Button onClick={onFinish} text="Готово" />
      </div>
    </div>
  );
};

export default FinalEditor;
