import { useState } from 'react';
import Menu from '@/Components/Menu/Menu';
import { CourseInfoForm } from '@/Components/ExpressComponents/FIrstStep/CourseInfoForm';
import { CourseStructureForm } from '@/Components/ExpressComponents/SecondStep/CourseStructureForm';
import Footer from '@/Components/Footer/Footer';
import OverviewCourse from '@/Components/ExpressComponents/OverviewCourse/OverviewCourse';

const ExpressPage = () => {
  const [step, setStep] = useState(1);
  const [selectedValue, setSelectedValue] = useState('no');
  const [items, setItems] = useState([
    { id: 1, label: 'Текст', checked: true },
    { id: 2, label: 'Видео', checked: false },
    { id: 3, label: 'Аудио', checked: false },
    { id: 4, label: 'Интерактивные задания', checked: false },
  ]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <>
      <Menu />
      {step === 1 ? (
        <CourseInfoForm onNext={nextStep} />
      ) : step === 2 ? (
        <CourseStructureForm
          selectedValue={selectedValue}
          items={items}
          onValueChange={setSelectedValue}
          onItemsChange={setItems}
          onBack={prevStep}
          onNext={nextStep}
        />
      ) : (
        <OverviewCourse onBack={prevStep} onNext={nextStep} />
      )}
      <Footer />
    </>
  );
};

export default ExpressPage;
