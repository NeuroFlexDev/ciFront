import React from "react";
import styles from "./Loader.module.css";

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loader}></div>
      {text && <p className={styles.loaderText}>{text}</p>}
    </div>
  );
};

export default Loader;
