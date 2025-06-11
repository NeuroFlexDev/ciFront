import { useState } from 'react';
import styles from './firstBlock.module.css';
import { Link } from 'react-router-dom';
import imageLand from '@/assets/icons/landing/imgLand.svg';

interface FirstBlockLandProps {
  scrollToHowWork: () => void;
}

const FirstBlockLand: React.FC<FirstBlockLandProps> = ({ scrollToHowWork }) => {
  

  return (
    <div className={styles.firstBlockCont}>
      <div className={styles.textCont}>
        <h1 className={styles.title}>
            Создавайте профессиональные курсы за <h1 className={styles.time}>минуты</h1> с помощью ИИ
        </h1>
        <h3 className={styles.description}>Автоматизированный подбор контента, структуры и материалов под вашу аудиторию</h3>

        <div className={styles.buttonCont}>
          <Link style={{ textDecoration: 'none' }} to="/registration">
            <h5 className={styles.button}>Попробовать бесплатно</h5>
          </Link>
            <div 
            style={{ textDecoration: 'none', cursor: 'pointer' }} 
            onClick={scrollToHowWork} // Используем переданную функцию
            >
            <h5 className={styles.buttonWork}>Как это работает?</h5>
            </div>
        </div>
      </div>

      <div>
        <img className={styles.image} src={imageLand} alt="" />
      </div>
    </div>
  );
};

export default FirstBlockLand;
