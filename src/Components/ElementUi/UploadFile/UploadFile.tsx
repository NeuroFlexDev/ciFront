import { useRef, useState, useCallback } from 'react';
import styles from './styles.module.css';
import uploadFile from '../../../assets/icons/upload/folder.svg';
import pdfIcon from '../../../assets/icons/upload/pdf.svg';
import docxIcon from '../../../assets/icons/upload/word.svg';
import mdIcon from '../../../assets/icons/upload/md.svg';
import pptxIcon from '../../../assets/icons/upload/pptx.svg';
import closeImage from '../../../assets/icons/upload/close.svg';

interface UploadedFile {
  file: File;
  progress: number;
  id: string;
  status: 'uploading' | 'completed' | 'error';
}

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  allowedTypes?: string[];
  maxSize?: number;
  label?: string;
}

const UploadFile = ({
  onFileSelect,
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  maxSize = 10 * 1024 * 1024,
  label
}: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

const getFileIcon = (type: string, fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (type === 'application/pdf' || extension === 'pdf') {
    return (
      <div className={styles.fileIconWrapper}>
        <img src={pdfIcon} alt="pdf" />
      </div>
    );
  }
  
  if (type.includes('msword') || type.includes('wordprocessingml') || 
      extension === 'doc' || extension === 'docx') {
    return (
      <div className={styles.fileIconWrapper}>
        <img src={docxIcon} alt="word" />
      </div>
    );
  }
  
  if (extension === 'ppt' || extension === 'pptx' || 
      type.includes('presentationml') || type.includes('powerpoint')) {
    return (
      <div className={styles.fileIconWrapper}>
        <img src={pptxIcon} alt="pptx" />
      </div>
    );
  }
  
  if (extension === 'md' || extension === 'markdown' || type === 'text/markdown') {
    return (
      <div className={styles.fileIconWrapper}>
        <img src={mdIcon} alt="md" />
      </div>
    );
  }
  
  return (
    <div className={styles.fileIconWrapper}>
      <svg className={styles.fileIconSvg} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="8" fill="#8B8B8B"/>
        <path d="M12 14h16v14H12V14z" fill="white" fillOpacity="0.95"/>
        <path d="M15 18h10M15 22h10M15 26h7" stroke="#8B8B8B" strokeWidth="1.5" strokeLinecap="round"/>
        <text x="20" y="32" textAnchor="middle" fill="#8B8B8B" fontSize="5" fontWeight="700">TXT</text>
      </svg>
    </div>
  );
};

  const simulateProgress = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f)
        );
      } else {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, progress } : f)
        );
      }
    }, 500);
  };

  const validateAndProcessFiles = (files: FileList | File[]) => {
    setError('');
    const validFiles: File[] = [];
    const fileArray = Array.from(files);

    fileArray.forEach(file => {
      if (!allowedTypes.includes(file.type) && !file.type.startsWith('text/')) {
        setError(`Файл "${file.name}" имеет недопустимый формат`);
        return;
      }

      if (file.size > maxSize) {
        setError(`Файл "${file.name}" слишком большой (макс. ${maxSize / 1024 / 1024}MB)`);
        return;
      }

      const newFile: UploadedFile = {
        file,
        progress: 0,
        id: Math.random().toString(36).substr(2, 9),
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, newFile]);
      validFiles.push(file);
      simulateProgress(newFile.id);
    });

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      validateAndProcessFiles(files);
      event.target.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      validateAndProcessFiles(files);
    }
  }, [allowedTypes, maxSize, onFileSelect]);

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={styles.container}>
      {/* {label && <label className={styles.fileLabel}>{label}</label>} */}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
        multiple
        className={styles.hiddenInput}
      />

      <div
        className={`${styles.uploadArea} ${isDragOver ? styles.dragOver : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <div className={styles.uploadContent}>
          <h3 className={styles.uploadTitle}>Перетащите PDF, DOCX, TXT или MD</h3>
          <p className={styles.uploadText}>
            или выберите файлы вручную — Лерниум извлечёт знания из документов
          </p>
          <button className={styles.selectButton} onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}>
            <img src={uploadFile} alt="" />
            Выбрать файлы
          </button>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className={styles.filesList}>
          {uploadedFiles.map((item) => (
            <div key={item.id} className={styles.fileItem}>
              <div className={styles.fileIcon}>
                {getFileIcon(item.file.type, item.file.name)}
              </div>
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{item.file.name}</div>
                <div className={styles.fileSize}>{formatFileSize(item.file.size)}</div>
              </div>
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
              <button
                className={styles.removeButton}
                onClick={() => handleRemoveFile(item.id)}
                aria-label="Удалить файл"
              >
                <img className={styles.closeIcon} src={closeImage} alt="" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default UploadFile;