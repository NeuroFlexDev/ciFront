import { useRef, useState } from 'react';
import styles from './styles.module.css';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  allowedTypes?: string[];
  maxSize?: number;
  label?: string; // Добавлен параметр label
}

const UploadFile = ({
  onFileSelect,
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxSize = 5 * 1024 * 1024,
  label
}: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError('Недопустимый формат файла');
      return;
    }

    if (file.size > maxSize) {
      setError(`Файл слишком большой (макс. ${maxSize / 1024 / 1024}MB)`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return '📄';
    if (type.includes('msword') || type.includes('wordprocessingml')) return '📝';
    return '📎';
  };

  return (
    <div className={styles.container}>
      {/* Отображаем label, если он передан */}
      {label && <label className={styles.fileLabel}>{label}</label>}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
        className={styles.hiddenInput}
      />

      {!selectedFile ? (
        <div className={styles.uploadArea} onClick={handleButtonClick}>
          <div className={styles.uploadContent}>
            <span className={styles.uploadIcon}>📁</span>
            <p className={styles.uploadText}>Нажмите для загрузки файла</p>
            <p className={styles.uploadSubtext}>Поддерживаемые форматы: PDF, DOC, DOCX</p>
          </div>
        </div>
      ) : (
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>
            {getFileIcon(selectedFile.type)}
          </span>
          <div className={styles.fileDetails}>
            <span className={styles.fileName}>{selectedFile.name}</span>
            <span className={styles.fileSize}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </span>
          </div>
          <button
            className={styles.removeButton}
            onClick={handleRemoveFile}
            aria-label="Удалить файл"
          >
            ×
          </button>
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default UploadFile;