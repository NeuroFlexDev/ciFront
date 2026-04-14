// CardCourse.tsx

import React from 'react';
import { BriefcaseBusiness, Code2, PenTool } from 'lucide-react';
import styles from './styles.module.css';

interface Course {
  id: number;
  title: string;
  description: string;
  status: 0 | 1 | 2;
  visual: 'code' | 'business' | 'creative';
}

interface CardCourseProps {
  courses: Course[];
  onDelete?: (id: number) => void; // callback удаления
  onEdit?: (id: number) => void;   // callback редактирования
  onOpenCanvas?: (id: number) => void;
}

const CardCourse: React.FC<CardCourseProps> = ({
  courses,
  onDelete,
  onEdit,
  onOpenCanvas,
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

  const handleEditClick = (id: number) => {
    if (onEdit) onEdit(id);
  };

  const handleDeleteClick = (id: number) => {
    if (onDelete) onDelete(id);
  };

  const handleCanvasClick = (id: number) => {
    if (onOpenCanvas) onOpenCanvas(id);
  };

  const renderVisual = (visual: Course['visual']) => {
    switch (visual) {
      case 'business':
        return <BriefcaseBusiness size={44} />;
      case 'creative':
        return <PenTool size={44} />;
      default:
        return <Code2 size={44} />;
    }
  };

  if (courses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>Курсов пока нет</h2>
        <p className={styles.emptyText}>
          Создайте проект с генерацией или сразу откройте канву и начните собирать структуру вручную.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.courseList}>
      {courses.map((course) => (
        <div key={course.id} className={styles.card}>
          <div className={styles.cardMedia}>
            <div className={styles.cardIcon} aria-hidden="true">
              {renderVisual(course.visual)}
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>{course.title}</p>
              <span className={`${styles.status} ${getStatusInfo(course.status).style}`}>
                <span 
                  className={`${styles.statusDot} ${getStatusInfo(course.status).dotColor}`}
                ></span>
                {getStatusInfo(course.status).text}
              </span>
            </div>
            <p className={styles.cardDescription}>{course.description}</p>
          </div>

          <div className={styles.cardActions}>
            <button
              className={styles.primaryAction}
              onClick={() => handleCanvasClick(course.id)}
            >
              Открыть канву
            </button>
            <div className={styles.secondaryActions}>
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
        </div>
      ))}
    </div>
  );
};

export default CardCourse;
