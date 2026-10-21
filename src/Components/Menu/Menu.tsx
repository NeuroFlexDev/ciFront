import { Link, useNavigate } from 'react-router-dom';
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
        <a href="/legal/" className={styles.navText}>Документы</a>

        <div className={styles.containerUserInfo}>
          <Link to="/account" className={styles.userInfo} style={{color:"inherit",textDecoration:"none"}}>
            <span className={styles.userName}>{user?.full_name || user?.email || 'Личный профиль'}</span>
            <span className={styles.userRole}>Личный профиль</span>
          </Link>

          <button type="button" className={styles.logoutButton} onClick={handleLogout} aria-label="Выйти из аккаунта">
            <img src={arrowLogout} alt="" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Menu;
