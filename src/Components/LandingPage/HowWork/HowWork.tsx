import React from 'react';
import WorkStep from '@/Components/LandingPage/HowWork/Cards/Card'; // Импорт дочернего компонента
import styles from './howWork.module.css';

const HowWork = () => {
  const steps = [
    {
      title: "Оставьте заявку",
      description: "Заполните простую форму или свяжитесь с нами по телефону"
    },
    {
      title: "Получите консультацию",
      description: "Наши специалисты бесплатно проконсультируют вас по всем вопросам"
    },
    {
      title: "Получите решение",
      description: "Мы подготовим индивидуальное предложение и поможем с реализацией"
    }
  ];

  return (
    <div className={styles.secondBlockCont}>
      <h2 className={styles.title}>Как это работает?</h2>
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => (
          <WorkStep 
            key={index}
            title={step.title}
            description={step.description}
          />
        ))}
      </div>
    </div>
  );
};

export default HowWork;