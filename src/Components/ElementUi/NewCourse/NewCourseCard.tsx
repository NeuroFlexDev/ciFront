import React from 'react';
import styles from './styles.module.css';
import addIcon from '@/assets/icons/common/addImageIcon.svg';

const NewCourse: React.FC = () => {
  return (
    <div className={styles.newCourse}>
      <img src={addIcon} alt="+" />
      <p className={styles.text}>Создать новый курс</p>
    </div>
  );
};

export default NewCourse;