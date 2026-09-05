import React from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import styles from './myCourses.module.css';

export interface CourseCard {
  id: number;
  author: string;
  title: string;
  lessons: number;
  tests: number;
  tags: string[];
}

const mockCourses: CourseCard[] = [
  {
    id: 1,
    author: 'Иванов Иван',
    title: 'Регламент работы с CRM',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
  {
    id: 2,
    author: 'Боваев Арслан',
    title: 'Фронтэнд-разработка на React',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
  {
    id: 3,
    author: 'Пашковский Руслан',
    title: 'Основы дизайна интерфейсов',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
  {
    id: 4,
    author: 'Иванов Иван',
    title: 'Регламент работы с CRM',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
  {
    id: 5,
    author: 'Иванов Иван',
    title: 'Регламент работы с CRM',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
  {
    id: 6,
    author: 'Иванов Иван',
    title: 'Регламент работы с CRM',
    lessons: 17,
    tests: 3,
    tags: ['Начинающий', 'Документация', 'CRM'],
  },
];

const MyCoursesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleEditCourse = (id: number) => {
    navigate(`/courses/${id}/edit`);
  };

  const handleOpenCanvas = (id: number) => {
    navigate(`/courses/${id}/canvas`);
  };

  const handleOpenCourse = (id: number) => {
    navigate(`/courses/${id}`);
  };

  return (
    <>
      <Menu />

      <main className={styles.page}>
        <CardCourse
          courses={mockCourses}
          onEdit={handleEditCourse}
          onOpenCanvas={handleOpenCanvas}
          onOpenCourse={handleOpenCourse}
        />
      </main>
    </>
  );
};

export default MyCoursesPage;
