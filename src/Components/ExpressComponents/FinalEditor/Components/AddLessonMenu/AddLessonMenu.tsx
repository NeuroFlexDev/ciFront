
import React from "react";
import styles from "./styles.module.css";
import aiIcon from "@/assets/icons/step/humbleicons_ai.svg";

interface AddLessonMenuProps {
  onClose: () => void;
  onAddLesson: () => void;
  onAddTest: () => void;
  onAddHomework: () => void;
}

const AddLessonMenu: React.FC<AddLessonMenuProps> = ({
  onClose,
  onAddLesson,
  onAddTest,
  onAddHomework,
}) => {
  return (
    <div className={styles.menu}>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
      >
        <span>−</span>
        Закрыть
      </button>

      <button
        type="button"
        className={styles.menuItem}
        onClick={onAddLesson}
      >
        <strong>Урок</strong>

        <span>
          Текст, видео, материалы
        </span>
      </button>

      <button
        type="button"
        className={styles.menuItem}
        onClick={onAddTest}
      >
        <strong>
          Тестовое задание
        </strong>

        <span>
          Быстрая проверка по модулю/уроку
        </span>
      </button>

      <button
        type="button"
        className={styles.menuItem}
        onClick={onAddHomework}
      >
        <strong>
          Домашнее задание
        </strong>

        <span>
          Практика с проверкой
        </span>
      </button>

      <div className={styles.aiChat}>
        <div className={styles.aiTitle}>
          <span className={styles.aiIcon}>
            <img src={aiIcon} alt="AI" />
          </span>

          <span>
            AI-чат
          </span>
        </div>

        <div className={styles.aiInput}>
          <span>
            Напишите чего вам не хватает и нейросеть
            сама доделает модуль...
          </span>

          <button
            type="button"
            className={styles.aiSend}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLessonMenu;