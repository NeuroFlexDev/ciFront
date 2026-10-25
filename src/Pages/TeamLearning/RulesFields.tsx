import { useLocale } from '@/i18n/useLocale';
import type { Rules } from '../Learning/types';
import s from '../Learning/learning.module.css';

export default function RulesFields({
  value,
  onChange,
  features,
  disabled,
}: {
  value: Rules;
  onChange: (next: Rules) => void;
  features: Record<string, boolean>;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const toggle = (key: keyof Rules, label: string, description?: string) => {
    const unavailable =
      (key === 'allow_ai_grading' && !features.ai_grading) ||
      (key === 'allow_ai_assistant' && features.assistant === false);
    return (
      <label className={s.ruleRow} key={key}>
        <span>
          {t(label)}
          {description && <small>{t(description)}</small>}
          {unavailable && <small>{t('Функция не включена в поставку')}</small>}
        </span>
        <input
          className={s.ruleSwitch}
          type='checkbox'
          disabled={disabled || unavailable}
          checked={Boolean(value[key])}
          onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
        />
      </label>
    );
  };
  return (
    <div className={s.rulesLayout}>
      <div className={s.stack}>
        <section className={s.card}>
          <h2>{t('Оценивание')}</h2>
          <label className={s.ruleRow}>
            <span>
              {t('Проходной результат, %')}
              <small>{t('Минимальный результат для успешного прохождения теста.')}</small>
            </span>
            <input
              type='number'
              required
              min={0}
              max={100}
              step='0.1'
              disabled={disabled}
              value={value.pass_percent}
              onChange={(e) => onChange({ ...value, pass_percent: Number(e.target.value) })}
            />
          </label>
          <label className={s.ruleRow}>
            <span>
              {t('Максимум попыток')}
              <small>{t('Сколько раз участник может пройти тест.')}</small>
            </span>
            <input
              type='number'
              required
              min={1}
              max={100}
              disabled={disabled}
              value={value.max_attempts}
              onChange={(e) => onChange({ ...value, max_attempts: Number(e.target.value) })}
            />
          </label>
        </section>
        <section className={s.card}>
          <h2>{t('Завершение и сроки')}</h2>
          {toggle('require_all_lessons', 'Для завершения нужно прочитать все уроки')}
          {toggle('require_all_assessments', 'Для завершения нужны все задания')}
          {toggle('allow_late_submission', 'Разрешить сдавать после срока')}
        </section>
        <section className={s.card}>
          <h2>{t('Ответы и проверка')}</h2>
          <fieldset className={s.ruleAnswers} disabled={disabled}>
            <legend>{t('Когда показывать правильные ответы')}</legend>
            {(
              [
                ['never', 'Не показывать'],
                ['after_pass', 'После достижения проходного результата'],
                ['after_final_attempt', 'После последней попытки'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type='radio'
                  name='reveal-answers'
                  value={key}
                  checked={value.reveal_answers === key}
                  onChange={() => onChange({ ...value, reveal_answers: key })}
                />
                {t(label)}
              </label>
            ))}
          </fieldset>
          {toggle(
            'allow_ai_grading',
            'Разрешить предложения оценки от AI',
            'Итоговую оценку подтверждает проверяющий.',
          )}
          {toggle('allow_ai_assistant', 'Разрешить помощника по курсу')}
        </section>
        <section className={s.card}>
          <h2>{t('Публикация')}</h2>
          {toggle(
            'require_independent_approval',
            'Требовать независимое согласование перед публикацией',
          )}
        </section>
        <section className={s.card}>
          <h2>{t('Правила отдельного назначения')}</h2>
          <p className={s.muted}>{t('Что разрешено менять в отдельном назначении')}</p>
          {Object.entries({
            max_attempts: 'Число попыток',
            pass_percent: 'Проходной результат',
            allow_late_submission: 'Сдача после срока',
            reveal_answers: 'Открытие правильных ответов',
          }).map(([key, label]) => (
            <label className={s.ruleRow} key={key}>
              <span>{t(label)}</span>
              <input
                className={s.ruleSwitch}
                type='checkbox'
                disabled={disabled}
                checked={value.assignment_overrides.includes(key)}
                onChange={(e) =>
                  onChange({
                    ...value,
                    assignment_overrides: e.target.checked
                      ? [...value.assignment_overrides, key]
                      : value.assignment_overrides.filter((v) => v !== key),
                  })
                }
              />
            </label>
          ))}
        </section>
      </div>
      <aside className={`${s.card} ${s.rulesAside}`}>
        <h3>{t('Как применяются правила')}</h3>
        <ul>
          <li>{t('Правила работают по умолчанию для новых назначений в организации.')}</li>
          <li>{t('Автор может изменить только разрешённые параметры отдельного назначения.')}</li>
          <li>{t('Уже выданные назначения сохраняют свою версию материалов и правил.')}</li>
        </ul>
      </aside>
    </div>
  );
}
