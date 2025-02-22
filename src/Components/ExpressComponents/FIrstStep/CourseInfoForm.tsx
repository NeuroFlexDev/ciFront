import { FormField } from '@/Components/ExpressComponents/FormField/FormField';
import Input from '@/Components/ElementUi/Input/Input';
import Select from '@/Components/ElementUi/Select/Select';
import UploadFile from '@/Components/ElementUi/UploadFile/UploadFile';
import Button from '@/Components/ElementUi/Button/Button';
import styles from './styles.module.css';

interface CourseInfoFormProps {
  onNext: () => void;
}

export const CourseInfoForm = ({ onNext }: CourseInfoFormProps) => (
  <div className={styles.expressCourseContainer}>
    <p className={styles.title}>Давайте приступим!</p>
    <div className={styles.contCont}>
      <div className={styles.fieldContainer}>
        <FormField label="Введите название вашего курса">
          <Input type="text" placeholder="“Курс по основам программирования на C#”" />
        </FormField>

        <FormField label="Описание вашего курса">
          <Input
            type="textarea"
            placeholder="“Благодаря данному курсу вы сможете стать Junoir C# разработчиком”"
            rows={10}
          />
        </FormField>

        <FormField label="Уровень курса">
          <Select
            items={[
              { id: 1, name: 'Курс с нуля' },
              { id: 2, name: 'Для начинающих' },
              { id: 3, name: 'Мастер в программировании' }
            ]}
            placeholder="Выберите уровень курса"
          />
        </FormField>

        <FormField label="Язык курса">
          <Select
            items={[
              { id: 1, name: 'Русский' },
              { id: 2, name: 'English' },
            ]}
            placeholder="Выберите язык обучения"
          />
        </FormField>

        <FormField label="Дополнительные материалы">
          <UploadFile
            onFileSelect={(file) => console.log('Выбран файл:', file)}
            maxSize={10 * 1024 * 1024}
          />
        </FormField>

        <Button text="Продолжить" onClick={onNext} variant="primary" />
      </div>
    </div>
  </div>
);
