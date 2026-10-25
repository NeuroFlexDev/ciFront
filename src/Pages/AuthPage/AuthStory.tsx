import { useLocale } from '@/i18n/useLocale';
import brand from '@/assets/figma/brand.svg';
import shutter from '@/assets/figma/auth-shutter.png';
import wide from '@/assets/figma/auth-glow-wide.svg';
import diagonal from '@/assets/figma/auth-glow-diagonal.svg';
import styles from './styles.module.css';

export default function AuthStory({
  title,
  description,
  registration = false,
  showBrand = true,
  showSteps = true,
}: {
  title: string;
  description?: string;
  registration?: boolean;
  showBrand?: boolean;
  showSteps?: boolean;
}) {
  const { t } = useLocale();
  return (
    <section className={styles.story}>
      <div className={styles.art} aria-hidden='true'>
        <img className={styles.glowWide} src={wide} alt='' />
        <img className={styles.glowDiagonal} src={diagonal} alt='' />
        <div className={styles.shutters}>
          {Array.from({ length: 15 }, (_, i) => (
            <img src={shutter} key={i} alt='' />
          ))}
        </div>
      </div>
      {showBrand && (
        <a className={styles.brand} href='/'>
          <img src={brand} alt={t('Лерниум')} />
        </a>
      )}
      <div className={styles.storyBody}>
        <h1>{title}</h1>
        <p>{description ?? t('Несколько простых действий и ваш курс готов')}</p>
        {showSteps && (
          <ol className={styles.steps}>
            <li>
              <span>1</span>
              {t(registration ? 'Создайте свой аккаунт' : 'Войдите в свой аккаунт')}
            </li>
            <li>
              <span>2</span>
              {t('Загрузите нужные документы')}
            </li>
            <li>
              <span>3</span>
              {t('Получите готовый курс')}
            </li>
          </ol>
        )}
      </div>
    </section>
  );
}
