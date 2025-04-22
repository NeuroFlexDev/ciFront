import React, { useState } from "react";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import jsPDF from "jspdf";
import axios from "axios";

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
      console.log("🔄 Сохраняем изменения на сервер...");
      const requests = [];

      // Собираем все запросы
      for (const mod of modules) {
        // Обновление модуля
        requests.push(
          axios.put(`http://127.0.0.1:8000/api/modules/${mod.id}`, {
            title: mod.title
          })
        );

        // Обновление уроков
        for (const les of mod.lessons) {
          requests.push(
            axios.put(`http://127.0.0.1:8000/api/lessons/${les.id}`, {
              title: les.lesson,
              description: les.description
            })
          );
        }
      }

      // Выполняем все запросы параллельно
      await Promise.all(requests);
      
      console.log("✅ Все изменения успешно сохранены!");
      alert("Изменения сохранены!");
    } catch (err) {
      console.error("❌ Ошибка сохранения:", err);
      const message = axios.isAxiosError(err) 
        ? err.response?.data?.message || err.message
        : "Неизвестная ошибка";
      alert(`Ошибка сохранения: ${message}`);
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
  const exportToPDF = () => {
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
      <h2>Редактирование курса</h2>

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
              <h3>{selectedLesson.lesson}</h3>
              {/* TextEditor со значением description */}
              <TextEditor value={selectedLesson.description} onChange={handleEditorChange} />
            </>
          ) : (
            <p className={styles.placeholder}>Выберите урок для редактирования</p>
          )}
        </div>
      </div>

      <div className={styles.buttons}>
        <Button onClick={onBack} text="Назад" />
        <Button onClick={saveModulesToServer} text="💾 Сохранить" />
        <Button onClick={exportToMarkdown} text="📄 Экспорт в MD" />
        <Button onClick={exportToPDF} text="📄 Экспорт в PDF" />
        <Button onClick={onFinish} text="Готово" />
      </div>
    </div>
  );
};

export default FinalEditor;
