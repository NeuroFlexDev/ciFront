import { useState, useRef } from 'react';
import slideIcon from '@/assets/icons/TextEditor/slideIcon.svg';
import styles from './styles.module.css';
import addImageIcon from '@/assets/icons/common/addImageIcon.svg';
import Button from '../Button/Button';
import close from '@/assets/icons/common/closeNotFrameIcon.svg';

const ImageEditor = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        handleCloseModal();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = () => {
    // Логика генерации изображения
    handleCloseModal();
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <img src={slideIcon} alt="Slide icon" />
        <p className={styles.title}>Редактор изображений</p>
      </div>

      <hr className={styles.divider} />

      {selectedImage ? (
        <div className={styles.imagePreview}>
          <img src={selectedImage} alt="Uploaded content" className={styles.previewImage} />
          <button 
            className={styles.removeButton} 
            onClick={() => setSelectedImage(null)}
          >
            <img src={close} alt="x" />
          </button>
        </div>
      ) : (
        <>
          <button 
            className={styles.buttonAddImage} 
            onClick={handleOpenModal}
          >
            <img src={addImageIcon} alt="Add image" />
            Нажмите, если для данного урока необходимо сгенерировать изображение
          </button>

          <input
            type="file"
            accept="image/png, image/jpeg"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <p className={styles.modalTitle}>Выберите способ добавления изображения</p>
            <Button onClick={handleGenerateImage} text="Сгенерировать изображение" />
            <Button onClick={() => fileInputRef.current?.click()} text='Загрузить изображение' />
            <button 
              className={styles.modalCloseButton}
              onClick={handleCloseModal}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;