import React from "react";
import styles from "./cardSelect.module.css";

export interface ModeItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
}

interface CourseModeSelectionProps {
  modes: ModeItem[];
  selectedMode: string | null;
  onSelectMode: (modeId: string) => void;
}

export const CourseModeSelection: React.FC<CourseModeSelectionProps> = ({
  modes,
  selectedMode,
  onSelectMode,
}) => {
  return (
    <div className={styles.modeSelectionContainer}>
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <div
            key={mode.id}
            className={`${styles.modeCard} ${isSelected ? styles.selected : ""}`}
            onClick={() => onSelectMode(mode.id)}
          >
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{mode.title}</h3>
            </div>
            
            <p className={styles.cardDescription}>{mode.description}</p>
            
            <ul className={styles.featuresList}>
              {mode.features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <span className={styles.featureText}>{feature.text}</span>
                </li>
              ))}
            </ul>
            
            <div className={styles.checkboxContainer}>
              <div className={`${styles.checkbox} ${isSelected ? styles.checked : ""}`}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6L5 9L10 3"
                    stroke={isSelected ? "#C6F135" : "#6D6D6D"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};