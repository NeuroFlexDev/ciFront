import styles from './styles.module.css';

interface InputProps {
    type: string;
    placeholder: string;
    className?: string;
    rows?: number;
}

const Input = ({ type, placeholder, className, rows }: InputProps) => {
  if (type === 'textarea') {
    return (
      <textarea
        placeholder={placeholder}
        rows={rows}
        className={className || styles.inputFieldClassic}
      />
    );
  }
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={className || styles.inputFieldClassic}
    />
  );
};

export default Input;
