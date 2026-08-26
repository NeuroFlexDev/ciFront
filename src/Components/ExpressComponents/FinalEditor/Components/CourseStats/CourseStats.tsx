import React from "react";
import StatCard from "../StatCard/StatCard";
import styles from "./styles.module.css";

interface CourseStatsProps {
  modulesCount: number;
  lessonsCount: number;
  duration: string;
}

const CourseStats: React.FC<CourseStatsProps> = ({
  modulesCount,
  lessonsCount,
  duration,
}) => {
  return (
    <div className={styles.stats}>
      <StatCard
        label="Всего модулей"
        value={modulesCount}
      />

      <StatCard
        label="Всего уроков"
        value={lessonsCount}
      />

      <StatCard
        label="Время прохождения"
        value={duration}
      />
    </div>
  );
};

export default CourseStats;