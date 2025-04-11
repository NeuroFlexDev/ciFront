import React, { useState } from "react";
import { FormField } from "@/Components/ExpressComponents/FormField/FormField";
import Input from "@/Components/ElementUi/Input/Input";
import Select from "@/Components/ElementUi/Select/Select";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import Button from "@/Components/ElementUi/Button/Button";
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

export const CourseInfoForm = ({ onNext }: CourseInfoFormProps) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<LocalDropdownItem | undefined>(undefined);
  const [language, setLanguage] = useState<LocalDropdownItem | undefined>(undefined);
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

  /**
   * Логика двух запросов:
   *  1) POST /api/courses/ для создания курса (JSON)
   *  2) POST /api/courses/{id}/upload-description (multipart/form-data) — если есть файл
   */
const handleSubmit = async () => {
    console.log("Перед отправкой:", { title, description, level, language, additionalFile });

    if (!title || !description || !level || !language) {
      alert("Заполните все поля!");
      return;
    }

    try {
      // 1) СОЗДАЁМ КУРС
      const resp = await fetch("http://127.0.0.1:8000/api/courses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.log("✅ Курс успешно создан:", createdCourse);

      // 2) Если пользователь выбрал файл, отправляем его
      if (additionalFile) {
        const formData = new FormData();
        formData.append("file", additionalFile);

        const uploadResp = await fetch(
          `http://127.0.0.1:8000/api/courses/${createdCourse.id}/upload-description`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResp.ok) {
          throw new Error(`Ошибка при загрузке файла: ${uploadResp.statusText}`);
        }

        const uploadResData = await uploadResp.json();
        console.log("✅ Файл успешно загружен:", uploadResData);
      }

      // Передаем созданный courseId наверх
      onNext(createdCourse.id);

    } catch (error) {
      console.error("Ошибка при отправке данных", error);
      alert(`Ошибка: ${error}`);
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
              placeholder="“Курс по основам программирования на C#”"
              value={title}
              onChange={handleTitleChange}
            />
          </FormField>

          <FormField label="Описание вашего курса">
            <Input
              type="textarea"
              placeholder="“Благодаря данному курсу вы сможете стать Junior C# разработчиком”"
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

          <Button text="Продолжить" onClick={handleSubmit} variant="primary" />
        </div>
      </div>
    </div>
  );
};
