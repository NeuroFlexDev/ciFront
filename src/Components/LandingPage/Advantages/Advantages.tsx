import React from 'react';
import styles from './Advantages.module.css';
import logoLand from '@/assets/icons/landing/logoLand.svg';
import timePlus from '@/assets/icons/landing/timePlus.svg';
import adaptPlus from '@/assets/icons/landing/adaptPlus.svg';
import templatePlus from '@/assets/icons/landing/templatePlus.svg';
import integrationPlus from '@/assets/icons/landing/integrationPlus.svg';

const Advantages = () => {
  const _steps = [
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
    <div className={styles.secondBlockContAdvan}>
        <div className={styles.titleCont}>
            <img src={logoLand} alt="NeuroLearn" />
            <h1 className={styles.title}>Преимущества</h1>
        </div>

        <div style={{ textAlign: 'center' }}>
            <img className={styles.image} src={timePlus} alt="" />
            <img className={styles.image} src={adaptPlus} alt="" />
            <img className={styles.image} src={templatePlus} alt="" />
            <img className={styles.image} src={integrationPlus} alt="" />
        </div>
    </div>
  );
};

export default Advantages;