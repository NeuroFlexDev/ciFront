import styles from './styles.module.css';

interface LabelFieldProps {
    text: string;
}

const LabelField = ({ text }: LabelFieldProps) => {
  return (
    <p className={styles.labelField}>{ text }</p>
  );
};

export default LabelField;
