import { useRef } from 'react';
import styles from './land.module.css';
import HeaderLand from '@/Components/LandingPage/HeaderLand/HeaderLand';
import FirstBlockLand from '@/Components/LandingPage/FirstBlock/FirstBlock';
import HowWork from '@/Components/LandingPage/HowWork/HowWork';
import Advantages from '@/Components/LandingPage/Advantages/Advantages';
import { Link } from 'react-router-dom';

const LandPage = () => {
  const howWorkRef = useRef<HTMLDivElement>(null); // Для перехода в блок Как это работает (проскролливает)
  const advantagesRef = useRef<HTMLDivElement>(null); // Для перехода в блок Преимущества

  const scrollToHowWork = () => {
    howWorkRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  const scrollToAdvantages = () => {
    advantagesRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  return (
    <div style={{ backgroundColor: '#f4f4f4' }}>
        <div className={styles.container}>
            <div className={styles.contentCont}>
                <HeaderLand scrollToHowWork={scrollToHowWork} scrollToAdvantages={scrollToAdvantages}  />

                <FirstBlockLand scrollToHowWork={scrollToHowWork} />
            </div>
        </div>
        <div ref={howWorkRef} className={styles.contentContOther}>
            <HowWork />

            {/* <Advantages /> */}
            <div ref={advantagesRef}>
                <Advantages />
            </div>
        </div>

        <div className={styles.containerLast}>
            <div className={styles.contentLast}>
                <h1 className={styles.title}>
                    Готовы создать свой курс?
                </h1>

                <h3 className={styles.description}>Начните прямо сейчас и создайте уникальный образовательный продукт за несколько минут!</h3>

                <Link style={{ textDecoration: 'none' }} to='/registration'>
                    <h5 className={styles.button}>Попробовать бесплатно</h5>
                </Link>
            </div>
        </div>
    </div>
  );
};

export default LandPage;
