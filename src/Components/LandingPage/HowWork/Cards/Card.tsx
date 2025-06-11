import React from 'react';
import styles from './card.module.css';

interface WorkStepProps {
  title: string;
  description: string;
}

const WorkStep: React.FC<WorkStepProps> = ({ title, description }) => {
  return (
    <div className={styles.workStepCard}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>
    </div>
  );
};

export default WorkStep;