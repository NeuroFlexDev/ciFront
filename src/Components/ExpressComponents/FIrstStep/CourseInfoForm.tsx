import React, { useState } from "react";
import { FormField } from "@/Components/ExpressComponents/FormField/FormField";
import Input from "@/Components/ElementUi/Input/Input";
import Select from "@/Components/ElementUi/Select/Select";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import Button from "@/Components/ElementUi/Button/Button";
import styles from "./styles.module.css";

// ✅ Фикс: теперь id всегда `number`
interface DropdownItem {
  id: number;
  name: string;
}

interface CourseInfoFormProps {
  onNext: () => void;
}

export const CourseInfoForm = ({ onNext }: CourseInfoFormProps) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [level, setLevel] = useState<DropdownItem | undefined>(undefined);
  const [language, setLanguage] = useState<DropdownItem | undefined>(undefined);
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);

  const levels: DropdownItem[] = [
    { id: 1, name: "Курс с нуля" },
    { id: 2, name: "Для начинающих" },
    { id: 3, name: "Мастер в программировании" },
  ];

  const languages: DropdownItem[] = [
    { id: 1, name: "Русский" },
    { id: 2, name: "English" },
  ];

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  // ✅ Фикс: приведение id к числу
  const handleLevelChange = (selected?: DropdownItem) => {
    if (selected) {
      setLevel({ ...selected, id: Number(selected.id) });
    } else {
      setLevel(undefined);
    }
  };

  const handleLanguageChange = (selected?: DropdownItem) => {
    if (selected) {
      setLanguage({ ...selected, id: Number(selected.id) });
    } else {
      setLanguage(undefined);
    }
  };

  const handleSubmit = async () => {
    console.log("Перед отправкой:", { title, description, level, language });

    if (!title || !description || !level || !language) {
      alert("Заполните все поля!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/courses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          level: level.id,
          language: language.id,
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

          {/* ✅ Фикс: теперь value всегда строго соответствует Select */}
          <FormField label="Уровень курса">
            <Select
              items={levels}
              placeholder="Выберите уровень курса"
              value={levels.find((item) => item.id === level?.id) || undefined} // 🔥 Фикс
              onChange={(item) => handleLevelChange(item)}
            />
          </FormField>

          <FormField label="Язык курса">
            <Select
              items={languages}
              placeholder="Выберите язык обучения"
              value={languages.find((item) => item.id === language?.id) || undefined} // 🔥 Фикс
              onChange={(item) => handleLanguageChange(item)}
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
