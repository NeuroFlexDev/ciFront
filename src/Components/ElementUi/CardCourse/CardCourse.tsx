// CardCourse.tsx

import React from 'react';
import styles from './styles.module.css';

interface Course {
  id: number;
  title: string;
  description: string;
  status: 0 | 1 | 2;
  img: string;
}

interface CardCourseProps {
  courses: Course[];
  onDelete?: (id: number) => void; // callback удаления
  onEdit?: (id: number) => void;   // callback редактирования
}

const CardCourse: React.FC<CardCourseProps> = ({
  courses,
  onDelete,
  onEdit
}) => {

  const getStatusInfo = (status: number) => {
    switch(status) {
      case 0:
        return { text: 'Опубликован', style: styles.statusPublished, dotColor: styles.dotGreen };
      case 1:
        return { text: 'Черновик', style: styles.statusDraft, dotColor: styles.dotYellow };
      case 2:
        return { text: 'Архив', style: styles.statusArchived, dotColor: styles.dotRed };
      default:
        return { text: '', style: '', dotColor: '' };
    }
  };

  const handleUnpublish = (id: number) => {
    console.log('Снять с публикации курс с ID:', id);
  };

  // Вызываем переданные колбэки
  const handleEditClick = (id: number) => {
    if (onEdit) onEdit(id);
    else console.log('Нет колбэка onEdit');
  };

  const handleDeleteClick = (id: number) => {
    if (onDelete) onDelete(id);
    else console.log('Нет колбэка onDelete');
  };

  return (
    <div className={styles.courseList}>
      {courses.map((course) => (
        <div key={course.id} className={styles.card}>
          <img 
            src={course.img}
            alt={course.title}
            className={styles.cardImage}
          />
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>{course.title}</p>
            <p className={styles.cardDescription}>{course.description}</p>
            <span className={`${styles.status} ${getStatusInfo(course.status).style}`}>
              <span 
                className={`${styles.statusDot} ${getStatusInfo(course.status).dotColor}`}
              ></span>
              {getStatusInfo(course.status).text}
            </span>
          </div>

          <div className={styles.cardActions}>
            <button
              className={styles.button}
              onClick={() => handleUnpublish(course.id)}
            >
              Снять с публикации
            </button>
            <button
              className={styles.button}
              onClick={() => handleEditClick(course.id)}
            >
              Редактировать
            </button>
            <button
              className={styles.button}
              onClick={() => handleDeleteClick(course.id)}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardCourse;
