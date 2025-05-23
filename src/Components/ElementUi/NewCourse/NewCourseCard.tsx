import React from 'react';
import styles from './styles.module.css';
import addCourse from '@/assets/icons/common/personComp.svg';

const NewCourse: React.FC = () => {
  return (
    <div className={styles.newCourse}>
      <img src={addCourse} alt="+" />
      <h3 className={styles.text}>Создать новый курс</h3>
    </div>
  );
};

export default NewCourse;