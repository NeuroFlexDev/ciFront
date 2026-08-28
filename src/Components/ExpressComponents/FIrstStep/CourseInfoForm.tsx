import React, { useState } from "react";
import { CourseModeSelection, type ModeItem } from "../../ElementUi/CardSelect/CardSelect";
import Button from "@/Components/ElementUi/Button/Button";
import styles from "./styles.module.css";
import upload from '../../../assets/icons/step/stepFirst/import.svg';
import setting from '../../../assets/icons/step/stepFirst/settings.svg';
import structure from '../../../assets/icons/step/stepFirst/struture.svg';
import edit from '../../../assets/icons/step/stepFirst/edit.svg';
import document from '../../../assets/icons/step/stepFirst/document.svg';
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';
import { apiFetch } from '@/shared/api';

const StepByStepIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 11.5C21.0035 12.8199 20.6615 14.1177 20.0061 15.2649C19.3507 16.4122 18.4037 17.3697 17.2511 18.0512C16.0985 18.7327 14.7767 19.1166 13.4069 19.1669C12.0371 19.2173 10.6632 18.9326 9.40003 18.336L3.00003 21L5.00003 14.5C4.33336 13.3333 4.00003 12 4.00003 10.5C4.00003 7.73858 5.10003 5.09003 7.05803 3.13203C9.01603 1.17403 11.6645 0.074028 14.426 0.074028C17.1875 0.074028 19.836 1.17403 21.794 3.13203C23.752 5.09003 24.852 7.73858 24.852 10.5" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UploadIcon = () => <img src={upload} alt="download" />;
const SettingsIcon = () => <img src={setting} alt="setting" />;
const StructureIcon = () => <img src={structure} alt="structure" />;
const EditIcon = () => <img src={edit} alt="edit" />;
const DocumentIcon = () => <img src={document} alt="document" />;

const modes: ModeItem[] = [
  {
    id: "step-by-step",
    icon: <StepByStepIcon />,
    title: "Шаг за шагом",
    description: "Заполните форму, загрузите документы — ИИ сам соберёт готовый курс по вашим параметрам.",
    features: [
      { icon: <UploadIcon />, text: "Загрузка документов" },
      { icon: <SettingsIcon />, text: "Настройка параметров" },
      { icon: <StructureIcon />, text: "Автогенерация структуры" },
      { icon: <EditIcon />, text: "Редактирование курса" },
    ],
  },
  {
    id: "chat-consultant",
    icon: <ChatIcon />,
    title: "Чат с нейро-консультантом",
    description: "Общайтесь с ИИ как с методологом — уточняйте детали, стройте курс в диалоге итерационно",
    features: [
      { icon: <StructureIcon />, text: "Диалог с ИИ-методологом" },
      { icon: <SettingsIcon />, text: "Гибкая настройка через чат" },
      { icon: <DocumentIcon />, text: "Документы прямо в диалоге" },
      { icon: <EditIcon />, text: "Редактирование курса" },
    ],
  },
];

interface CourseInfoFormProps {
  onNext: (courseId: number) => void;
  onOpenCanvas: (courseId: number) => void;
  onBack?: () => void;
  preferredFlow?: "generate" | "canvas";
}

export const CourseInfoForm = ({ 
  onNext, 
  onOpenCanvas, 
  onBack,
  preferredFlow = "generate"
}: CourseInfoFormProps) => {
  const [selectedMode, setSelectedMode] = useState<string | null>(() => (
    preferredFlow === "canvas" ? "chat-consultant" : "step-by-step"
  ));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (!selectedMode || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/courses/drafts', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Не удалось создать черновик курса');
      }

      const draft = (await response.json()) as { id: number };
      if (selectedMode === "chat-consultant") {
        onOpenCanvas(draft.id);
      } else {
        onNext(draft.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать черновик курса';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.expressCourseContainer}>
      <CourseModeSelection
        modes={modes}
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
      />

      <div className={styles.actionsRow}>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text="Назад"
            onClick={onBack}
            variant="secondary"
            icon={<img src={arrowLeft} alt="back" />}
            iconPosition="left"
            disabled={!onBack}
          />
        </div>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text="Далее"
            onClick={() => void handleNext()}
            variant="primary"
            icon={<img src={arrowRight} alt="next" />}
            iconPosition="right"
            disabled={!selectedMode || isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};
