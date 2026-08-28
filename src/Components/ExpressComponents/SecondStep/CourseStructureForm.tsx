import React, { useState } from "react";
import Button from "@/Components/ElementUi/Button/Button";
import UploadFile from "@/Components/ElementUi/UploadFile/UploadFile";
import styles from "./styles.module.css";
import arrowLeft from '../../../assets/icons/common/arrowleft.svg';
import arrowRight from '../../../assets/icons/common/arrowRight.svg';

interface CourseStructureFormProps {
  onBack: () => void;
  onNext: (csId: number) => void;
}

export const CourseStructureForm = ({ onBack, onNext }: CourseStructureFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (files: File[]) => {
    setSelectedFile(files[0] ?? null);
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      alert("Пожалуйста, выберите файл для загрузки");
      return;
    }
    // TODO: Здесь будет вызов API. 
    const mockCsId = 0; 
    
    console.log("Файл готов к загрузке:", selectedFile.name);
    onNext(mockCsId);
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
