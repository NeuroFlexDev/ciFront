import styles from './styles.module.css';
import { Link } from 'react-router-dom'

interface TypeCourseProps {
  srcIcon: string;
  title: string;
  description: string;
  path: string;
}

const TypeCourse = ({ srcIcon, title, description, path }: TypeCourseProps) => {
  return (
    <Link className={styles.courseCard} to={path}>
      <div className={styles.iconContainer}>
        <img
            src={srcIcon}
            alt={title}
            className={styles.icon}
        />
      </div>
      <div className={styles.textContainer}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
    </Link>
  );
};

export default TypeCourse;
