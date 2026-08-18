import React from "react";
import styles from "./lessonCountSlider.module.css";

interface LessonCountSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
}

const LessonCountSlider: React.FC<LessonCountSliderProps> = ({
  value = 14,
  onChange,
  max = 100,
}) => {
  return (
    <div className={styles.sliderField}>
      <div className={styles.header}>
        <label className={styles.label}>Количество уроков в курсе</label>
        <span className={styles.value}>{value}</span>
      </div>
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min="1"
          max={max}
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.track}>
          <div 
            className={styles.progress} 
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default LessonCountSlider;