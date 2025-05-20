import { useState, useEffect } from 'react';
import styles from './switcher.module.css';
import sun from '@/assets/icons/common/sun.svg';
import moon from '@/assets/icons/common/moon.svg';

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={styles.themeSwitcher}
      style={{
        backgroundColor: theme === 'dark' ? '#444' : '#D9D9D9',
        transition: 'background-color 0.3s',
      }}
      aria-label={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
    >
      <span
        className={styles.toggleCircle}
        style={{
          left: theme === 'dark' ? 'calc(100% - 31px - 4px)' : '4px',
          transition: 'left 0.3s ease',
        }}
      >
        {theme === 'light' ? <img className={styles.icon} src={sun} alt="☀️" /> : <img className={styles.icon} src={moon} alt="🌙" /> }
      </span>
    </button>
  );
};