// src/Components/ElementUi/Button/Button.tsx
import React from 'react';
import styles from './styles.module.css';

type Variant = 'primary' | 'secondary';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  variant?: Variant;
  className?: string;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ text, variant = 'primary', className = '', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`${styles.button} ${styles[variant]} ${className}`.trim()}
        {...rest}
      >
        {text}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
