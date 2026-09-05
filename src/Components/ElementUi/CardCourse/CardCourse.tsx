import React, { useState } from 'react';
import info from '@/assets/icons/course/info.svg';
import addPeople from '@/assets/icons/course/addPeople.svg';
import AssignModal, { Employee } from '@/Components/ElementUi/CardCourse/AssignModal/AssignModal';
import styles from './cardCourse.module.css';

export interface Course {
  id: number;
  author: string;
  title: string;
  lessons: number;
  tests: number;
  tags: string[];
}

interface CardCourseProps {
  courses: Course[];
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
  onOpenCanvas?: (id: number) => void;
  onOpenCourse?: (id: number) => void;
  onAssign?: (courseId: number, employeeIds: number[]) => void;
  employees?: Employee[];
}

const CardCourse: React.FC<CardCourseProps> = ({
  courses,
  onEdit,
  onOpenCourse,
  onAssign,
  employees = [],
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);

  if (courses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>Курсов пока нет</h2>
        <p>Создайте первый курс, чтобы он появился в этом разделе.</p>
      </div>
    );
  }

  const handleOpenAssign = (courseId: number) => {
    setActiveCourseId(courseId);
    setModalOpen(true);
  };

  const handleAssign = (selectedIds: number[]) => {
    if (activeCourseId !== null) {
      onAssign?.(activeCourseId, selectedIds);
    }
    setModalOpen(false);
    setActiveCourseId(null);
  };

  return (
    <>
      <div className={styles.courseList}>
        {courses.map((course) => (
          <article
            key={course.id}
            className={styles.card}
            onClick={() => onOpenCourse?.(course.id)}
          >
            <div className={styles.author}>
              <span className={styles.authorLabel}>Автор курса</span>
              <span className={styles.authorName}>{course.author}</span>
            </div>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Информация о курсе"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(course.id);
                }}
              >
                <img src={info} alt="Информация о курсе" />
              </button>

              <button
                type="button"
                className={styles.iconButton}
                aria-label="Назначить сотрудников"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenAssign(course.id);
                }}
              >
                <img src={addPeople} alt="Назначить сотрудников" />
              </button>
            </div>

            <div className={styles.cardContent}>
              <h2 className={styles.cardTitle}>{course.title}</h2>

              <div className={styles.statistics}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Уроков</span>
                  <span className={styles.statValue}>{course.lessons}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Тестов</span>
                  <span className={styles.statValue}>{course.tests}</span>
                </div>
              </div>

              <div className={styles.tags}>
                {course.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <AssignModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveCourseId(null);
        }}
        onAssign={handleAssign}
        employees={employees}
      />
    </>
  );
};

export default CardCourse;
