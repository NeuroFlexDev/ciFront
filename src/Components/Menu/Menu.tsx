import { Link, useNavigate } from 'react-router-dom';
import notification from '../../assets/icons/menu/notification.svg';
import { useAuth } from '@/auth/useAuth';
import logo from '../../assets/icons/logo.svg';
import styles from './styles.module.css';
import arrowLogout from '../../assets/icons/menu/arrow_down.svg';

const Menu = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/auth', { replace: true });
  }

  return (
    <header className={styles.menuContainer}>
      <Link to="/courses" className={styles.brand}>
        <img src={logo} alt="Логотип Lernium" className={styles.logoIcon} />
      </Link>

      <nav className={styles.navigationContainer}>
        <Link className={styles.navText} to="/dashboard">
          Дашборд
        </Link>
        <Link className={styles.navText} to="/courses">
          Курсы
        </Link>
        <Link className={styles.navButton} to="/express">
          Создать курс
        </Link>
        <Link className={styles.navText} to="/employees">
          Сотрудники
        </Link>
        <Link className={styles.navText} to="/analytics">
          Аналитика
        </Link>
      </nav>

      <div className={styles.accountBlock}>
        <button type="button" className={styles.notificationButton}>
          <img src={notification} alt='' />
        </button>

        <div className={styles.containerUserInfo}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name ?? 'Пашковский Руслан'}</span>
            <span className={styles.userRole}>{user?.role ?? 'Администратор'}</span>
          </div>

          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <img src={arrowLogout} alt="" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Menu;