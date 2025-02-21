import styles from './styles.module.css';

interface TypeCourseProps {
  srcIcon: string;
  title: string;
  description: string;
}

const TypeCourse = ({ srcIcon, title, description }: TypeCourseProps) => {
  return (
    <div className={styles.courseCard}>
      <div className={styles.iconContainer}>
        <img 
            src={srcIcon} 
            alt={title} 
            className={styles.icon}
        />
        <p className={styles.title}>{title}</p>
      </div>
      <p className={styles.description}>{description}</p>
    </div>
  );
};

export default TypeCourse;
