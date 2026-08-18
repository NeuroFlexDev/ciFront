import styles from './styles.module.css';
import ai from '../../../assets/icons/step/humbleicons_ai.svg';

interface InputProps {
    type: string;
    placeholder: string;
    className?: string;
    rows?: number;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    label?: string;
    icon?: boolean;
}

const Input = ({ type, placeholder, className, rows, value, onChange, label, icon }: InputProps) => {
    const inputClass = className || styles.inputFieldClassic;
    const hasIcon = !!icon;

    return (
        <div className={styles.inputContainer}>
            {label && <label className={styles.inputLabel}>{label}</label>}
            
            <div className={styles.inputWrapper}>
                {type === 'textarea' ? (
                    <textarea
                        placeholder={placeholder}
                        rows={rows}
                        className={`${inputClass} ${hasIcon ? styles.withIcon : ''}`}
                        value={value}
                        onChange={onChange}
                    />
                ) : (
                    <input
                        type={type}
                        placeholder={placeholder}
                        className={`${inputClass} ${hasIcon ? styles.withIcon : ''}`}
                        value={value}
                        onChange={onChange}
                    />
                )}
                
                {icon && <img className={styles.iconWrapper} src={ai} />}
            </div>
        </div>
    );
};

export default Input;