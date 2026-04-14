// MyCoursesPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Menu from '@/Components/Menu/Menu';
import Footer from '@/Components/Footer/Footer';
import CardCourse from '@/Components/ElementUi/CardCourse/CardCourse';
import NewCourse from '@/Components/ElementUi/NewCourse/NewCourseCard';
import { apiFetch } from '@/shared/api';

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
  visual: 'code' | 'business' | 'creative';
}

const MyCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        const resp = await apiFetch("/courses/");
        if (!resp.ok) {
          throw new Error(`Ошибка при загрузке курсов: ${resp.statusText}`);
        }
        const data: CourseApiResponse[] = await resp.json();
        if (abort) return;

        const mappedCourses: CourseCard[] = data.map((course) => {
          let statusVal: 0 | 1 | 2 = 0;
          let visual: 'code' | 'business' | 'creative' = 'code';

          switch (course.level) {
            case 1:
              statusVal = 0;
              visual = 'code';
              break;
            case 2:
              statusVal = 1;
              visual = 'business';
              break;
            case 3:
              statusVal = 2;
              visual = 'creative';
              break;
            default:
              statusVal = 0;
              visual = 'code';
              break;
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            status: statusVal,
            visual,
          };
        });

        setCourses(mappedCourses);
      } catch (error) {
        console.error("Ошибка при загрузке курсов:", error);
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  const handleDeleteCourse = async (courseId: number) => {
    try {
      const resp = await apiFetch(`/courses/${courseId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw new Error(`Ошибка при удалении курса ID=${courseId}`);
      }
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (error) {
      console.error("Ошибка при удалении курса:", error);
      alert(String(error));
    }
  };

  const handleEditCourse = (id: number) => {
    navigate(`/courses/${id}/edit`);
  };

  const handleOpenCanvas = (id: number) => {
    navigate(`/courses/${id}/canvas`);
  };

  return (
    <>
      <Menu />

      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Рабочая зона</p>
            <h1 className={styles.title}>Курсы и проекты</h1>
            <p className={styles.lead}>
              Здесь собраны ваши курсы, входы в генерацию и прямой путь в канву. Один интерфейс, один рабочий контур.
            </p>
          </div>
        </section>

        <div className={styles.quickStartGrid}>
          <Link className={styles.newCourseLink} to="/express?flow=generate">
            <NewCourse
              title="Создать курс через генерацию"
              description="Собрать структуру по вводным, пройти генерацию и перейти к редактированию."
            />
          </Link>

          <Link className={styles.newCourseLink} to="/express?flow=canvas">
            <NewCourse
              title="Создать проект и сразу открыть канву"
              description="Создать пустой проект и начать собирать логику курса вручную на канве."
            />
          </Link>
        </div>

        <section className={styles.listSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Ваши материалы</h2>
            <p className={styles.sectionText}>Все проекты, которые уже можно открыть, редактировать или продолжить в канве.</p>
          </div>

          {loading ? (
            <p className={styles.loading}>Загрузка курсов...</p>
          ) : (
            <CardCourse
              courses={courses}
              onDelete={handleDeleteCourse}
              onEdit={handleEditCourse}
              onOpenCanvas={handleOpenCanvas}
            />
          )}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default MyCoursesPage;
