// src/Pages/AuthPage/AuthPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '@/Components/ElementUi/Input/Input';
import Button from '@/Components/ElementUi/Button/Button'; // см. примечание ниже
import { login, getMe } from '@/features/auth/api';
import { useAuth } from '@/hooks/useAuth';
import styles from './AuthPage.module.css';

import authImage from '@/assets/icons/auth/auth.svg';
import whatsapp from '@/assets/icons/auth/WA.svg';
import telegram from '@/assets/icons/auth/tg.svg';
import vk from '@/assets/icons/auth/vk.svg';
import appleIcon from '@/assets/icons/auth/apple.svg';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth(); // если в хуке возвращаешь setUser

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // подтянем профиль, чтобы PrivateRoute не выкинул назад
      const me = await getMe().catch(() => null);
      if (me && setUser) setUser(me);

      navigate('/courses', { replace: true });
    } catch (err: unknown) {
      setError(err?.response?.data?.detail || 'Ошибка авторизации');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.constCard}>
        <div className={styles.constCardImage}>
          <img src={authImage} alt="Welcome" />
        </div>

        <form className={styles.contForm} onSubmit={handleSubmit}>
          <h1 className={styles.title}>С возвращением!</h1>
          <h3 className={styles.subtitle}>Создавайте и изучайте курсы с помощью AI</h3>

          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="Введите E-mail"
            type="email"
            placeholder="company@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
          />

          <Input
            label="Введите пароль"
            type="password"
            placeholder="**********"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />

          <div className={styles.row}>
            <p>Еще нет аккаунта?</p>
            <Link className={styles.link} to="/registration">Создать</Link>
          </div>

          {/* Если ваш Button НЕ пробрасывает type, замените на нативный <button> */}
          <Button type="submit" text="Войти" variant="primary" />

          <p className={styles.socialTitle}>Или войдите с помощью</p>
          <div className={styles.contSocial}>
            <button type="button" className={styles.contSocialButton}>
              <img src={whatsapp} alt="whatsapp" />
            </button>
            <button type="button" className={styles.contSocialButton}>
              <img src={vk} alt="vk" />
            </button>
            <button type="button" className={styles.contSocialButton}>
              <img src={telegram} alt="telegram" />
            </button>
            <button type="button" className={styles.contSocialButton}>
              <img src={appleIcon} alt="apple" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
