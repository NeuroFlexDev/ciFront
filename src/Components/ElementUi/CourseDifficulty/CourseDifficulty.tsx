import React from "react";
import styles from "./courseDifficulty.module.css";

type DifficultyLevel = "internship" | "basic" | "intermediate" | "advanced";

interface DifficultyOption {
  id: DifficultyLevel;
  title: string;
  subtitle: string;
}

const difficultyOptions: DifficultyOption[] = [
  { id: "internship", title: "Стажировка", subtitle: "С самого нуля" },
  { id: "basic", title: "Базовый", subtitle: "Минимальный уровень" },
  { id: "intermediate", title: "Средний", subtitle: "Есть опыт" },
  { id: "advanced", title: "Продвинутый", subtitle: "Эксперт" },
];

interface CourseDifficultyProps {
  value?: DifficultyLevel;
  onChange?: (level: DifficultyLevel) => void;
}

const CourseDifficulty: React.FC<CourseDifficultyProps> = ({ value, onChange }) => {
  return (
    <div className={styles.difficultyField}>
      <label className={styles.label}>Сложность курса</label>
      <div className={styles.options}>
        {difficultyOptions.map((option) => (
          <button
            key={option.id}
            className={`${styles.option} ${value === option.id ? styles.active : ""}`}
            onClick={() => onChange?.(option.id)}
          >
            <div className={styles.optionTitle}>{option.title}</div>
            <div className={styles.optionSubtitle}>{option.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CourseDifficulty;