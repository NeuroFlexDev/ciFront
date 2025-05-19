import styles from './styles.module.css';
import aiHelperIcon from '@/assets/icons/mainPageIcon/aiHelperIcons.svg';
import expressIcon from '@/assets/icons/mainPageIcon/expressIcon.svg';
import tempalateIcon from '@/assets/icons/mainPageIcon/tempalateIcon.svg';
import TypeCourse from '@/Components/TypeCourse/TypeCourse';

function MainPage() {
  const courses = [
    {
      icon: aiHelperIcon,
      title: "AI-Помощник",
      description: "Общайтесь с ИИ в формате диалога — он поможет собрать курс пошагово, предложит структуру, напишет тексты и подскажет, как улучшить материал.",
      path: "/ai-helper"
    },
    {
      icon: tempalateIcon,
      title: "Шаблоны",
      description: "Заполните короткую форму с темой, уровнем и целями курса — и сразу получите готовую структуру с контентом, который можно редактировать и адаптировать.",
      path: "/templates"
    },
    {
      icon: expressIcon,
      title: "Экспресс",
      description: "Выберите один из готовых шаблонов — введение, теория, задания и тест — и адаптируйте структуру под свой курс с помощью встроенного редактора.",
      path: "/express"
    }
  ];

  return (
    <>
      <div className={styles.containerMainPage}>
        <p className={styles.title}>Давайте приступим к созданию вашего персонального курса</p>
        <div className={styles.courses}>
          {courses.map((course, index) => (
            <TypeCourse
              key={index}
              srcIcon={course.icon}
              title={course.title}
              description={course.description}
              path={course.path}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default MainPage;
