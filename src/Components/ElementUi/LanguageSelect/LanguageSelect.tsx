import React, { useState } from "react";
import styles from "./languageSelect.module.css";
import arrowDownIcon from "@/assets/icons/step/arrow_down.svg";

interface LanguageOption {
  value: string;
  label: string;
}

const languages: LanguageOption[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

interface LanguageSelectProps {
  value?: string;
  onChange?: (value: string) => void;
}

const LanguageSelect: React.FC<LanguageSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = languages.find((lang) => lang.value === value) || languages[0];

  return (
    <div className={styles.languageField}>
      <label className={styles.label}>Язык курса</label>
      <div className={styles.selectWrapper}>
        <button
          className={styles.selectButton}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={styles.selectedValue}>{selectedLanguage.label}</span>
          <img 
            src={arrowDownIcon} 
            alt="" 
            className={`${styles.arrow} ${isOpen ? styles.open : ""}`}
          />
        </button>
        {isOpen && (
          <div className={styles.dropdown}>
            {languages.map((lang) => (
              <button
                key={lang.value}
                className={`${styles.dropdownItem} ${lang.value === value ? styles.active : ""}`}
                onClick={() => {
                  onChange?.(lang.value);
                  setIsOpen(false);
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelect;