import React, {
  useMemo,
  useState,
} from "react";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import { apiFetch } from "@/shared/api";
import CourseStats from "./Components/CourseStats/CourseStats";
import ModuleTimeline from "./Components/ModuleTimeline/ModuleTimeline";
import ModuleEditor from "./Components/ModuleEditor/ModuleEditor";
import arrowLeft from "../../../assets/icons/common/arrowleft.svg";
import arrowRight from "../../../assets/icons/common/arrowRight.svg";
import type {
  Lesson,
  Module,
} from "../../ExpressComponents/FinalEditor/Components/types/types";

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
  const [modules, setModules] =
    useState<Module[]>(initialModules);

  const [selectedModuleId, setSelectedModuleId] =
    useState<number | null>(null);

  const [selectedLessonId, setSelectedLessonId] =
    useState<number | null>(null);

  const selectedModule = useMemo(() => {
    if (selectedModuleId === null) {
      return null;
    }
    return (
      modules.find(
        (module) =>
          module.id === selectedModuleId
      ) ?? null
    );
  }, [
    modules,
    selectedModuleId,
  ]);

  const selectedLesson = useMemo(() => {
    if (
      !selectedModule ||
      selectedLessonId === null
    ) {
      return null;
    }

    return (
      selectedModule.lessons.find(
        (lesson) =>
          lesson.id === selectedLessonId
      ) ?? null
    );
  }, [
    selectedModule,
    selectedLessonId,
  ]);

  const lessonsCount = useMemo(() => {
    return modules.reduce(
      (total, module) =>
        total + module.lessons.length,
      0
    );
  }, [modules]);

  const duration = useMemo(() => {
    const hours = Math.max(
      1,
      Math.round(lessonsCount * 2)
    );

    return `~${hours} часа`;
  }, [lessonsCount]);

  const handleModuleClick = (
    module: Module
  ) => {
    setSelectedModuleId(module.id);

    if (module.lessons.length > 0) {
      setSelectedLessonId(
        module.lessons[0].id
      );
    } else {
      setSelectedLessonId(null);
    }
    // Прокручиваем к редактору
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCloseModule = () => {
    setSelectedModuleId(null);
    setSelectedLessonId(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleLessonSelect = (
    lesson: Lesson
  ) => {
    setSelectedLessonId(lesson.id);
  };

  const handleEditorChange = (
    newHTML: string
  ) => {
    if (
      selectedModuleId === null ||
      selectedLessonId === null
    ) {
      return;
    }

    setModules((prev) =>
      prev.map((module) => {
        if (
          module.id !== selectedModuleId
        ) {
          return module;
        }

        return {
          ...module,

          lessons: module.lessons.map(
            (lesson) =>
              lesson.id ===
              selectedLessonId
                ? {
                    ...lesson,
                    description:
                      newHTML,
                  }
                : lesson
          ),
        };
      })
    );
  };

  const handleAddModule = () => {
    console.log(
      "Добавить новый модуль"
    );
  };

  const handleAddLesson = () => {
    if (!selectedModule) {
      return;
    }
    const newLesson: Lesson = {
      id: Date.now(),
      lesson: `Новый урок ${
        selectedModule.lessons.length + 1
      }`,
      description:
        "<p>Введите содержание урока...</p>",
    };

    setModules((prev) =>
      prev.map((module) =>
        module.id ===
        selectedModule.id
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                newLesson,
              ],
            }
          : module
      )
    );

    setSelectedLessonId(
      newLesson.id
    );
  };

  const handleDeleteLesson = () => {
    if (
      !selectedModule ||
      !selectedLesson
    ) {
      return;
    }

    const lessonIndex =
      selectedModule.lessons.findIndex(
        (lesson) =>
          lesson.id ===
          selectedLesson.id
      );

    const newLessons =
      selectedModule.lessons.filter(
        (lesson) =>
          lesson.id !==
          selectedLesson.id
      );

    setModules((prev) =>
      prev.map((module) =>
        module.id ===
        selectedModule.id
          ? {
              ...module,
              lessons: newLessons,
            }
          : module
      )
    );

    // Выбираем соседний урок
    if (newLessons.length > 0) {
      const nextIndex = Math.min(
        lessonIndex,
        newLessons.length - 1
      );

      setSelectedLessonId(
        newLessons[nextIndex].id
      );
    } else {
      setSelectedLessonId(null);
    }
  };

  const handleDeleteModule = () => {
    if (!selectedModule) {
      return;
    }

    setModules((prev) =>
      prev.filter(
        (module) =>
          module.id !==
          selectedModule.id
      )
    );

    handleCloseModule();
  };

  const handleImproveWithAI = () => {
    console.log(
      "Улучшить урок с помощью ИИ"
    );
  };

  const handleSave = async () => {
    try {
      for (const module of modules) {
        const moduleResponse =
          await apiFetch(
            `/modules/${module.id}`,
            {
              method: "PUT",

              body: JSON.stringify({
                title: module.title,
              }),
            }
          );

        if (!moduleResponse.ok) {
          throw new Error(
            `Ошибка обновления модуля ${module.id}`
          );
        }

        for (const lesson of module.lessons) {
          const lessonResponse =
            await apiFetch(
              `/lessons/${lesson.id}`,
              {
                method: "PUT",

                body: JSON.stringify({
                  title: lesson.lesson,

                  description:
                    lesson.description,
                }),
              }
            );

          if (!lessonResponse.ok) {
            throw new Error(
              `Ошибка обновления урока ${lesson.id}`
            );
          }
        }
      }

      alert(
        "Изменения сохранены!"
      );
    } catch (error) {
      console.error(
        "Ошибка сохранения:",
        error
      );

      alert(
        String(error)
      );
    }
  };


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Онбординг отдела продаж
        </h1>
      </header>

      <CourseStats
        modulesCount={modules.length}
        lessonsCount={lessonsCount}
        duration={duration}
      />

      {!selectedModule ? (
        <ModuleTimeline
          modules={modules}
          onModuleClick={
            handleModuleClick
          }
          onAddModule={
            handleAddModule
          }
        />
      ) : (
        <ModuleEditor
          module={selectedModule}
          selectedLesson={
            selectedLesson
          }

          onLessonSelect={
            handleLessonSelect
          }

          onEditorChange={
            handleEditorChange
          }

          onClose={
            handleCloseModule
          }

          onDeleteModule={
            handleDeleteModule
          }

          onImproveWithAI={
            handleImproveWithAI
          }

          onAddLesson={
            handleAddLesson
          }

          onDeleteLesson={
            handleDeleteLesson
          }
        />
      )}

      <div className={styles.buttons}>

        <div
          style={{
            maxWidth: "145px",
          }}
        >
          <Button
            onClick={onBack}
            text="Назад"
            icon={
              <img
                src={arrowLeft}
                alt="back"
              />
            }
            iconPosition="left"
          />
        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <Button
            onClick={handleSave}
            text="Сохранить"
          />

          <Button
            onClick={onFinish}
            text="Опубликовать"
            iconPosition="right"
            icon={
              <img
                src={arrowRight}
                alt="next"
              />
            }
          />
        </div>

      </div>

    </div>
  );
};

export default FinalEditor;