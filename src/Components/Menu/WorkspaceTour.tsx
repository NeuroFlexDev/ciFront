import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import styles from './workspaceTour.module.css';

type Step = { target: string; title: string; text: string; mobile?: string };
const ownerSteps: Step[] = [
  {
    target: 'team',
    title: 'Начните с команды',
    text: 'Пригласите сотрудников и назначьте ответственных — тех, кто будет создавать регламенты и обучать кандидатов.',
  },
  {
    target: 'courses',
    title: 'Создайте первый регламент',
    text: 'Загрузите регламенты и инструкции — ИИ соберёт учебные материалы, тесты и практику. Проверьте содержание перед публикацией.',
    mobile:
      'Создавайте регламенты на компьютере: загрузите документы — ИИ соберёт учебные материалы и тесты. На телефоне их можно смотреть и назначать.',
  },
  {
    target: 'profile',
    title: 'Настройте организацию',
    text: 'Тариф, интеграции, правила обучения и роли сотрудников — в меню профиля.',
  },
  {
    target: 'results',
    title: 'Следите за результатами',
    text: 'Прогресс по регламентам, просрочки и работы на проверке — в разделе «Результаты».',
    mobile:
      'Откройте меню → Рабочие разделы → Результаты, чтобы увидеть прогресс по регламентам и просрочки.',
  },
];
const staffSteps: Step[] = [
  {
    target: 'team',
    title: 'Ваши кандидаты — здесь',
    text: 'В «Команда → Кандидаты» создавайте доступы новичкам, назначайте регламенты и следите за их прогрессом.',
  },
  {
    target: 'results',
    title: 'Проверяйте работы',
    text: 'Практические задания и открытые ответы ваших кандидатов ждут оценки в разделе «Проверка работ».',
    mobile:
      'Откройте меню → Рабочие разделы → Проверка работ. Здесь ответы ваших кандидатов, которые ждут оценки.',
  },
  {
    target: 'courses',
    title: 'Регламенты компании',
    text: 'Смотрите регламенты и программы и назначайте их своим кандидатам со сроками.',
  },
];
const learnerSteps: Step[] = [
  {
    target: 'courses',
    title: 'Начните с первого курса',
    text: 'Здесь все назначенные курсы и сроки. Оценки за тесты и задания появятся во вкладке «Результаты».',
  },
  {
    target: 'results',
    title: 'Результаты и уведомления',
    text: 'Оценки за тесты и задания — во вкладке «Результаты». О новых курсах и сроках напомним в уведомлениях.',
  },
];

/** The tour is scoped to the authenticated user and never changes their permissions. */
export default function WorkspaceTour({
  ready,
  owner,
  staff,
}: {
  ready: boolean;
  owner: boolean;
  staff: boolean;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const userId = user?.id;
  const isAdmin = user?.is_admin;
  const business = user?.organization_kind === 'business';
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 700);
  const dialog = useRef<HTMLDivElement>(null);
  const key = `lernium:tour:v1:${user?.id}:${user?.organization_id ?? 'personal'}:${owner ? 'owner' : staff ? 'staff' : 'learner'}`;
  const steps = owner ? ownerSteps : staff ? staffSteps : learnerSteps;
  const current = step === null ? null : steps[step];
  function close() {
    try {
      localStorage.setItem(key, 'done');
      sessionStorage.removeItem(`lernium:welcome:${user?.id}`);
    } catch {
      /* Storage may be disabled. */
    }
    setStep(null);
  }
  useDialogFocus(dialog, { active: step !== null, onClose: close });
  useEffect(() => {
    if (!ready || !userId || isAdmin || !business) return;
    try {
      if (sessionStorage.getItem(`lernium:welcome:${userId}`) && !localStorage.getItem(key))
        setStep(0);
    } catch {
      /* The application remains usable without local storage. */
    }
    const restart = () => setStep(0);
    window.addEventListener('lernium-tour-start', restart);
    return () => window.removeEventListener('lernium-tour-start', restart);
  }, [key, ready, userId, isAdmin, business]);
  useLayoutEffect(() => {
    if (!current) return;
    const update = () => {
      setMobile(window.innerWidth <= 700);
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-tour="${current.target}"]`),
      );
      const visible = candidates.find(
        (element) =>
          element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden',
      );
      setRect(visible?.getBoundingClientRect() ?? null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [current]);
  useEffect(() => {
    if (step === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [step]);
  if (!current || step === null) return null;
  return createPortal(
    <div className={styles.overlay}>
      {rect && (
        <div
          aria-hidden
          className={styles.spotlight}
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        ref={dialog}
        className={styles.hint}
        role='dialog'
        aria-modal='true'
        aria-labelledby='tour-title'
        aria-describedby='tour-description'
        tabIndex={-1}
        style={
          mobile
            ? undefined
            : {
                left: rect
                  ? Math.min(Math.max(24, rect.left - 16), window.innerWidth - 404)
                  : Math.max(24, window.innerWidth / 2 - 190),
                top: rect ? Math.min(rect.bottom + 20, window.innerHeight - 300) : 140,
              }
        }
      >
        <span className={styles.counter}>
          {t('Шаг {v0} из {v1}', { v0: step + 1, v1: steps.length })}
        </span>
        <h2 id='tour-title'>{t(current.title)}</h2>
        <p id='tour-description'>{t(mobile && current.mobile ? current.mobile : current.text)}</p>
        <div className={styles.actions}>
          <button onClick={close}>{t('Пропустить')}</button>
          <button
            className={styles.next}
            onClick={() => (step + 1 < steps.length ? setStep(step + 1) : close())}
          >
            {t(step + 1 === steps.length ? 'Начать' : 'Далее')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
