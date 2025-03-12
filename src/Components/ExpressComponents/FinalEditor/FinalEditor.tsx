import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import jsPDF from "jspdf";

// Интерфейсы для модулей
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
}

interface FinalEditorProps {
  modules: Module[];
  onBack: () => void;
  onFinish: () => void;
}

const FinalEditor: React.FC<FinalEditorProps> = ({ modules: initialModules, onBack, onFinish }) => {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // **🎨 Инициализация редактора**
  const editor = useEditor({
    extensions: [StarterKit],
    content: selectedLesson?.description || "<p></p>",
    onUpdate: ({ editor }) => {
      if (selectedLesson) {
        setModules((prevModules) =>
          prevModules.map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) =>
              lesson.lesson === selectedLesson.lesson
                ? { ...lesson, description: editor.getHTML() }
                : lesson
            ),
          }))
        );
      }
    },
  });

  // **🎯 Загружаем контент при изменении выбранного урока**
  useEffect(() => {
    if (selectedLesson && editor) {
      editor.commands.setContent(selectedLesson.description || "<p></p>");
    }
  }, [selectedLesson, editor]);

  // **📌 Выбор урока**
  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  // **💾 Сохранение изменений на сервер**
  const saveModulesToServer = async () => {
    try {
      console.log("🔄 Сохраняем изменения на сервер...");
      const response = await fetch("http://127.0.0.1:8000/api/save_modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });

      if (!response.ok) throw new Error("Ошибка сохранения модулей");
      console.log("✅ Модули успешно сохранены!");
    } catch (err) {
      console.error("❌ Ошибка сохранения:", err);
    }
  };

  // **📄 Экспорт в Markdown**
  const exportToMarkdown = () => {
    let markdownContent = "";

    modules.forEach((module) => {
      markdownContent += `# ${module.title}\n\n`;
      module.lessons.forEach((lesson) => {
        markdownContent += `## ${lesson.lesson}\n\n${lesson.description.replace(/<\/?[^>]+(>|$)/g, "")}\n\n`;
      });
      module.tests.forEach((test) => {
        markdownContent += `### Тест: ${test.test}\n\n${test.description}\n\n`;
      });
      module.tasks.forEach((task) => {
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

  // **📄 Экспорт в PDF**
  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;

    modules.forEach((module) => {
      doc.setFontSize(16);
      doc.text(module.title, 10, y);
      y += 8;

      module.lessons.forEach((lesson) => {
        doc.setFontSize(14);
        doc.text(lesson.lesson, 10, y);
        y += 6;
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(lesson.description.replace(/<\/?[^>]+(>|$)/g, ""), 180);
        doc.text(splitText, 10, y);
        y += splitText.length * 6 + 4;
      });

      module.tests.forEach((test) => {
        doc.setFontSize(14);
        doc.text(`Тест: ${test.test}`, 10, y);
        y += 6;
        doc.setFontSize(12);
        doc.text(test.description, 10, y);
        y += 8;
      });

      module.tasks.forEach((task) => {
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
          {modules.map((module, moduleIndex) => (
            <div key={moduleIndex} className={styles.module}>
              <h3>{module.title}</h3>
              {module.lessons.map((lesson, lessonIndex) => (
                <p
                  key={lessonIndex}
                  className={`${styles.lesson} ${selectedLesson?.lesson === lesson.lesson ? styles.activeLesson : ""}`}
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
              <EditorContent editor={editor} />
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
