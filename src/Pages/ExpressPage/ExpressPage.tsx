import { useState } from 'react';
import Menu from '@/Components/Menu/Menu';
import { CourseInfoForm } from '@/Components/ExpressComponents/FIrstStep/CourseInfoForm';
import { CourseStructureForm } from '@/Components/ExpressComponents/SecondStep/CourseStructureForm';

const ExpressPage = () => {
  const [step, setStep] = useState(1);
  const [selectedValue, setSelectedValue] = useState('no');
  const [items, setItems] = useState([
    { id: 1, label: 'Текст', checked: true },
    { id: 2, label: 'Видео', checked: false },
    { id: 3, label: 'Аудио', checked: false },
    { id: 4, label: 'Интерактивные задания', checked: false },
  ]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <>
      <Menu />
      {step === 1 ? (
        <CourseInfoForm onNext={nextStep} />
      ) : (
        <CourseStructureForm
          selectedValue={selectedValue}
          items={items}
          onValueChange={setSelectedValue}
          onItemsChange={setItems}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}
    </>
  );
};

export default ExpressPage;
