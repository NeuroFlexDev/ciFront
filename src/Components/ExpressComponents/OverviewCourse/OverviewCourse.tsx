import React, { useState, useEffect } from "react";
import ModuleBlock from "@/Components/ModuleBlock/ModuleBlock";
import styles from "./styles.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import Loader from "@/Components/ElementUi/Loader/Loader";
import { apiFetch } from "@/shared/api";
import Input from "@/Components/ElementUi/Input/Input";
import CourseDifficulty from "@/Components/ElementUi/CourseDifficulty/CourseDifficulty";
import LanguageSelect from "@/Components/ElementUi/LanguageSelect/LanguageSelect";
import LessonCountSlider from "@/Components/ElementUi/LessonCountSlider/LessonCountSlider";
import ToggleField from "@/Components/ElementUi/ToggleField/ToggleField";
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';

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

interface ModuleListItem {
  id: number;
  title: string;
  course_id: number;
}

interface LessonListItem {
  id: number;
  title: string;
  description: string;
  module_id: number;
}

type DifficultyLevel = "internship" | "basic" | "intermediate" | "advanced";

const OverviewCourse: React.FC<OverviewCourseProps> = ({
  courseId,
  csId,
  onBack,
  onNext,
  setModules,
}) => {
  const [modules, setLocalModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для полей формы
  const [courseName, setCourseName] = useState("Онбординг отдела продаж");
  const [courseGoal, setCourseGoal] = useState("Сотрудник должен знать продукт, воронку продаж и уметь работать с возражениями клиентов.");
  const [courseAudience, setCourseAudience] = useState("Новые менеджеры по продажам");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | undefined>();
  const [language, setLanguage] = useState("ru");
  const [lessonCount, setLessonCount] = useState(14);
  const [moduleTests, setModuleTests] = useState(false);
  const [finalTest, setFinalTest] = useState(false);

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        const genResp = await apiFetch(`/courses/${courseId}/generate_modules?cs_id=${csId}`);
        if (!genResp.ok) {
          throw new Error("Ошибка при генерации модулей");
        }
        await genResp.json();

        const modsListResp = await apiFetch(`/courses/${courseId}/modules/`);
        if (!modsListResp.ok) {
          throw new Error("Ошибка при загрузке списка модулей");
        }
        const modsList: ModuleListItem[] = await modsListResp.json();

        const loadedModules: ModuleItem[] = modsList.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: [],
          tests: [],
          tasks: [],
        }));

        for (const moduleItem of loadedModules) {
          const genLessonsUrl =
            `/courses/${courseId}/generate_module_lessons?cs_id=${csId}` +
            `&module_id=${moduleItem.id}&module_title=${encodeURIComponent(moduleItem.title)}`;
          const genLessonsResp = await apiFetch(genLessonsUrl, {
            method: "POST",
          });
          if (!genLessonsResp.ok) {
            throw new Error("Ошибка генерации уроков");
          }
          await genLessonsResp.json();

          const lessonsResp = await apiFetch(`/courses/${courseId}/modules/${moduleItem.id}/lessons/`);
          if (!lessonsResp.ok) {
            throw new Error("Ошибка при загрузке уроков");
          }
          const lessonsData: LessonListItem[] = await lessonsResp.json();

          const typedLessons = lessonsData.map((ls) => ({
            id: ls.id,
            lesson: ls.title,
            description: ls.description,
          }));

          moduleItem.lessons = typedLessons;
        }

        if (!abort) {
          setLocalModules(loadedModules);
          if (setModules) {
            setModules(loadedModules);
          }
        }
      } catch (error) {
        if (!abort) {
          console.error("Ошибка при генерации или загрузке модулей:", error);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [courseId, csId, setModules]);

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <Input
          type="text"
          placeholder="Онбординг отдела продаж"
          label="Название курса"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          icon
        />

        <Input
          type="textarea"
          placeholder="Сотрудник должен знать продукт, воронку продаж и уметь работать с возражениями клиентов."
          label="Цель курса"
          value={courseGoal}
          onChange={(e) => setCourseGoal(e.target.value)}
          rows={3}
          icon
        />

        <Input
          type="text"
          placeholder="Новые менеджеры по продажам"
          label="Для кого курс"
          value={courseAudience}
          onChange={(e) => setCourseAudience(e.target.value)}
          icon
        />

        <CourseDifficulty value={difficulty} onChange={setDifficulty} />

        <div className={styles.row}>
          <LanguageSelect value={language} onChange={setLanguage} />
          <LessonCountSlider 
            value={lessonCount} 
            onChange={setLessonCount}
            max={100}
          />
        </div>

        <div className={styles.toggles}>
          <ToggleField
            label="Тесты после каждого модуля"
            checked={moduleTests}
            onChange={setModuleTests}
          />
          <ToggleField
            label="Финальный тест"
            checked={finalTest}
            onChange={setFinalTest}
          />
        </div>
      </div>

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

      <div className={styles.actions}>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text="Назад"
            onClick={onBack}
            variant="secondary"
            icon={<img src={arrowLeft} alt="back" />}
            iconPosition="left"
          />
        </div>
        <div style={{ maxWidth: '145px' }}>
          <Button
            onClick={onNext}
            variant="primary"
            text="Далее"
            disabled={loading}
            iconPosition="right"
            icon={<img src={arrowRight} alt="next" />}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewCourse;
