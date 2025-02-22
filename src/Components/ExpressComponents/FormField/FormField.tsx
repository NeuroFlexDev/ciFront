import { ReactNode } from 'react';
import LabelField from '@/Components/ElementUi/LabelField/LabelField';
import styles from './styles.module.css';

interface FormFieldProps {
  label: string;
  children: ReactNode;
}

export const FormField = ({ label, children }: FormFieldProps) => (
  <div className={styles.fieldItem}>
    <LabelField text={label} />
    {children}
  </div>
);
