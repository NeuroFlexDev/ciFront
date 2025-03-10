import React, { useState } from 'react';
import { FormField } from '@/Components/ExpressComponents/FormField/FormField';
import Input from '@/Components/ElementUi/Input/Input';
import Select from '@/Components/ElementUi/Select/Select';
import UploadFile from '@/Components/ElementUi/UploadFile/UploadFile';
import Button from '@/Components/ElementUi/Button/Button';
import styles from './styles.module.css';

// Если используешь axios, раскомментируй или подключи:
// import axios from 'axios';

interface CourseInfoFormProps {
  onNext: () => void;
}

export const CourseInfoForm = ({ onNext }: CourseInfoFormProps) => {
  // Локальное состояние для полей формы
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);

  // Список для Select (уровень курса)
  const levels = [
    { id: 1, name: 'Курс с нуля' },
    { id: 2, name: 'Для начинающих' },
    { id: 3, name: 'Мастер в программировании' }
  ];

  // Список для Select (язык курса)
  const languages = [
    { id: 1, name: 'Русский' },
    { id: 2, name: 'English' },
  ];

  const handleSubmit = async () => {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/courses/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                description,
                level,
                language
            })
        });

        if (!response.ok) {
            throw new Error("Ошибка при сохранении курса");
        }

        onNext();
    } catch (error) {
        console.error("Ошибка при отправке данных", error);
    }
};


  return (
    <div className={styles.expressCourseContainer}>
      <p className={styles.title}>Давайте приступим!</p>
      <div className={styles.contCont}>
        <div className={styles.fieldContainer}>
          <FormField label="Введите название вашего курса">
            <Input
              type="text"
              placeholder="“Курс по основам программирования на C#”"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField label="Описание вашего курса">
            <Input
              type="textarea"
              placeholder="“Благодаря данному курсу вы сможете стать Junior C# разработчиком”"
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <FormField label="Уровень курса">
            <Select
              items={levels}
              placeholder="Выберите уровень курса"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </FormField>

          <FormField label="Язык курса">
            <Select
              items={languages}
              placeholder="Выберите язык обучения"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </FormField>

          <FormField label="Дополнительные материалы">
            <UploadFile
              onFileSelect={(file) => setAdditionalFile(file)}
              maxSize={10 * 1024 * 1024}
            />
          </FormField>

          <Button text="Продолжить" onClick={handleSubmit} variant="primary" />
        </div>
      </div>
    </div>
  );
};
