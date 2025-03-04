import styles from './styles.module.css';
import logo from '../../assets/icons/logoIcon.svg';
import { Link } from 'react-router-dom';

const Menu = () => {
  return (
    <div className={styles.menuContainer}>
      <img src={logo} alt="logoSite" className={styles.logoIcon} />

      <div className={styles.navigationContainer}>
        <Link className={styles.navText} to='/courses'>Мои курсы</Link>
        <Link className={styles.navText} to='/'>Создать курс</Link>
        <Link className={styles.navText} to='#'>Помощь</Link>
      </div>

      <Link className={styles.navText} to="#">Личный кабинет</Link>
    </div>
  );
};

export default Menu;
