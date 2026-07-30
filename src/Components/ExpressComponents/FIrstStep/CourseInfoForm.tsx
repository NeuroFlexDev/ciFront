import React, { useState } from "react";
import { FormField } from "@/Components/ExpressComponents/FormField/FormField";
import Input from "@/Components/ElementUi/Input/Input";
import Select from "@/Components/ElementUi/Select/Select";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import Button from "@/Components/ElementUi/Button/Button";
import { CourseModeSelection, type ModeItem } from "../../ElementUi/CardSelect/CardSelect";
import styles from "./styles.module.css";
import { apiFetch } from "@/shared/api";

import upload from '../../../assets/icons/step/stepFirst/import.svg';
import setting from '../../../assets/icons/step/stepFirst/settings.svg';
import structure from '../../../assets/icons/step/stepFirst/struture.svg';
import edit from '../../../assets/icons/step/stepFirst/edit.svg';
import document from '../../../assets/icons/step/stepFirst/document.svg';
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';


const StepByStepIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UploadIcon = () => (
  <img src={upload} alt= "download" />
);

const SettingsIcon = () => (
  <img src={setting} alt= "setting" />
);

const StructureIcon = () => (
  <img src={structure} alt= "structure" />
);

const EditIcon = () => (
  <img src={edit} alt= "edit" />
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 11.5C21.0035 12.8199 20.6615 14.1177 20.0061 15.2649C19.3507 16.4122 18.4037 17.3697 17.2511 18.0512C16.0985 18.7327 14.7767 19.1166 13.4069 19.1669C12.0371 19.2173 10.6632 18.9326 9.40003 18.336L3.00003 21L5.00003 14.5C4.33336 13.3333 4.00003 12 4.00003 10.5C4.00003 7.73858 5.10003 5.09003 7.05803 3.13203C9.01603 1.17403 11.6645 0.074028 14.426 0.074028C17.1875 0.074028 19.836 1.17403 21.794 3.13203C23.752 5.09003 24.852 7.73858 24.852 10.5" stroke="#C6F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DocumentIcon = () => (
  <img src={document} alt= "document" />
);

interface LocalDropdownItem {
  id: number;
  name: string;
}

interface SelectDropdownItem {
  id: string | number;
  name: string;
}

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
  const [step, setStep] = useState<"mode" | "form">("mode");
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<LocalDropdownItem | undefined>(undefined);
  const [language, setLanguage] = useState<LocalDropdownItem | undefined>(undefined);
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const levels: LocalDropdownItem[] = [
    { id: 1, name: "Курс с нуля" },
    { id: 2, name: "Для начинающих" },
    { id: 3, name: "Мастер в программировании" },
  ];

  const languages: LocalDropdownItem[] = [
    { id: 1, name: "Русский" },
    { id: 2, name: "English" },
  ];

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

  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
  };

  const handleNext = () => {
    if (step === "mode" && selectedMode) {
      setStep("form");
    } else if (step === "form") {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === "form") {
      setStep("mode");
    } else if (onBack) {
      onBack();
    }
  };

  const handleTitleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setDescription(e.target.value);
  };

  const handleLevelChange = (selected: SelectDropdownItem) => {
    setLevel({ id: Number(selected.id), name: selected.name });
  };

  const handleLanguageChange = (selected: SelectDropdownItem) => {
    setLanguage({ id: Number(selected.id), name: selected.name });
  };

  const handleSubmit = async () => {
    if (!title || !description || !level || !language) {
      alert("Заполните все поля!");
      return;
    }

    try {
      setIsSubmitting(true);
      // 1) СОЗДАЁМ КУРС
      const resp = await apiFetch("/courses/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          level: level.id,
          language: language.id,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Ошибка при сохранении курса: ${resp.statusText}`);
      }

      const createdCourse = await resp.json();

      if (additionalFile) {
        const formData = new FormData();
        formData.append("file", additionalFile);

        const uploadResp = await apiFetch(`/courses/${createdCourse.id}/upload-description`, {
          method: "POST",
          body: formData,
        });

        if (!uploadResp.ok) {
          throw new Error(`Ошибка при загрузке файла: ${uploadResp.statusText}`);
        }

        await uploadResp.json();
      }

      if (selectedMode === "chat-consultant") {
        onOpenCanvas(createdCourse.id);
      } else {
        onNext(createdCourse.id);
      }

    } catch (error) {
      console.error("Ошибка при отправке данных", error);
      alert(`Ошибка: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.expressCourseContainer}>
      {step === "mode" ? (
        <>
          <CourseModeSelection
            modes={modes}
            selectedMode={selectedMode}
            onSelectMode={handleModeSelect}
          />
        </>
      ) : (
        <>
          <p className={styles.title}>Карточка проекта</p>
          <p className={styles.flowDescription}>
            Заполните информацию о вашем курсе
          </p>
          <div className={styles.contCont}>
            <div className={styles.fieldContainer}>
              <FormField label="Введите название вашего курса">
                <Input
                  type="text"
                  placeholder="Курс по основам программирования на C#"
                  value={title}
                  onChange={handleTitleChange}
                />
              </FormField>

              <FormField label="Описание вашего курса">
                <Input
                  type="textarea"
                  placeholder="Благодаря данному курсу вы сможете стать Junior C# разработчиком"
                  rows={10}
                  value={description}
                  onChange={handleDescriptionChange}
                />
              </FormField>

              <FormField label="Уровень курса">
                <Select
                  items={levels}
                  placeholder="Выберите уровень курса"
                  value={level ?? undefined}
                  onChange={handleLevelChange}
                />
              </FormField>

              <FormField label="Язык курса">
                <Select
                  items={languages}
                  placeholder="Выберите язык обучения"
                  value={language ?? undefined}
                  onChange={handleLanguageChange}
                />
              </FormField>

              <FormField label="Дополнительные материалы (необязательно)">
                <UploadFile
                  onFileSelect={(file) => setAdditionalFile(file)}
                  maxSize={10 * 1024 * 1024}
                />
              </FormField>
            </div>
          </div>
        </>
      )}

      <div className={styles.actionsRow}>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text="Назад"
            onClick={handleBack}
            variant="secondary"
            icon={<img src={arrowLeft} alt="back" />}
            iconPosition="left"
            disabled={step === "mode" && !onBack}
          />
        </div>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text={
              step === "mode"
                ? "Далее"
                : isSubmitting
                ? "Создание..."
                : "Далее"
            }
            onClick={handleNext}
            variant="primary"
            icon={<img src={arrowRight} alt="next" />}
            iconPosition="right"
            disabled={step === "mode" ? !selectedMode : isSubmitting}
          />
        </div>
        </div>
    </div>
  );
};