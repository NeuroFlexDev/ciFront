import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './notFound.module.css';

const NotFoundPage = () => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'visible';
    };
  }, []);

  return (
    <div className={styles.notFound}>
      <h1 className={styles.numberError}>404</h1>
      <h1 className={styles.title}>Ууупс, страница не была найдена</h1>
      <p className={styles.text}>Страница, на которую вы хотели зайти, не была найдена,</p>
      <p className={styles.text}>вернитесь назад или <Link className={styles.link} to="/main">на главную</Link> </p>
    </div>
  );
};

export default NotFoundPage;