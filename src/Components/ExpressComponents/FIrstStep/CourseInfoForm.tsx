// src/Components/ExpressComponents/FIrstStep/CourseInfoForm.tsx

import React, { useState } from "react";
import { FormField } from "@/Components/ExpressComponents/FormField/FormField";
import Input from "@/Components/ElementUi/Input/Input";
import Select from "@/Components/ElementUi/Select/Select";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import Button from "@/Components/ElementUi/Button/Button";
import { api } from "@/shared/api";
import styles from "./styles.module.css";

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
}

export const CourseInfoForm: React.FC<CourseInfoFormProps> = ({ onNext }) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<LocalDropdownItem | undefined>();
  const [language, setLanguage] = useState<LocalDropdownItem | undefined>();
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);

  const levels: LocalDropdownItem[] = [
    { id: 1, name: "Курс с нуля" },
    { id: 2, name: "Для начинающих" },
    { id: 3, name: "Мастер в программировании" },
  ];

  const languages: LocalDropdownItem[] = [
    { id: 1, name: "Русский" },
    { id: 2, name: "English" },
  ];

  const handleTitleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setTitle(e.target.value);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setDescription(e.target.value);

  const handleLevelChange = (selected: SelectDropdownItem) => {
    setLevel({ id: Number(selected.id), name: selected.name });
  };

  const handleLanguageChange = (selected: SelectDropdownItem) => {
    setLanguage({ id: Number(selected.id), name: selected.name });
  };

  const handleSubmit = async () => {
    console.log("Перед отправкой:", { title, description, level, language, additionalFile });

    if (!title || !description || !level || !language) {
      alert("Заполните все поля!");
      return;
    }

    try {
      // 1) Создаем курс
      const courseResponse = await api.post("/courses/", {
        title,
        description,
        level: level.id,
        language: language.id,
      });
      const createdCourse = courseResponse.data;
      console.log("✅ Курс успешно создан:", createdCourse);

      // 2) Если есть файл — загружаем
      if (additionalFile) {
        const formData = new FormData();
        formData.append("file", additionalFile);

        const uploadResponse = await api.post(
          `/courses/${createdCourse.id}/upload-description`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log("✅ Файл успешно загружен:", uploadResponse.data);
      }

      onNext(createdCourse.id);
    } catch (err: any) {
      console.error("Ошибка при отправке данных", err);
      const message = err.response?.data?.message || err.message || "Неизвестная ошибка";
      alert(`Ошибка: ${message}`);
    }
  };

  return (
    <div className={styles.expressCourseContainer}>
      <p className={styles.title}>Давайте приступим!</p>
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
              value={level}
              onChange={handleLevelChange}
            />
          </FormField>

          <FormField label="Язык курса">
            <Select
              items={languages}
              placeholder="Выберите язык обучения"
              value={language}
              onChange={handleLanguageChange}
            />
          </FormField>

          <FormField label="Дополнительные материалы (необязательно)">
            <UploadFile
              onFileSelect={(file) => setAdditionalFile(file)}
              maxSize={10 * 1024 * 1024}
            />
          </FormField>

          <Button text="Продолжить" onClick={handleSubmit} variant="primary" />
        </div>
      </div>
    </div>
  );
};
