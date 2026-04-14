import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import Menu from "@/Components/Menu/Menu";
import { CourseInfoForm } from "@/Components/ExpressComponents/FIrstStep/CourseInfoForm";
import { CourseStructureForm } from "@/Components/ExpressComponents/SecondStep/CourseStructureForm";
import OverviewCourse from "@/Components/ExpressComponents/OverviewCourse/OverviewCourse";
import FinalEditor from "@/Components/ExpressComponents/FinalEditor/FinalEditor";
import Footer from "@/Components/Footer/Footer";
import styles from "./styles.module.css";

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
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredFlow = searchParams.get("flow") === "canvas" ? "canvas" : "generate";

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

  const handleCanvasProjectCreated = (createdCourseId: number) => {
    setCourseId(createdCourseId);
    navigate(`/courses/${createdCourseId}/canvas`, { replace: true });
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

      <main className={styles.page}>
        <section className={styles.headerBlock}>
          <p className={styles.kicker}>Новый проект</p>
          <h1 className={styles.title}>Создание курса</h1>
          <p className={styles.lead}>
            Последовательный путь: карточка проекта, структура, генерация и финальная редактура.
          </p>

          <div className={styles.steps}>
            {[1, 2, 3, 4].map((item) => (
              <span key={item} className={item === step ? styles.stepActive : styles.step}>
                Шаг {item}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.content}>
          {step === 1 ? (
            <CourseInfoForm
              onNext={handleCourseCreated}
              onOpenCanvas={handleCanvasProjectCreated}
              preferredFlow={preferredFlow}
            />
          ) : step === 2 ? (
            <CourseStructureForm onBack={prevStep} onNext={handleStructureCreated} />
          ) : step === 3 ? (
            <OverviewCourse
              courseId={courseId!}
              csId={csId!}
              onBack={prevStep}
              onNext={nextStep}
              setModules={setModules}
            />
          ) : (
            <FinalEditor
              modules={modules}
              onBack={prevStep}
              onFinish={() => console.log("Курс завершен!")}
            />
          )}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ExpressPage;
