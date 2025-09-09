import React, { useState } from 'react';
import styles from './styles.module.css';
import deleteIcon from '@/assets/icons/common/deleteIcon.svg';
import arrowIcon from '@/assets/icons/common/arrowIcon.svg';
import addContentSectionIcon from '@/assets/icons/common/addContentSectionIcon.svg';
import closeIcon from '@/assets/icons/common/closeForm.svg';

interface Lesson {
  lesson: string;
  description: string;
}

interface Test {
  test: string;
  description: string;
}

interface Task {
  name: string;
}

interface ModuleComponentProps {
  index: number;
  height?: number;
  moduleTitle: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
  _onTitleChange: (newTitle: string) => void;
  onLessonAdd: (lesson: Lesson) => void;
  onLessonRemove: (index: number) => void;
  onTestAdd: (test: Test) => void;
  onTestRemove: (index: number) => void;
  onTaskAdd: (task: Task) => void;
  onTaskRemove: (index: number) => void;
  onModuleRemove: (index: number) => void;
}

const ModuleBlock: React.FC<ModuleComponentProps> = ({
  index,
  moduleTitle,
  lessons,
  tests,
  tasks,
  _onTitleChange,
  onLessonAdd,
  onLessonRemove,
  onTestAdd,
  onTestRemove,
  onTaskAdd,
  onTaskRemove,
  onModuleRemove,
}) => {
  const [activeFormType, setActiveFormType] = useState<'lesson' | 'test' | 'task' | null>(null);
  const [newLesson, setNewLesson] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddContent = (type: 'lesson' | 'test' | 'task') => {
    if (newLesson.trim() && (type === 'task' || newDescription.trim())) {
      if (type === 'lesson') {
        onLessonAdd({ lesson: newLesson, description: newDescription });
      } else if (type === 'test') {
        onTestAdd({ test: newLesson, description: newDescription });
      } else if (type === 'task') {
        onTaskAdd({ name: newLesson });
      }
      setNewLesson('');
      setNewDescription('');
      setActiveFormType(null);
    }
  };

  const handleClose = () => {
    setNewLesson('');
    setNewDescription('');
    setActiveFormType(null);
  };

  return (
    <div className={styles.moduleBlockContainer}>
      <div className={styles.headerModuleBlock}>
        <h1 className={styles.moduleTitleInput}>{moduleTitle}</h1>
        <div className={styles.btnContainer}>
          <button 
            className={styles.btnHeaderModuleBlock}
            onClick={() => onModuleRemove(index)}
          >
            <img src={deleteIcon} alt="Удалить" />
          </button>
          <button 
            className={styles.btnHeaderModuleBlock}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            <img src={arrowIcon} alt={isExpanded ? "Свернуть" : "Развернуть"} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <hr className={styles.divider} />
          {/* Секция уроков */}
          <div className={styles.lessonsList}>
            {lessons.map((lesson, idx) => (
              <div key={idx} className={styles.lessonItem}>
                <div className={styles.lessonHeader}>
                  <p className={styles.lessonTitle}>{lesson.lesson}</p>
                  <button 
                    onClick={() => onLessonRemove(idx)}
                    className={styles.btnHeaderModuleBlock}
                  >
                    <img src={deleteIcon} alt="Удалить" />
                  </button>
                </div>
                <p className={styles.lessonDescription}>{lesson.description}</p>
              </div>
            ))}
          </div>

          {/* Секция тестов */}
          {tests.length > 0 && (
            <>
              <hr className={styles.divider} />
              <div className={styles.lessonsList}>
                {tests.map((test, idx) => (
                  <div key={idx} className={styles.lessonItem}>
                    <div className={styles.lessonHeader}>
                      <p className={styles.lessonTitle}>{test.test}</p>
                      <button 
                        onClick={() => onTestRemove(idx)}
                        className={styles.btnHeaderModuleBlock}
                      >
                        <img src={deleteIcon} alt="Удалить" />
                      </button>
                    </div>
                    <p className={styles.lessonDescription}>{test.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Секция заданий */}
          {tasks.length > 0 && (
            <>
              <hr className={styles.divider} />
              <div className={styles.lessonsList}>
                {tasks.map((task, idx) => (
                  <div key={idx} className={styles.lessonItem}>
                    <div className={styles.lessonHeader}>
                      <p className={styles.lessonTitle}>{task.name}</p>
                      <button 
                        onClick={() => onTaskRemove(idx)}
                        className={styles.btnHeaderModuleBlock}
                      >
                        <img src={deleteIcon} alt="Удалить" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Форма добавления контента */}
          <div className={styles.addContentSection}>
            <div className={styles.contentTypeButtons}>
              <button 
                onClick={() => setActiveFormType('lesson')}
                className={styles.contentTypeButton}
              >
                <img src={addContentSectionIcon} alt="" />
                Добавить урок
              </button>
              <hr className={styles.divider} />
              <button 
                onClick={() => setActiveFormType('test')}
                className={styles.contentTypeButton}
              >
                <img src={addContentSectionIcon} alt="" />
                Добавить тест
              </button>
              <hr className={styles.divider} />
              <button 
                onClick={() => setActiveFormType('task')}
                className={styles.contentTypeButton}
              >
                <img src={addContentSectionIcon} alt="" />
                Добавить задание
              </button>
            </div>

            {activeFormType === 'lesson' && (
              <>
                <hr className={styles.divider} />
                <div className={styles.addForm}>
                  <div className={styles.lessonInputContainer}>
                    <input
                      type="text"
                      placeholder="Название урока"
                      value={newLesson}
                      onChange={(e) => setNewLesson(e.target.value)}
                      className={styles.lessonInput}
                    />
                    <button className={styles.btnHeaderModuleBlock} onClick={handleClose}>
                      <img src={closeIcon} alt="x" />
                    </button>
                  </div>
                  <textarea
                    placeholder="Описание урока"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className={styles.descriptionTextarea}
                  />
                  <button
                    onClick={() => handleAddContent('lesson')}
                    className={styles.addButton}
                  >
                    <img src={addContentSectionIcon} alt="" />
                    Добавить
                  </button>
                </div>
              </>
            )}

            {activeFormType === 'test' && (
              <>
                <hr className={styles.divider} />
                <div className={styles.addForm}>
                  <div className={styles.lessonInputContainer}>
                    <input
                      type="text"
                      placeholder="Введите название теста"
                      value={newLesson}
                      onChange={(e) => setNewLesson(e.target.value)}
                      className={styles.lessonInput}
                    />
                    <button className={styles.btnHeaderModuleBlock} onClick={handleClose}>
                      <img src={closeIcon} alt="x" />
                    </button>
                  </div>
                  <textarea
                    placeholder="О чем будет тест?"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className={styles.descriptionTextarea}
                  />
                  <button
                    onClick={() => handleAddContent('test')}
                    className={styles.addButton}
                  >
                    <img src={addContentSectionIcon} alt="" />
                    Добавить тест
                  </button>
                </div>
              </>
            )}

            {activeFormType === 'task' && (
              <>
                <hr className={styles.divider} />
                <div className={styles.addForm}>
                  <div className={styles.lessonInputContainer}>
                    <input
                      type="text"
                      placeholder="Напиши тему домашнего задания"
                      value={newLesson}
                      onChange={(e) => setNewLesson(e.target.value)}
                      className={styles.lessonInput}
                    />
                    <button className={styles.btnHeaderModuleBlock} onClick={handleClose}>
                      <img src={closeIcon} alt="x" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddContent('task')}
                    className={styles.addButton}
                  >
                    <img src={addContentSectionIcon} alt="" />
                    Добавить задание
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ModuleBlock;
