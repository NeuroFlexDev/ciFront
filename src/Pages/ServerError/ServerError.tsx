import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './serverError.module.css';
import serverError from '@/assets/icons/errorsPage/serverError.svg';

const NotFoundPage = () => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'visible';
    };
  }, []);

  return (
    <div className={styles.notFound}>
      <img src={serverError} alt="Ошибка сервера" />
      <h1 className={styles.title}>Хмм... Наш ИИ кажется запутался в собственных алгоритмах</h1>
      <button className={styles.link} onClick={() => window.location.reload()}>Попробовать снова</button>
    </div>
  );
};

export default NotFoundPage;