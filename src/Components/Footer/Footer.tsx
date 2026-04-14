import styles from './styles.module.css';
import logo from '../../assets/icons/logoIcon.svg';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.brandBlock}>
        <img src={logo} alt="Логотип Lernium" className={styles.logoIcon} />
        <div>
          <div className={styles.brandTitle}>Lernium</div>
          <p className={styles.brandText}>
            Единая среда для структуры курса, канвы, генерации и командной работы.
          </p>
        </div>
      </div>

      <div className={styles.navigationContainer}>
        <div className={styles.column}>
          <span className={styles.columnTitle}>Платформа</span>
          <Link className={styles.navText} to="/courses">Курсы</Link>
          <Link className={styles.navText} to="/express">Новый проект</Link>
          <Link className={styles.navText} to="/ai-helper">AI-инструменты</Link>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Контакты</span>
          <a className={styles.navText} href="mailto:admin@lernium.ru">admin@lernium.ru</a>
          <a className={styles.navText} href="https://t.me/lernium" target="_blank" rel="noreferrer">Telegram</a>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Документы</span>
          <Link className={styles.navText} to="/privacy">Политика конфиденциальности</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
