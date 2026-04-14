import React, { useState } from "react";
import Input from "@/Components/ElementUi/Input/Input";
import RadioButton from "@/Components/ElementUi/RadioButton/RadioButton";
import Checkbox from "@/Components/ElementUi/Checkbox/Checkbox";
import Button from "@/Components/ElementUi/Button/Button";
import LabelField from "@/Components/ElementUi/LabelField/LabelField";
import styles from "./styles.module.css";
import { apiFetch } from "@/shared/api";

interface CourseStructureFormProps {
  onBack: () => void;
  onNext: (csId: number) => void; // теперь передаем структуре ID наверх
}


// Для удобства если нужен id + label
interface ContentTypeOption {
  id: number;
  label: string;
  checked: boolean;
}

export const CourseStructureForm = ({ onBack, onNext }: CourseStructureFormProps) => {
  // Состояние формы
  const [sections, setSections] = useState("10");
  const [testsPerSection, setTestsPerSection] = useState("10");
  const [lessonsPerSection, setLessonsPerSection] = useState("10");
  const [questionsPerTest, setQuestionsPerTest] = useState("10");
  const [finalTest, setFinalTest] = useState("yes");
  const [contentTypes, setContentTypes] = useState<ContentTypeOption[]>([
    { id: 1, label: "Видео", checked: false },
    { id: 2, label: "Текст", checked: false },
    { id: 3, label: "Практические задания", checked: false },
  ]);

  // Функция отправки формы на сервер
  const handleSubmit = async () => {
    const payload = {
      sections: parseInt(sections, 10),
      tests_per_section: parseInt(testsPerSection, 10),
      lessons_per_section: parseInt(lessonsPerSection, 10),
      questions_per_test: parseInt(questionsPerTest, 10),
      final_test: finalTest === "yes", // true/false
      content_types: contentTypes
        .filter((item) => item.checked)
        .map((item) => item.label),
    };

    try {
      const response = await apiFetch("/course-structure/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ошибка при сохранении структуры", errorText);
        throw new Error("Ошибка при сохранении структуры");
      }

      const savedStruct = await response.json();
      onNext(savedStruct.id);
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      alert("Ошибка при сохранении структуры курса");
    }
  };

  return (
    <div className={styles.secontStepContainer}>
      <p className={styles.title}>Структура курса</p>
      <p className={styles.description}>
        Настройте объем, контроль и типы материалов. Эти параметры станут основой для следующего шага.
      </p>
      <div className={styles.structureDataCont}>

        <div className={styles.itemGridStructure}>
          <LabelField text="Введите количество секций" />
          <Input
            type="number"
            value={sections}
            placeholder="Количество секций"
            onChange={(e) => setSections(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество тестов в секции" />
          <Input
            type="number"
            value={testsPerSection}
            placeholder="Количество тестов в секции"
            onChange={(e) => setTestsPerSection(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество уроков в секции" />
          <Input
            type="number"
            value={lessonsPerSection}
            placeholder="Количество уроков в секции"
            onChange={(e) => setLessonsPerSection(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество вопросов в тесте" />
          <Input
            type="number"
            value={questionsPerTest}
            placeholder="Количество вопросов в тесте"
            onChange={(e) => setQuestionsPerTest(e.target.value)}
          />
        </div>

        <div className={styles.finalTest}>
          <LabelField text="Наличие финального теста" />
          <div className={styles.radioGroup}>
            <RadioButton
              name="test-group"
              value="yes"
              label="Да"
              checked={finalTest === "yes"}
              onChange={() => setFinalTest("yes")}
            />
            <RadioButton
              name="test-group"
              value="no"
              label="Нет"
              checked={finalTest === "no"}
              onChange={() => setFinalTest("no")}
            />
          </div>
        </div>

        <div className={styles.finalTest}>
          <LabelField text="Тип контента в курсе" />
          <div className={styles.checkboxGroup}>
            {contentTypes.map((item) => (
              <Checkbox
                key={item.id}
                label={item.label}
                checked={item.checked}
                onChange={(e) => {
                  const newItems = contentTypes.map((el) =>
                    el.id === item.id
                      ? { ...el, checked: e.target.checked }
                      : el
                  );
                  setContentTypes(newItems);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.buttonContainer}>
        <Button text="Назад" onClick={onBack} variant="secondary" />
        <Button text="Продолжить" onClick={handleSubmit} variant="primary" />
      </div>
    </div>
  );
};
