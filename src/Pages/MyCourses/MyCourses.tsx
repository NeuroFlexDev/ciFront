// MyCoursesPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import NewCourse from '@/Components/ElementUi/NewCourse/NewCourseCard';

import pythonCourse from '@/assets/icons/course/programmingCourse.svg';
import marketingCourse from '@/assets/icons/course/marketingCourse.svg';
import artCourse from '@/assets/icons/course/drawCourse.svg';

import styles from './styles.module.css';

// Интерфейс, как приходит с бэкенда
interface CourseApiResponse {
  id: number;
  title: string;
  description: string;
  level: number;
  language: number;
}

// Интерфейс, нужный CardCourse
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

  // Хук для навигации
  const navigate = useNavigate();

  // Загружаем список курсов при монтировании
  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        console.log("🔄 Загружаем курсы из бэкенда...");
        // GET /api/courses/
        const resp = await fetch("http://127.0.0.1:8000/api/courses/");
        if (!resp.ok) {
          throw new Error(`Ошибка при загрузке курсов: ${resp.statusText}`);
        }
        const data: CourseApiResponse[] = await resp.json();
        if (abort) return;

        // Преобразуем
        const mappedCourses: CourseCard[] = data.map((course) => {
          let statusVal: 0 | 1 | 2 = 0;
          let imgVal = pythonCourse;

          // Например, определяем иконку/статус на основе level
          switch (course.level) {
            case 1:
              imgVal = pythonCourse;
              statusVal = 0;
              break;
            case 2:
              imgVal = marketingCourse;
              statusVal = 1;
              break;
            case 3:
              imgVal = artCourse;
              statusVal = 2;
              break;
            default:
              imgVal = pythonCourse;
              statusVal = 0;
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

        setCourses(mappedCourses);
        console.log("✅ Курсы загружены:", mappedCourses);
      } catch (error) {
        console.error("❌ Ошибка при загрузке курсов:", error);
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  // Функция удаления курса (DELETE /api/courses/{id})
  const handleDeleteCourse = async (courseId: number) => {
    try {
      console.log("🔄 Удаляем курс ID=", courseId);
      const resp = await fetch(`http://127.0.0.1:8000/api/courses/${courseId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw new Error(`Ошибка при удалении курса ID=${courseId}`);
      }
      // Успешно удалён на сервере -> удаляем из локального стейта
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      console.log("✅ Курс удалён:", courseId);
    } catch (error) {
      console.error("❌ Ошибка при удалении курса:", error);
      alert(String(error));
    }
  };

  // Функция "Редактировать" — переходим на страницу редактирования
  const handleEditCourse = (id: number) => {
    console.log("Редактируем курс:", id);
    // Роутим на /courses/:id/edit
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
          // Передаём onDelete={handleDeleteCourse}, onEdit={handleEditCourse} в CardCourse
          <CardCourse
            courses={courses}
            onDelete={handleDeleteCourse}
            onEdit={handleEditCourse}
          />
        )}
        
        {/* Ссылка на создание нового курса */}
        <Link className={styles.newCourseLink} to="/create-course">
          <NewCourse />
        </Link>
      </div>

      <Footer />
    </>
  );
};

export default MyCoursesPage;
