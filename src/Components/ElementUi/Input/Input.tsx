import styles from './styles.module.css';

interface InputProps {
    type: string;
    placeholder: string;
    className?: string;
    rows?: number;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const Input = ({ type, placeholder, className, rows, value, onChange }: InputProps) => {
  if (type === 'textarea') {
    return (
      <textarea
        placeholder={placeholder}
        rows={rows}
        className={className || styles.inputFieldClassic}
        value={value} // ✅ Добавил value
        onChange={onChange} // ✅ Добавил onChange
      />
    );
  }
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={className || styles.inputFieldClassic}
      value={value} // ✅ Добавил value
      onChange={onChange} // ✅ Добавил onChange
    />
  );
};

export default Input;
