import { FC } from 'react';
import styles from './styles.module.css';

interface RadioButtonProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  className?: string;
}

const RadioButton: FC<RadioButtonProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
  className = ''
}) => {
  return (
    <label className={`${styles.radioLabel} ${className}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.value)}
        className={styles.hiddenInput}
      />
      <span className={styles.customRadio} />
      <span className={styles.labelText}>{label}</span>
    </label>
  );
};

export default RadioButton;
