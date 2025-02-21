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
      description: "Мы автоматически сгенерируем структуру курса, наполним его контентом и предложим тестовые задания на основе вашей темы."
    },
    {
      icon: tempalateIcon,
      title: "Шаблоны",
      description: "Выберите один из готовых шаблонов курсов, адаптируйте его под свои нужды и наполните контентом вручную."
    },
    {
      icon: expressIcon,
      title: "Экспресс",
      description: "Быстро создайте курс, заполнив только основные параметры. Полный контроль над структурой и содержанием."
    }
  ];

  return (
    <>
      <div className={styles.containerMainPage}>
        <p className={styles.title}>Как вы хотели бы создать курс?</p>
        <div className={styles.courses}>
          {courses.map((course, index) => (
            <TypeCourse
              key={index}
              srcIcon={course.icon}
              title={course.title}
              description={course.description}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default MainPage;