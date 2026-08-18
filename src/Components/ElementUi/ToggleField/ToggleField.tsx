import React from "react";
import styles from "./toggleField.module.css";

interface ToggleFieldProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const ToggleField: React.FC<ToggleFieldProps> = ({
  label,
  checked = false,
  onChange,
}) => {
  return (
    <div className={styles.toggleField}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        className={`${styles.toggle} ${checked ? styles.checked : ""}`}
        onClick={() => onChange?.(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
};

export default ToggleField;