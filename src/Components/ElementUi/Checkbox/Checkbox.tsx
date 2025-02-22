import { FC, InputHTMLAttributes } from 'react';
import styles from './styles.module.css';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  indeterminate?: boolean;
  containerClass?: string;
}

const Checkbox: FC<CheckboxProps> = ({
  label,
  indeterminate = false,
  containerClass = '',
  ...props
}) => {
  return (
    <label className={`${styles.checkboxLabel} ${containerClass}`}>
      <input
        type="checkbox"
        className={styles.hiddenCheckbox}
        ref={(el) => el && (el.indeterminate = indeterminate)}
        {...props}
      />
      <span className={styles.customCheckbox} aria-hidden="true">
        <svg
          className={styles.checkmark}
          viewBox="0 0 12 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 5.5L4.5 9L11 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.labelText}>{label}</span>
    </label>
  );
};

export default Checkbox;
