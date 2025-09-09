// src/Pages/RegistrationPage/RegistrationPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '@/Components/ElementUi/Input/Input';
import Button from '@/Components/ElementUi/Button/Button';
import { register as apiRegister, login, getMe } from '@/features/auth/api';
import { useAuth } from '@/hooks/useAuth';
import styles from './registration.module.css';

import regIcon from '@/assets/icons/auth/reg.svg';
import whatsapp from '@/assets/icons/auth/WA.svg';
import telegram from '@/assets/icons/auth/tg.svg';
import vk from '@/assets/icons/auth/vk.svg';
import appleIcon from '@/assets/icons/auth/apple.svg';

const RegistrationPage = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuth(); // если в хуке нет setUser — просто убери эти строки

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      setLoading(true);
      // Регистрация
      await apiRegister({ email, password, full_name: fullName });

      // Авто-логин
      await login(email, password);

      // Подтягиваем профиль, чтобы PrivateRoute не редиректил назад
      const me = await getMe().catch(() => null);
      if (me && setUser) setUser(me);

      // Редирект
      navigate('/courses', { replace: true });
    } catch (err: unknown) {
      setError(err?.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.constCard}>
        <div className={styles.constCardImage}>
          <img src={regIcon} alt="Регистрация" />
        </div>

        <form className={styles.contForm} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Добро пожаловать!</h1>
          <h3 className={styles.subtitle}>Создавайте и изучайте курсы с помощью AI</h3>

          {error && <p className={styles.error}>{error}</p>}

          <Input
            label="Имя"
            type="text"
            placeholder="Иван Иванов"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Введите E-mail"
            type="email"
            placeholder="company@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Введите пароль"
            type="password"
            placeholder="**********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="Повторите пароль"
            type="password"
            placeholder="**********"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />

          <div className={styles.row}>
            <p>Уже есть аккаунт?</p>
            <Link className={styles.link} to="/auth">Войти</Link>
          </div>

          {/* ВАЖНО: кнопка отправляет форму, не дублируем onClick */}
          <Button type="submit" text={loading ? '...' : 'Создать аккаунт'} disabled={loading} variant="primary" />

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
              <img src={appleIcon} alt="appleId" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;
