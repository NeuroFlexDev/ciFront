import styles from './styles.module.css';
import logo from '../../assets/icons/logoIcon.svg';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <div className={styles.footerContainer}>
      <img src={logo} alt="logoSite" className={styles.logoIcon} />

      <div className={styles.navigationContainer}>
        <Link className={styles.navText} to='#'>Новости</Link>
        <Link className={styles.navText} to='#'>Свяжитесь с нами</Link>
        <Link className={styles.navText} to='#'>Введите почту</Link>
        <Link className={styles.navText} to='#'>Политика конфиденциальности</Link>
        <Link className={styles.navText} to='#'>Подписаться</Link>
        <Link className={styles.navText} to='#'>Пользовательское соглашение</Link>
      </div>
    </div>
  );
};

export default Footer;
