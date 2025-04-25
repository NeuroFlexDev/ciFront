import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/shared/api';

import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import NewCourse from '@/Components/ElementUi/NewCourse/NewCourseCard';

import pythonCourse from '@/assets/icons/course/programmingCourse.svg';
import marketingCourse from '@/assets/icons/course/marketingCourse.svg';
import artCourse from '@/assets/icons/course/drawCourse.svg';

import styles from './styles.module.css';

interface CourseApiResponse {
  id: number;
  title: string;
  description: string;
  level: number;
  language: number;
}

interface CourseCard {
  id: number;
  title: string;
  description: string;
  status: 0 | 1 | 2;
  img: string;
}

const MyCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        setLoading(true);
        console.log('🔄 Загружаем курсы из бэкенда...');

        // Используем api вместо axios
        const res = await api.get<CourseApiResponse[]>('/courses/', { signal });
        const data = res.data;

        const mappedCourses: CourseCard[] = data.map((course) => {
          let statusVal: 0 | 1 | 2 = 0;
          let imgVal = pythonCourse;

          switch (course.level) {
            case 1:
              statusVal = 0;
              imgVal = pythonCourse;
              break;
            case 2:
              statusVal = 1;
              imgVal = marketingCourse;
              break;
            case 3:
              statusVal = 2;
              imgVal = artCourse;
              break;
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            status: statusVal,
            img: imgVal,
          };
        });

        if (!signal.aborted) {
          setCourses(mappedCourses);
          console.log('✅ Курсы загружены:', mappedCourses);
        }
      } catch (err: any) {
        if (!signal.aborted) {
          console.error('❌ Ошибка при загрузке курсов:', err);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  const handleDeleteCourse = async (courseId: number) => {
    try {
      console.log('🔄 Удаляем курс ID=', courseId);
      await api.delete(`/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      console.log('✅ Курс удалён:', courseId);
    } catch (err: any) {
      console.error('❌ Ошибка при удалении курса:', err);
      const message = err.response?.data?.message || err.message || String(err);
      alert(message);
    }
  };

  const handleEditCourse = (id: number) => {
    navigate(`/courses/${id}/edit`);
  };

  return (
    <>
      <Menu />

      <div className={styles.containerCoursePage}>
        <h1 className="text-3xl font-bold mb-8">Ваши курсы</h1>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <CardCourse
            courses={courses}
            onDelete={handleDeleteCourse}
            onEdit={handleEditCourse}
          />
        )}

        <Link className={styles.newCourseLink} to="/create-course">
          <NewCourse />
        </Link>
      </div>

      <Footer />
    </>
  );
};

export default MyCoursesPage;
