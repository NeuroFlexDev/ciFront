import styles from './styles.module.css';
import logo from '../../assets/icons/logoIcon.svg';
import { Link } from 'react-router-dom';
import { ThemeSwitcher } from '../Switcher/Switcher';

const Menu = () => {
  return (
    <div className={styles.menuContainer}>
      <img src={logo} alt="logoSite" className={styles.logoIcon} />

      <div className={styles.navigationContainer}>
        <Link className={styles.navText} to='/main'>
          <h3 className={styles.navTextH}>Главная</h3>
        </Link>
        <Link className={styles.navText} to='/courses'>
          <h3 className={styles.navTextH}>Мои курсы</h3>
        </Link>
        <Link className={styles.navText} to='#'>
          <h3 className={styles.navTextH}>Шаблоны</h3>
        </Link>
        <Link className={styles.navText} to='#'>
          <h3 className={styles.navTextH}>Помощь</h3>
        </Link>
        <Link className={styles.navText} to="#">
          <h3 className={styles.navTextH}>Личный кабинет</h3>
        </Link>
      </div>

      {/* <Link className={styles.navText} to="#">Личный кабинет</Link> */}
      <ThemeSwitcher />
    </div>
  );
};

export default Menu;
