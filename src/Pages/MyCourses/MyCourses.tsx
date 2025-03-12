import React, { useState } from 'react';
import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import pythonCourse from '@/assets/icons/course/programmingCourse.svg';
import marketingCourse from '@/assets/icons/course/marketingCourse.svg';
import artCourse from '@/assets/icons/course/drawCourse.svg';
import styles from './styles.module.css';
import NewCourse from '@/Components/ElementUi/NewCourse/NewCourseCard';
import { Link } from 'react-router-dom';

// Определяем интерфейс Course с ограниченным набором значений для status
interface Course {
  id: number;
  title: string;
  description: string;
  status: 0 | 1 | 2;
  img: string;
}

const MyCoursesPage: React.FC = () => {
  const [courses] = useState<Course[]>([
    {
      id: 1,
      title: "Основы Python: Путь от новичка к разработчику",
      description:
        "Этот курс поможет вам освоить базовые концепции Python, научиться работать с переменными, циклами, функциями и основами ООП",
      status: 0,
      img: pythonCourse,
    },
    {
      id: 2,
      title: "Маркетинг в социальных сетях",
      description:
        "Научитесь продвигать бизнес, анализировать эффективность рекламных кампаний и привлекать аудиторию.",
      status: 1,
      img: marketingCourse,
    },
    {
      id: 3,
      title: "Искусство публичных выступлений",
      description:
        "Разберём, как подготовиться к выступлению, управлять голосом, жестикуляцией и привлекать внимание аудитории",
      status: 2,
      img: artCourse,
    },
    {
      id: 4,
      title: "Основы Python: Путь от новичка к разработчику",
      description:
        "Этот курс поможет вам освоить базовые концепции Python, научиться работать с переменными, циклами, функциями и основами ООП",
      status: 0,
      img: pythonCourse,
    },
    {
      id: 5,
      title: "Маркетинг в социальных сетях",
      description:
        "Научитесь продвигать бизнес, анализировать эффективность рекламных кампаний и привлекать аудиторию.",
      status: 1,
      img: marketingCourse,
    },
    {
      id: 6,
      title: "Маркетинг в социальных сетях",
      description:
        "Научитесь продвигать бизнес, анализировать эффективность рекламных кампаний и привлекать аудиторию.",
      status: 1,
      img: marketingCourse,
    },
  ]);

  return (
    <>
      <Menu />
      <div className={styles.containerCoursePage}>
        <h1 className="text-3xl font-bold mb-8">Ваши курсы</h1>
        <CardCourse courses={courses} />
        <Link className={styles.newCourseLink} to="/">
          <NewCourse />
        </Link>
      </div>
      <Footer />
    </>
  );
};

export default MyCoursesPage;
