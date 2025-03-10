import React, { useState } from "react";
import Input from "@/Components/ElementUi/Input/Input";
import RadioButton from "@/Components/ElementUi/RadioButton/RadioButton";
import Checkbox from "@/Components/ElementUi/Checkbox/Checkbox";
import Button from "@/Components/ElementUi/Button/Button";
import LabelField from "@/Components/ElementUi/LabelField/LabelField";
import styles from "./styles.module.css";

interface CourseStructureFormProps {
  onBack: () => void;
  onNext: () => void;
}

export const CourseStructureForm = ({ onBack, onNext }: CourseStructureFormProps) => {
  // Состояние формы
  const [sections, setSections] = useState("10");
  const [testsPerSection, setTestsPerSection] = useState("10");
  const [lessonsPerSection, setLessonsPerSection] = useState("10");
  const [questionsPerTest, setQuestionsPerTest] = useState("10");
  const [finalTest, setFinalTest] = useState("yes");
  const [contentTypes, setContentTypes] = useState([
    { id: 1, label: "Видео", checked: false },
    { id: 2, label: "Текст", checked: false },
    { id: 3, label: "Практические задания", checked: false },
  ]);

  // Отправка формы на сервер
  // При нажатии на кнопку «Продолжить» → сохраняем структуру
const handleSubmit = async () => {
  const payload = {
    sections: parseInt(sections, 10),
    tests_per_section: parseInt(testsPerSection, 10),
    lessons_per_section: parseInt(lessonsPerSection, 10),
    questions_per_test: parseInt(questionsPerTest, 10),
    final_test: finalTest === "yes",
    content_types: contentTypes.filter((i) => i.checked).map((i) => i.label),
  };

  const response = await fetch("http://127.0.0.1:8000/api/course-structure/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Ошибка при сохранении структуры");
  }

  onNext(); // Переход к Overview
};


  return (
    <div className={styles.secontStepContainer}>
      <p className={styles.title}>Структура курса</p>
      <div className={styles.structureDataCont}>
        <div className={styles.itemGridStructure}>
          <LabelField text="Введите количество секций" />
          <Input type="number" value={sections} onChange={(e) => setSections(e.target.value)} />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество тестов в секции" />
          <Input type="number" value={testsPerSection} onChange={(e) => setTestsPerSection(e.target.value)} />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество уроков в секции" />
          <Input type="number" value={lessonsPerSection} onChange={(e) => setLessonsPerSection(e.target.value)} />
        </div>

        <div className={styles.itemGridStructure}>
          <LabelField text="Количество вопросов в тесте" />
          <Input type="number" value={questionsPerTest} onChange={(e) => setQuestionsPerTest(e.target.value)} />
        </div>

        <div className={styles.finalTest}>
          <LabelField text="Наличие финального теста" />
          <div className={styles.radioGroup}>
            <RadioButton name="test-group" value="yes" label="Да" checked={finalTest === "yes"} onChange={() => setFinalTest("yes")} />
            <RadioButton name="test-group" value="no" label="Нет" checked={finalTest === "no"} onChange={() => setFinalTest("no")} />
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
                  const newItems = contentTypes.map((i) =>
                    i.id === item.id ? { ...i, checked: e.target.checked } : i
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
