import React from "react";
import arrowIcon from '@/assets/icons/TextEditor/arrowupright.svg';
import styles from "./styles.module.css";

interface ModuleCardProps {
  moduleNumber: number;
  title: string;
  lessonsCount: number;
  testsCount: number;
  position: "top" | "bottom";
  onClick?: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  moduleNumber,
  title,
  lessonsCount,
  testsCount,
  position,
  onClick,
}) => {
  return (
    <div
      className={`${styles.wrapper} ${styles[position]}`}
    >
      <div className={styles.card}>
        <div className={styles.moduleTitle}>
          Модуль {moduleNumber}
        </div>

        <div className={styles.description}>
          {title}
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span>Уроков</span>
            <strong>{lessonsCount}</strong>
          </div>

          <div className={styles.metric}>
            <span>Тестов</span>
            <strong>{testsCount}</strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.arrow}
        onClick={onClick}
        aria-label={`Открыть модуль ${moduleNumber}`}
      >
        <img src={arrowIcon} alt="Открыть модуль" />
      </button>
    </div>
  );
};

export default ModuleCard;