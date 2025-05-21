import React, { useState } from "react";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import Menu from "@/Components/Menu/Menu";
import { CourseInfoForm } from "@/Components/ExpressComponents/FIrstStep/CourseInfoForm";
import { CourseStructureForm } from "@/Components/ExpressComponents/SecondStep/CourseStructureForm";
import OverviewCourse from "@/Components/ExpressComponents/OverviewCourse/OverviewCourse";
import FinalEditor from "@/Components/ExpressComponents/FinalEditor/FinalEditor";
import Footer from "@/Components/Footer/Footer";

// --- Интерфейсы (совпадают с FinalEditor/OverviewCourse) ---
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

const ExpressPage = () => {
  const [step, setStep] = useState(2);

  // Храним массив модулей в стейте (изначально пуст)
  const [modules, setModules] = useState<Module[]>([]);

  // Храним courseId и csId в sessionStorage (useSessionStorage)
  const [courseId, setCourseId] = useSessionStorage<number | null>("courseId", null);
  const [csId, setCsId] = useSessionStorage<number | null>("csId", null);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  /**
   * 1) Когда пользователь создаёт курс (CourseInfoForm), бэкенд возвращает {id: ...}.
   * Мы сохраняем courseId (useSessionStorage).
   */
  const handleCourseCreated = (createdCourseId: number) => {
    setCourseId(createdCourseId);
    nextStep();
  };

  /**
   * 2) Когда пользователь создаёт структуру (CourseStructureForm), бэкенд возвращает {id: ...}.
   * Сохраняем csId (useSessionStorage).
   */
  const handleStructureCreated = (createdStructId: number) => {
    setCsId(createdStructId);
    nextStep();
  };

  // Рендер страниц в зависимости от step
  return (
    <>
      <Menu />

      {step === 1 ? (
        // Шаг 1: создание курса
        <CourseInfoForm onNext={handleCourseCreated} />
      ) : step === 2 ? (
        // Шаг 2: структура курса
        <CourseStructureForm onBack={prevStep} onNext={handleStructureCreated} />
      ) : step === 3 ? (
        // Шаг 3: генерация + загрузка модулей/уроков
        // Передаём setModules, чтобы OverviewCourse после генерации мог заполнить modules
        <OverviewCourse
          courseId={courseId!}
          csId={csId!}
          onBack={prevStep}
          onNext={nextStep}
          setModules={setModules}
        />
      ) : (
        // Шаг 4: редактор (FinalEditor)
        <FinalEditor
          modules={modules}
          onBack={prevStep}
          onFinish={() => console.log("Курс завершен!")}
        />
      )}

      <Footer />
    </>
  );
};

export default ExpressPage;
