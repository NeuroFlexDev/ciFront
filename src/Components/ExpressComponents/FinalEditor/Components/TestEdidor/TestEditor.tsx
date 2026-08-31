import React, { useState } from "react";
import ai from "@/assets/icons/common/ai.svg";
import type {
  Test,
  TestQuestion,
} from "../types/types";
import QuestionEditor from "./QuestionEditor/QuestionEditor";
import styles from "./testEditor.module.css";

interface TestEditorProps {
  test: Test;

  onChange: (
    test: Test
  ) => void;

  onClose: () => void;
}

const TestEditor: React.FC<
  TestEditorProps
> = ({
  test,
  onChange,
  onClose,
}) => {
  const [questions, setQuestions] =
    useState<TestQuestion[]>(
      test.questions ?? []
    );

  const updateQuestions = (
    nextQuestions: TestQuestion[]
  ) => {
    setQuestions(nextQuestions);

    onChange({
      ...test,
      questions: nextQuestions,
    });
  };

  const handleQuestionChange = (
    question: TestQuestion
  ) => {
    updateQuestions(
      questions.map((item) =>
        item.id === question.id
          ? question
          : item
      )
    );
  };

  const handleDeleteQuestion = (
    questionId: number
  ) => {
    updateQuestions(
      questions.filter(
        (question) =>
          question.id !== questionId
      )
    );
  };

  const handleAddQuestion = () => {
    const newQuestion: TestQuestion = {
      id: Date.now(),

      title:
        "Новый вопрос",

      type: "single",

      options: [
        {
          id: Date.now() + 1,
          text: "Вариант ответа",
          isCorrect: false,
        },
        {
          id: Date.now() + 2,
          text: "Вариант ответа",
          isCorrect: false,
        },
      ],
    };

    updateQuestions([
      ...questions,
      newQuestion,
    ]);
  };

  return (
    <section className={styles.container}>
      <div className={styles.questions}>
        {questions.map(
          (question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              questionNumber={index + 1}

              onChange={
                handleQuestionChange
              }

              onDelete={() =>
                handleDeleteQuestion(
                  question.id
                )
              }

              onImproveWithAI={() =>
                console.log(
                  "Улучшить вопрос",
                  question.id
                )
              }
            />
          )
        )}
      </div>

      <div className={styles.addQuestion}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={handleAddQuestion}
        >
          <img src={ai} alt="AI" />
          <span>
            Сгенерировать вопрос
            с помощью AI
          </span>
        </button>

        <button
          type="button"
          className={styles.manualButton}
          onClick={handleAddQuestion}
        >
          +

          <span>
            Добавить вопрос вручную
          </span>
        </button>
      </div>

    </section>
  );
};

export default TestEditor;