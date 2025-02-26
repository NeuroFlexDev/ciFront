import React, { useState } from 'react';
import ModuleBlock from '@/Components/ModuleBlock/ModuleBlock';
import Menu from '@/Components/Menu/Menu';

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

interface Module {
  title: string;
  lessons: Lesson[];
  tests: Test[];
  tasks: Task[];
}

const TemplatesPage: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    {
      title: "Модуль 0: О курсе",
      lessons: [{
        lesson: "Урок 1 : Название",
        description: "Верхнеуровневое представление об топологии отделов/команд..."
      }],
      tests: [],
      tasks: []
    },
    {
      title: "Модуль 1: Название модуля",
      lessons: [
        {
          lesson: "Урок 1 : Добро пожаловать в энтерпрайз",
          description: "Верхнеуровневое представление об топологии отделов/команд в банке и процессов. Упрощенный ИТ-ландшафт с основными информационными системами"
        },
        {
          lesson: "Урок 2: Виды и структура приложений. Клиент и сервер",
          description: "Термины: АБС, фронтенд, бэкенд, БД, API, клиент, сервис, скрипты"
        },
        {
          lesson: "Урок 3: Рабочее место и первое знакомство с инфраструктурой",
          description: "В банк приходит Аксинья - новый сотрудник из стартапа. Аксинья узнает, что такое нюк и почему нельзя просто принести свой ноутбук. Термины: NDA, СИБ, нюк, логин"
        }
      ],
      tests: [],
      tasks: []
    }
  ]);

  const handleLessonAdd = (moduleIndex: number) => (lesson: Lesson) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons.push(lesson);
    setModules(updatedModules);
  };

  const handleTestAdd = (moduleIndex: number) => (test: Test) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].tests.push(test);
    setModules(updatedModules);
  };

  const handleTaskAdd = (moduleIndex: number) => (task: Task) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].tasks.push(task);
    setModules(updatedModules);
  };

  const handleLessonRemove = (moduleIndex: number) => (lessonIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons.splice(lessonIndex, 1);
    setModules(updatedModules);
  };

  const handleTestRemove = (moduleIndex: number) => (testIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].tests.splice(testIndex, 1);
    setModules(updatedModules);
  };

  const handleTaskRemove = (moduleIndex: number) => (taskIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].tasks.splice(taskIndex, 1);
    setModules(updatedModules);
  };

  const handleTitleChange = (moduleIndex: number) => (newTitle: string) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].title = newTitle;
    setModules(updatedModules);
  };

  const handleModuleRemove = (moduleIndex: number) => {
    const updatedModules = modules.filter((_, idx) => idx !== moduleIndex);
    setModules(updatedModules);
  };

  const handleSave = () => {
    console.log(modules);
  };

  return (
    <>
      <Menu />
      <h1>Шаблоны</h1>
      {modules.map((module, index) => (
        <ModuleBlock
          key={index}
          index={index}
          height={400}
          moduleTitle={module.title}
          lessons={module.lessons}
          tests={module.tests}
          tasks={module.tasks}
          onTitleChange={handleTitleChange(index)}
          onLessonAdd={handleLessonAdd(index)}
          onLessonRemove={handleLessonRemove(index)}
          onTestAdd={handleTestAdd(index)}
          onTestRemove={handleTestRemove(index)}
          onTaskAdd={handleTaskAdd(index)}
          onTaskRemove={handleTaskRemove(index)}
          onModuleRemove={handleModuleRemove}
        />
      ))}
      <button onClick={handleSave}>Сохранить</button>
    </>
  );
};

export default TemplatesPage;
