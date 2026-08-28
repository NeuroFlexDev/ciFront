import React, { useState, useEffect } from "react";
import styles from "./fourth.module.css";
import Button from "@/Components/ElementUi/Button/Button";
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';

interface FourthStepProps {
  courseId: number;
  csId: number;
  onBack: () => void;
  onNext?: () => void;
}

type GenerationStatus = 'pending' | 'processing' | 'completed';

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: GenerationStatus;
}

const FourthStep: React.FC<FourthStepProps> = ({
  onBack,
  onNext,
}) => {
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<GenerationStep[]>([
    {
      id: 'extract',
      title: 'Извлечение знаний из документов',
      description: 'Парсинг и структурирование документов',
      status: 'completed',
    },
    {
      id: 'structure',
      title: 'Построение структуры',
      description: 'Модули, уроки, последовательность',
      status: 'processing',
    },
    {
      id: 'write',
      title: 'Написание уроков',
      description: 'Текст, примеры, практика',
      status: 'pending',
    },
  ]);

  useEffect(() => {
    // Симуляция прогресса генерации
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress > 0) {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === 'extract' ? { ...step, status: 'completed' } : step
        )
      );
    }

    if (progress > 33) {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === 'structure' ? { ...step, status: 'processing' } : step
        )
      );
    }

    if (progress > 66) {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === 'structure' ? { ...step, status: 'completed' } : step
        )
      );
    }

    if (progress > 66) {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === 'write' ? { ...step, status: 'processing' } : step
        )
      );
    }

    if (progress >= 100) {
      setSteps((prev) =>
        prev.map((step) => ({ ...step, status: 'completed' }))
      );
    }
  }, [progress]);

  const getStatusText = (status: GenerationStatus) => {
    switch (status) {
      case 'completed':
        return 'готово';
      case 'processing':
        return 'в работе';
      case 'pending':
        return 'ожидание';
    }
  };

  const getStatusClass = (status: GenerationStatus) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'processing':
        return styles.statusProcessing;
      case 'pending':
        return styles.statusPending;
    }
  };

  const isComplete = progress >= 100;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.imagePlaceholder}>
          <div className={styles.placeholderContent}>
          </div>
        </div>
        
        <h1 className={styles.title}>Генерация курса</h1>
        <p className={styles.subtitle}>
          ИИ анализирует ваши документы и создает курс
        </p>

        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className={styles.progressText}>Очень старается!</p>
      </div>

      <div className={styles.steps}>
        {steps.map((step) => (
          <div key={step.id} className={styles.step}>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDescription}>{step.description}</div>
            </div>
            <div className={`${styles.stepStatus} ${getStatusClass(step.status)}`}>
              {getStatusText(step.status)}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <div style={{ maxWidth: '145px' }}>
          <Button
            text="Назад"
            onClick={onBack}
            variant="secondary"
            icon={<img src={arrowLeft} alt="back" />}
            iconPosition="left"
          />
        </div>
        <div style={{ maxWidth: '145px' }}>
          <Button
            onClick={onNext}
            variant="primary"
            text="Далее"
            disabled={!isComplete}
            iconPosition="right"
            icon={<img src={arrowRight} alt="next" />}
          />
        </div>
      </div>
    </div>
  );
};

export default FourthStep;
