import styles from './styles.module.css';

interface ButtonProps {
  text: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

const Button = ({
  text,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  variant = 'primary'
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.button} ${styles[variant]} ${className}`.trim()}
    >
      {text}
    </button>
  );
};

export default Button;
