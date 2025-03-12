import React, { useState } from "react";
import { FormField } from "@/Components/ExpressComponents/FormField/FormField";
import Input from "@/Components/ElementUi/Input/Input";
import Select from "@/Components/ElementUi/Select/Select";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import Button from "@/Components/ElementUi/Button/Button";
import styles from "./styles.module.css";

interface CourseInfoFormProps {
  onNext: () => void;
}

export const CourseInfoForm = ({ onNext }: CourseInfoFormProps) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<number | null>(null);
  const [language, setLanguage] = useState<number | null>(null);
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);

  const levels = [
    { id: 1, name: "Курс с нуля" },
    { id: 2, name: "Для начинающих" },
    { id: 3, name: "Мастер в программировании" },
  ];

  const languages = [
    { id: 1, name: "Русский" },
    { id: 2, name: "English" },
  ];

  // ✅ Фикс: title и description теперь точно обновляются
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || "";
    setTitle(value);
    console.log("Title:", value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || "";
    setDescription(value);
    console.log("Description:", value);
  };

  const handleLevelChange = (selected: { id: number; name: string }) => {
    setLevel(selected.id);
    console.log("Level:", selected.id);
  };

  const handleLanguageChange = (selected: { id: number; name: string }) => {
    setLanguage(selected.id);
    console.log("Language:", selected.id);
  };

  const handleSubmit = async () => {
    console.log("Перед отправкой:", { title, description, level, language });

    if (!title || !description || !level || !language) {
      console.error("❌ Ошибка: все поля должны быть заполнены!");
      alert("Заполните все поля!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/courses/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          level,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при сохранении курса");
      }

      console.log("✅ Курс успешно создан!");
      onNext();
    } catch (error) {
      console.error("Ошибка при отправке данных", error);
    }
  };

  return (
    <div className={styles.expressCourseContainer}>
      <p className={styles.title}>Давайте приступим!</p>
      <div className={styles.contCont}>
        <div className={styles.fieldContainer}>
          {/* ✅ Проверено: Title работает */}
          <FormField label="Введите название вашего курса">
            <Input
              type="text"
              placeholder="“Курс по основам программирования на C#”"
              text={title}
              onChange={handleTitleChange}
            />
          </FormField>

          {/* ✅ Проверено: Description работает */}
          <FormField label="Описание вашего курса">
            <Input
              type="textarea"
              placeholder="“Благодаря данному курсу вы сможете стать Junior C# разработчиком”"
              rows={10}
              text={description}
              onChange={handleDescriptionChange}
            />
          </FormField>

          <FormField label="Уровень курса">
            <Select
              items={levels}
              placeholder="Выберите уровень курса"
              value={levels.find((item) => item.id === level) || null}
              onChange={handleLevelChange}
            />
          </FormField>

          <FormField label="Язык курса">
            <Select
              items={languages}
              placeholder="Выберите язык обучения"
              value={languages.find((item) => item.id === language) || null}
              onChange={handleLanguageChange}
            />
          </FormField>

          <FormField label="Дополнительные материалы">
            <UploadFile onFileSelect={(file) => setAdditionalFile(file)} maxSize={10 * 1024 * 1024} />
          </FormField>

          <Button text="Продолжить" onClick={handleSubmit} variant="primary" />
        </div>
      </div>
    </div>
  );
};
