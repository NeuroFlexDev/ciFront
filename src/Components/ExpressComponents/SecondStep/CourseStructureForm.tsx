import React, { useState } from "react";
import axios from "axios";
import Input from "@/Components/ElementUi/Input/Input";
import RadioButton from "@/Components/ElementUi/RadioButton/RadioButton";
import Checkbox from "@/Components/ElementUi/Checkbox/Checkbox";
import Button from "@/Components/ElementUi/Button/Button";
import LabelField from "@/Components/ElementUi/LabelField/LabelField";
import styles from "./styles.module.css";

interface CourseStructureFormProps {
  onBack: () => void;
  onNext: (csId: number) => void; // теперь передаем структуре ID наверх
}

interface ContentTypeOption {
  id: number;
  label: string;
  checked: boolean;
}

export const CourseStructureForm = ({ onBack, onNext }: CourseStructureFormProps) => {
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

  const handleSubmit = async () => {
    const payload = {
      sections: parseInt(sections, 10),
      tests_per_section: parseInt(testsPerSection, 10),
      lessons_per_section: parseInt(lessonsPerSection, 10),
      questions_per_test: parseInt(questionsPerTest, 10),
      final_test: finalTest === "yes",
      content_types: contentTypes
        .filter(item => item.checked)
        .map(item => item.label),
    };

    console.log("📤 Отправка структуры курса:", payload);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/course-structure/",
        payload
      );

      const savedStruct = response.data;
      console.log("✅ Структура курса сохранена!", savedStruct);
      onNext(savedStruct.id);
    } catch (error: any) {
      console.error("❌ Ошибка при сохранении структуры", error);
      alert(`Ошибка: ${error.message || error}`);
    }
  };

  return (
    <div className={styles.secontStepContainer}>
      <p className={styles.title}>Структура курса</p>
      <div className={styles.structureDataCont}>
        <div className={styles.itemGridStructure}>
          <LabelField text="Введите количество секций" />
          <Input
            type="number"
            value={sections}
            placeholder="Количество секций"
            onChange={e => setSections(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество тестов в секции" />
          <Input
            type="number"
            value={testsPerSection}
            placeholder="Количество тестов в секции"
            onChange={e => setTestsPerSection(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество уроков в секции" />
          <Input
            type="number"
            value={lessonsPerSection}
            placeholder="Количество уроков в секции"
            onChange={e => setLessonsPerSection(e.target.value)}
          />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество вопросов в тесте" />
          <Input
            type="number"
            value={questionsPerTest}
            placeholder="Количество вопросов в тесте"
            onChange={e => setQuestionsPerTest(e.target.value)}
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
            {contentTypes.map(item => (
              <Checkbox
                key={item.id}
                label={item.label}
                checked={item.checked}
                onChange={e => {
                  setContentTypes(prev =>
                    prev.map(el =>
                      el.id === item.id
                        ? { ...el, checked: e.target.checked }
                        : el
                    )
                  );
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
