import React from "react";
import checkIcon from "@/assets/icons/common/checkIcon.svg";
import ai from "@/assets/icons/common/ai.svg";
import deleteIcon from "@/assets/icons/common/deleteIconA.svg";
import type {
  TestQuestion,
  TestOption,
} from "../../types/types";

import styles from "./styles.module.css";

interface QuestionEditorProps {
  question: TestQuestion;
  questionNumber: number;

  onChange: (
    question: TestQuestion
  ) => void;

  onDelete: () => void;

  onImproveWithAI?: () => void;
}

const QuestionEditor: React.FC<
  QuestionEditorProps
> = ({
  question,
  questionNumber,
  onChange,
  onDelete,
  onImproveWithAI,
}) => {
  const options = question.options ?? [];

  const handleQuestionChange = (
    value: string
  ) => {
    onChange({
      ...question,
      question: value,
    });
  };

  const handleOptionChange = (
    optionId: number,
    value: string
  ) => {
    onChange({
      ...question,

      options: options.map(
        (option) =>
          option.id === optionId
            ? {
                ...option,
                text: value,
              }
            : option
      ),
    });
  };

  const handleCorrectChange = (
    optionId: number
  ) => {
    if (question.type === "single") {
      onChange({
        ...question,

        options: options.map(
          (option) => ({
            ...option,
            isCorrect:
              option.id === optionId,
          })
        ),
      });

      return;
    }

    onChange({
      ...question,

      options: options.map(
        (option) =>
          option.id === optionId
            ? {
                ...option,
                isCorrect:
                  !option.isCorrect,
              }
            : option
      ),
    });
  };

  const handleAddOption = () => {
    const newOption: TestOption = {
      id: Date.now(),
      text: "Новый вариант",
      isCorrect: false,
    };

    onChange({
      ...question,

      options: [
        ...options,
        newOption,
      ],
    });
  };

  const handleDeleteOption = (
    optionId: number
  ) => {
    onChange({
      ...question,

      options: options.filter(
        (option) =>
          option.id !== optionId
      ),
    });
  };

  return (
    <article className={styles.question}>
      <div className={styles.questionHeader}>
        <div className={styles.questionMeta}>
          <span>
            Вопрос {questionNumber}
          </span>

          <select
            value={question.type}
            onChange={(event) =>
              onChange({
                ...question,
                type: event.target
                  .value as TestQuestion["type"],
              })
            }
            className={styles.typeSelect}
          >
            <option value="single">
              Один ответ
            </option>

            <option value="multiple">
              Несколько ответов
            </option>

            <option value="open">
              Открытый ответ
            </option>
          </select>
        </div>

        <button
          type="button"
          className={styles.aiButton}
          onClick={onImproveWithAI}
        >
          <img
            src={ai}
            alt=""
          />

          Улучшить с ИИ-агентом
        </button>
      </div>

      <textarea
        className={styles.questionTitle}
        value={question.question}
        onChange={(event) =>
          handleQuestionChange(
            event.target.value
          )
        }
        placeholder="Введите вопрос..."
        rows={2}
      />

      {question.type === "open" ? (
        <div className={styles.openAnswer}>
          <div className={styles.openLabel}>
            ЭТАЛОННЫЙ ОТВЕТ
          </div>

          <textarea
            value={
              question.answer ?? ""
            }
            onChange={(event) =>
              onChange({
                ...question,

                answer:
                  event.target.value,
              })
            }
            placeholder="Введите эталонный ответ..."
            rows={3}
          />

          <div
            className={
              styles.verificationTitle
            }
          >
            СПОСОБ ПРОВЕРКИ
          </div>

          <div
            className={
              styles.verification
            }
          >
            <button
              type="button"
              className={
                question.verificationMethod ===
                "ai"
                  ? styles.verificationActive
                  : ""
              }
              onClick={() =>
                onChange({
                  ...question,

                  verificationMethod:
                    "ai",
                })
              }
            >
              <strong>
                ИИ-агент
              </strong>

              <span>
                Сверит с эталонным
                ответом
              </span>
            </button>

            <button
              type="button"
              className={
                question.verificationMethod ===
                "methodist"
                  ? styles.verificationActive
                  : ""
              }
              onClick={() =>
                onChange({
                  ...question,

                  verificationMethod:
                    "methodist",
                })
              }
            >
              <strong>
                Методист
              </strong>

              <span>
                Ответ попадёт в
                проверку
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.options}>
          {options.map(
            (option) => (
              <div
                key={option.id}
                className={`${styles.option} ${
                  option.isCorrect
                    ? styles.optionCorrect
                    : ""
                }`}
              >
                <button
                  type="button"
                  className={`${styles.optionCheck} ${
                    question.type === "single"
                      ? styles.optionCheckSingle
                      : styles.optionCheckMultiple
                  }`}
                  onClick={() =>
                    handleCorrectChange(option.id)
                  }
                  aria-label={
                    question.type === "single"
                      ? "Выбрать правильный ответ"
                      : "Выбрать правильный вариант"
                  }
                >
                  {option.isCorrect && (
                    <>
                      <img
                        src={checkIcon}
                        alt="✓"
                      />
                    </>
                  )}
                </button>

                <input
                  value={option.text}
                  onChange={(event) =>
                    handleOptionChange(
                      option.id,
                      event.target.value
                    )
                  }
                />

                <button
                  type="button"
                  className={
                    styles.deleteOption
                  }
                  onClick={() =>
                    handleDeleteOption(
                      option.id
                    )
                  }
                >
                  <img src={deleteIcon} alt="×" />
                </button>
              </div>
            )
          )}

          <button
            type="button"
            className={styles.addOption}
            onClick={handleAddOption}
          >
            + Вариант
          </button>
        </div>
      )}

      <button
        type="button"
        className={styles.deleteQuestion}
        onClick={onDelete}
      >
        × Удалить вопрос
      </button>
    </article>
  );
};

export default QuestionEditor;
