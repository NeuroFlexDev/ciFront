import React from 'react';
import styles from './styles.module.css';
import addIcon from '@/assets/icons/common/addImageIcon.svg';

interface NewCourseProps {
  title?: string;
  description?: string;
}

const NewCourse: React.FC<NewCourseProps> = ({
  title = 'Создать новый курс',
  description = 'Пошаговый путь: описание, структура, генерация и редактура.',
}) => {
  return (
    <div className={styles.newCourse}>
      <img src={addIcon} alt="+" />
      <p className={styles.text}>{title}</p>
      <p className={styles.description}>{description}</p>
    </div>
  );
};

export default NewCourse;
