import styles from './styles.module.css';

interface InputProps {
    type: string;
    placeholder: string;
    className?: string;
    rows?: number;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    label?: string;
}

const Input = ({ type, placeholder, className, rows, value, onChange, label }: InputProps) => {
    const inputClass = className || styles.inputFieldClassic;

    return (
        <div className={styles.inputContainer}>
            {label && <label className={styles.inputLabel}>{label}</label>}
            {type === 'textarea' ? (
                <textarea
                    placeholder={placeholder}
                    rows={rows}
                    className={inputClass}
                    value={value}
                    onChange={onChange}
                />
            ) : (
                <input
                    type={type}
                    placeholder={placeholder}
                    className={inputClass}
                    value={value}
                    onChange={onChange}
                />
            )}
        </div>
    );
};

export default Input;