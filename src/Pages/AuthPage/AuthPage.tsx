import { useState } from 'react';
import Input from '@/Components/ElementUi/Input/Input';
import styles from './AuthPage.module.css';
import authImage from '@/assets/icons/auth/auth.svg';
import { Link } from 'react-router-dom';
import Button from '@/Components/ElementUi/Button/Button';
import whatsapp from '@/assets/icons/auth/WA.svg';
import telegram from '@/assets/icons/auth/tg.svg';
import vk from '@/assets/icons/auth/vk.svg';
import appleIcon from '@/assets/icons/auth/apple.svg';

const AuthPage = () => {
  // Состояния для полей ввода
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Обработчики изменений
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика авторизации
    console.log('Отправка данных:', { email, password });
    // Дальнейшие действия (например, вызов API)
  };

  return (
    <div className={styles.container}>
      <div className={styles.constCard}>
        <div className={styles.constCardImage}>
          <img src={authImage} alt="Hello" />
        </div>
        
        <form className={styles.contForm} onSubmit={handleSubmit}>
          <h1 className={styles.title}>С возвращением!</h1>
          <h3 className={styles.subtitle}>Создавайте и изучайте курсы с помощью AI</h3>

          <Input
            label="Введите E-mail"
            type="email"
            placeholder="company@example.com"
            value={email}
            onChange={handleEmailChange}
          />

          <Input
            label="Введите пароль"
            type="password"
            placeholder="**********"
            value={password}
            onChange={handlePasswordChange}
          />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '5px',
            marginTop: '20px' 
          }}>
            <p>Еще нет аккаунта?</p>
            <Link className={styles.link} to="/register">Создать</Link>
          </div>

          <Button text="Войти" onClick={handleSubmit} variant="primary" />

          <p>Или войдите с помощью</p>

          <div className={styles.contSocial}>
            <button className={styles.contSocialButton}>
                <img src={whatsapp} alt="whatsapp" />
            </button>
            <button className={styles.contSocialButton}>
                <img src={vk} alt="vk" />
            </button>
            <button className={styles.contSocialButton}>
                <img src={telegram} alt="tg" />
            </button>
            <button className={styles.contSocialButton}>
                <img src={appleIcon} alt="appleId" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;