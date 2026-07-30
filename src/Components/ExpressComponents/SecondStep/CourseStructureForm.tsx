import React, { useState } from "react";
import Button from "@/Components/ElementUi/Button/Button";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import styles from "./styles.module.css";
import { apiFetch } from "@/shared/api";
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';

interface CourseStructureFormProps {
  onBack: () => void;
  onNext: (csId: number) => void;
}

export const CourseStructureForm = ({ onBack, onNext }: CourseStructureFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    // Блокируем отправку, если файл не выбран
    if (!selectedFile) {
      alert("Пожалуйста, выберите файл для загрузки");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    
    // Если будут какие то доп поля, их можно добавить так:
    // formData.append("course_id", "123");

    try {
      const response = await apiFetch("/course-structure/", {
        method: "POST",
        body: formData, 
        // короче тут сделал пока что через форм дата
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ошибка при сохранении структуры", errorText);
        throw new Error("Ошибка при сохранении структуры");
      }

      const savedStruct = await response.json();
      onNext(savedStruct.id);
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      alert("Ошибка при сохранении структуры курса");
    }
  };

  return (
    <div className={styles.secontStepContainer}>
      <div className={styles.structureDataCont}>
        <UploadFile 
          label="Загрузите файл со структурой курса"
          onFileSelect={handleFileSelect} 
        />
      </div>

      <div className={styles.buttonContainer}>
        <div style={{ maxWidth: '145px' }}>
          <Button
              text="Назад"
              onClick={onBack}
              variant="secondary"
              icon={<img src={arrowLeft} alt="back" />}
              iconPosition="left" 
          />
        </div>
        <div style={{ maxWidth: '145px' }}>
          <Button 
            text="Далее" 
            onClick={handleSubmit} 
            variant="primary" 
            icon={<img src={arrowRight} alt="next" />}
            iconPosition="right" 
          />
        </div>
      </div>
    </div>
  );
};
