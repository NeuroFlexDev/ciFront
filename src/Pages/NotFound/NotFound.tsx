import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './notFound.module.css';
import notFound from '@/assets/icons/errorsPage/notFound.svg';

const NotFoundPage = () => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'visible';
    };
  }, []);

  return (
    <div className={styles.notFound}>
      <img src={notFound} alt="Страница не найдена" />
      <h1 className={styles.title}>Ой... Похоже, этой страницы вообще не существовало</h1>
      <Link className={styles.link} to="/">Вернуться на главную</Link>
    </div>
  );
};

export default NotFoundPage;