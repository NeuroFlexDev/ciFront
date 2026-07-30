// src/Components/ElementUi/Button/Button.tsx
import React from 'react';
import styles from './styles.module.css';

type Variant = 'primary' | 'secondary';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  variant?: Variant;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      text,
      variant = 'primary',
      className = '',
      icon,
      iconPosition = 'left',
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`${styles.button} ${styles[variant]} ${className}`.trim()}
        {...rest}
      >
        {icon && iconPosition === 'left' && icon}
        <span>{text}</span>
        {icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
