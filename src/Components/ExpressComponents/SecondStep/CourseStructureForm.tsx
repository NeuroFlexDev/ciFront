// components/CourseStructureForm.tsx
import Input from '@/Components/ElementUi/Input/Input';
import RadioButton from '@/Components/ElementUi/RadioButton/RadioButton';
import Checkbox from '@/Components/ElementUi/Checkbox/Checkbox';
import Button from '@/Components/ElementUi/Button/Button';
import LabelField from '@/Components/ElementUi/LabelField/LabelField';
import styles from './styles.module.css';

interface CourseStructureFormProps {
  selectedValue: string;
  items: Array<{ id: number; label: string; checked: boolean }>;
  onValueChange: (value: string) => void;
  onItemsChange: (items: Array<{ id: number; label: string; checked: boolean }>) => void;
  onBack: () => void;
  onNext: () => void;
}

export const CourseStructureForm = ({
  selectedValue,
  items,
  onValueChange,
  onItemsChange,
  onBack,
  onNext,
}: CourseStructureFormProps) => (
  <div className={styles.secontStepContainer}>
    <p className={styles.title}>Структура курса</p>
    <div className={styles.structureDataCont}>
      <div className={styles.itemGridStructure}>
        <LabelField text="Введите количество секций" />
        <Input type="text" placeholder="10" />
      </div>

      <div className={styles.itemGridStructure}>
        <LabelField text="Количество тестов в секции" />
        <Input type="text" placeholder="10" />
      </div>

      <div className={styles.itemGridStructure}>
        <LabelField text="Количество уроков в секции" />
        <Input type="text" placeholder="10" />
      </div>

      <div className={styles.itemGridStructure}>
        <LabelField text="Количество вопросов в тесте" />
        <Input type="text" placeholder="10" />
      </div>

      <div className={styles.finalTest}>
        <LabelField text="Наличие финального теста" />
        <div className={styles.radioGroup}>
          <RadioButton
            name="test-group"
            value="yes"
            label="Да"
            checked={selectedValue === 'yes'}
            onChange={onValueChange}
          />
          <RadioButton
            name="test-group"
            value="no"
            label="Нет"
            checked={selectedValue === 'no'}
            onChange={onValueChange}
          />
        </div>
      </div>

      <div className={styles.finalTest}>
        <LabelField text="Тип контента в курсе" />
        <div className={styles.checkboxGroup}>
          {items.map((item) => (
            <Checkbox
              key={item.id}
              label={item.label}
              checked={item.checked}
              onChange={(e) => {
                const newItems = items.map((i) =>
                  i.id === item.id ? { ...i, checked: e.target.checked } : i
                );
                onItemsChange(newItems);
              }}
            />
          ))}
        </div>
      </div>
    </div>

    <div className={styles.buttonContainer}>
      {/* <Button
        text="Назад"
        onClick={onBack}
        variant="secondary"
        className={styles.backButton}
      /> */}
      <Button text="Продолжить" onClick={onNext} variant="primary" />
    </div>
  </div>
);
