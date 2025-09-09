import {  } from 'react';
import styles from './headerLand.module.css';
import logoLand from '@/assets/icons/landing/logoLand.svg';
import { Link } from 'react-router-dom';

interface HeaderLandProps {
  scrollToHowWork: () => void;
  scrollToAdvantages: () => void;
}

const HeaderLand: React.FC<HeaderLandProps> = ({ scrollToHowWork, scrollToAdvantages }) => {
  

  return (
    <div className={styles.containerHeader}>
      <img src={logoLand} alt="NeuroLearn" />

      <div className={styles.contLinker}>
        <Link to='/ai-helper' className={styles.headerLink}>
            <h5>Спросить AI-Помощника</h5>
        </Link>
        <div 
          className={styles.headerLink} 
          onClick={scrollToHowWork} // Используем переданную функцию
          style={{ cursor: 'pointer' }}
        >
          <h5>Как это работает?</h5>
        </div>
        <div 
          className={styles.headerLink} 
          onClick={scrollToAdvantages}
          style={{ cursor: 'pointer' }}
        >
          <h5>Преимущества</h5>
        </div>
        <Link to='/registration' className={styles.primaryLink}>
            <h5>Начать бесплатно</h5>
        </Link>
      </div>
    </div>
  );
};

export default HeaderLand;
