import styles from "./stepper.module.css";

interface StepItem {
  title: string;
  subtitle: string;
}

interface Props {
  currentStep: number;
}

const steps: StepItem[] = [
  {
    title: "Шаг 1",
    subtitle: "Выберите режим",
  },
  {
    title: "Шаг 2",
    subtitle: "Загрузите документы",
  },
  {
    title: "Шаг 3",
    subtitle: "Настройка курса",
  },
  {
    title: "Шаг 4",
    subtitle: "Генерация ИИ",
  },
  {
    title: "Шаг 5",
    subtitle: "Проверка и публикация",
  },
];

const CourseStepper = ({ currentStep }: Props) => {
  const getBackgroundClass = (stepIndex: number) => {
    const stepNum = stepIndex + 1;
    
    if (stepNum === currentStep) {
      // Активный шаг
      if (stepNum === 1) return styles.activeStep;
      if (stepNum === 5) return styles.activeLastStep;
      return styles.activeStepCenter;
    } else {
      // Неактивный шаг
      if (stepNum === 1) return styles.notActiveFirstStep;
      if (stepNum === 5) return styles.notActiveLastStep;
      return styles.notActiveStep;
    }
  };

  return (
    <div className={styles.wrapper}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const active = stepNum === currentStep;
        const completed = stepNum < currentStep;
        const bgClass = getBackgroundClass(index);

        return (
          <div
            key={index}
            className={`${styles.step} ${bgClass} ${active ? styles.active : ""} ${completed ? styles.completed : ""}`}
          >
            <div className={styles.content}>
              <span className={styles.title}>{step.title}</span>
              <span className={styles.subtitle}>{step.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseStepper;