import { useState } from "react";
import Menu from "@/Components/Menu/Menu";
import { CourseInfoForm } from "@/Components/ExpressComponents/FIrstStep/CourseInfoForm";
import { CourseStructureForm } from "@/Components/ExpressComponents/SecondStep/CourseStructureForm";
import Footer from "@/Components/Footer/Footer";
import OverviewCourse from "@/Components/ExpressComponents/OverviewCourse/OverviewCourse";
import FinalEditor from "@/Components/ExpressComponents/FinalEditor/FinalEditor";

// 🛠️ Добавляем интерфейс для `Module`
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

const ExpressPage = () => {
  const [step, setStep] = useState(1);
  const [modules, setModules] = useState<Module[]>([]); // ✅ Исправлено: указали `Module[]`

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4)); // Увеличил до 4-х шагов
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <>
      <Menu />
      {step === 1 ? (
        <CourseInfoForm onNext={nextStep} />
      ) : step === 2 ? (
        <CourseStructureForm onBack={prevStep} onNext={nextStep} />
      ) : step === 3 ? (
        <OverviewCourse onBack={prevStep} onNext={nextStep} setModules={setModules} /> // ✅ Передаем `setModules` c правильным типом
      ) : (
        <FinalEditor modules={modules} onBack={prevStep} onFinish={() => console.log("Курс завершен!")} /> // ✅ Теперь `modules` передается правильно
      )}
      <Footer />
    </>
  );
};

export default ExpressPage;
