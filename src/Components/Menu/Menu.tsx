import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import logo from '../../assets/icons/logoIcon.svg';
import styles from './styles.module.css';

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
        <div className={styles.brandCopy}>
          <span className={styles.brandTitle}>Lernium</span>
          <span className={styles.brandNote}>Платформа курсов</span>
        </div>
      </Link>

      <nav className={styles.navigationContainer}>
        <Link className={styles.navText} to="/courses">
          Курсы
        </Link>
        <Link className={styles.navText} to="/express">
          Новый курс
        </Link>
        <Link className={styles.navText} to="/ai-helper">
          AI-контур
        </Link>
      </nav>

      <div className={styles.accountBlock}>
        <span className={styles.accountText}>{user?.email ?? 'Аккаунт'}</span>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
};

export default Menu;
