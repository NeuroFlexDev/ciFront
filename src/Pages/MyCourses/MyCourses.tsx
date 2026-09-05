import React from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import { Employee } from '@/Components/ElementUi/CardCourse/AssignModal/AssignModal';
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

const mockEmployees: Employee[] = [
  {
    id: 1,
    name: 'Васильев Игорь',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 3,
  },
  {
    id: 2,
    name: 'Куликов Василий',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 2,
  },
  {
    id: 3,
    name: 'Голубев Павел',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 1,
  },
  {
    id: 4,
    name: 'Голубев Сергей',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 4,
  },
  {
    id: 5,
    name: 'Макаров Алексей',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 2,
  },
  {
    id: 6,
    name: 'Беляев Алексей',
    position: 'Менеджер по продажам',
    department: 'sales',
    avatar: null,
    assignedCourses: 1,
  },
  {
    id: 7,
    name: 'Степанов Павел',
    position: 'Менеджер по продажам',
    department: 'support',
    avatar: null,
    assignedCourses: 3,
  },
  {
    id: 8,
    name: 'Степанов Анатолий',
    position: 'Менеджер по продажам',
    department: 'support',
    avatar: null,
    assignedCourses: 0,
  },
  {
    id: 9,
    name: 'Петрова Мария',
    position: 'Маркетолог',
    department: 'marketing',
    avatar: null,
    assignedCourses: 2,
  },
  {
    id: 10,
    name: 'Сидоров Алексей',
    position: 'Маркетолог',
    department: 'marketing',
    avatar: null,
    assignedCourses: 1,
  },
  {
    id: 11,
    name: 'Козлов Дмитрий',
    position: 'Frontend-разработчик',
    department: 'development',
    avatar: null,
    assignedCourses: 5,
  },
  {
    id: 12,
    name: 'Новикова Анна',
    position: 'Специалист поддержки',
    department: 'support',
    avatar: null,
    assignedCourses: 3,
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

  const handleAssign = (courseId: number, employeeIds: number[]) => {
    console.log(`Курс ${courseId}: назначены сотрудники`, employeeIds);
  };

  return (
    <>
      <Menu />

      <main className={styles.page}>
        <CardCourse
          courses={mockCourses}
          employees={mockEmployees}
          onEdit={handleEditCourse}
          onOpenCanvas={handleOpenCanvas}
          onOpenCourse={handleOpenCourse}
          onAssign={handleAssign}
        />
      </main>
    </>
  );
};

export default MyCoursesPage;
