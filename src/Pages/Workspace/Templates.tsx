import CourseNavigation from '@/Components/CourseNavigation';
import { useState } from 'react';
import { useLocale } from '@/i18n/useLocale';
import { Link } from 'react-router-dom';
import AdminDialog from '@/Components/Admin/AdminDialog';
import { Shell, styles } from './shared';
import { templates } from './template-data';
import s from './templates.module.css';
export default function Templates() {
  const { t } = useLocale();
  const [category, setCategory] = useState('all');
  const [preview, setPreview] = useState<(typeof templates)[number] | null>(null);
  const categories = [
    ['all', 'Все'],
    ['onboarding', 'Онбординг'],
    ['sales', 'Продажи'],
    ['service', 'Сервис'],
    ['compliance', 'Регламенты'],
    ['product', 'Продукт'],
    ['discipline', 'Образование'],
  ];
  const visible = templates.filter((item) => category === 'all' || item.id === category);
  return (
    <Shell
      breadcrumbs={
        <Link className={s.back} to='/express'>
          ← {t('Создать курс')}
        </Link>
      }
      title={t('Шаблоны курсов')}
      description={t(
        'Выберите основу настроек. Содержание курса будет подготовлено из ваших источников.',
      )}
    >
      <CourseNavigation />
      <div className={s.filters}>
        <span>{t('Тема')}</span>
        <div role='group' aria-label={t('Тема шаблона')}>
          {categories.map(([id, label]) => (
            <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      <div className={s.grid}>
        {visible.map((template) => (
          <article key={template.id} className={s.card}>
            <h2>{t(template.title)}</h2>
            <p>{t(template.description)}</p>
            <p className={s.audience}>
              {t('Для кого:')} {t(template.audience)}
            </p>
            <div className={s.tags}>
              <span>
                {template.lessons} {t('уроков')}
              </span>
              <span>{t('Настраиваемый сценарий')}</span>
            </div>
            <div className={s.actions}>
              <button onClick={() => setPreview(template)}>{t('Предпросмотр')}</button>
              <Link to={`/express?template=${template.id}`}>{t('Создать по шаблону')}</Link>
            </div>
          </article>
        ))}
      </div>
      {preview && (
        <AdminDialog
          title={t(preview.title)}
          description={t(preview.description)}
          onClose={() => setPreview(null)}
          className={s.preview}
        >
          <dl>
            <div>
              <dt>{t('Цель обучения')}</dt>
              <dd>{t(preview.goal)}</dd>
            </div>
            <div>
              <dt>{t('Аудитория')}</dt>
              <dd>{t(preview.audience)}</dd>
            </div>
            <div>
              <dt>{t('Объём')}</dt>
              <dd>
                {preview.lessons} {t('уроков · настройки можно изменить')}
              </dd>
            </div>
          </dl>
          <p>
            {t(
              'После выбора загрузите свои материалы. Тема, цель и аудитория заполнятся автоматически; их можно отредактировать до генерации.',
            )}
          </p>
          <Link className={styles.primary} to={`/express?template=${preview.id}`}>
            {t('Создать по шаблону')}
          </Link>
        </AdminDialog>
      )}
    </Shell>
  );
}
