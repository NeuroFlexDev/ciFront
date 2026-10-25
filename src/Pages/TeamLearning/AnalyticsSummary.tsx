import { useState } from 'react';
import { useLocale } from '@/i18n/useLocale';
import type { Assignment } from '../Learning/types';
import type { Group } from './types';
import s from '../Learning/learning.module.css';

const timestamp = (value: string) =>
  new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z').getTime();
export default function AnalyticsSummary({
  items,
  groups,
}: {
  items: Assignment[];
  groups: Group[];
}) {
  const { t, locale } = useLocale();
  const [weeks, setWeeks] = useState(7);
  const [by, setBy] = useState('course');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const active = items.filter((a) => a.state === 'active');
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeks - 1 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      start,
      end,
      count: active.filter(
        (a) =>
          a.completed_at &&
          timestamp(a.completed_at) >= start.getTime() &&
          timestamp(a.completed_at) < end.getTime(),
      ).length,
    };
  });
  const maximum = Math.max(1, ...buckets.map((b) => b.count));
  const grouped = new Map<string, { title: string; items: Assignment[] }>();
  for (const a of active) {
    const id = String(by === 'course' ? a.course_id : (a.group_id ?? 'none'));
    const row = grouped.get(id) || {
      title:
        by === 'course'
          ? a.title
          : groups.find((g) => g.id === a.group_id)?.name || t('Без группы'),
      items: [],
    };
    row.items.push(a);
    grouped.set(id, row);
  }
  return (
    <div className={s.analyticsSummary}>
      <section className={s.weeklyCard}>
        <div className={s.spread}>
          <h2>{t('Завершения по неделям')}</h2>
          <select
            aria-label={t('Период графика')}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          >
            {[4, 7, 12].map((n) => (
              <option key={n} value={n}>
                {t('{v0} недель', { v0: n })}
              </option>
            ))}
          </select>
        </div>
        <strong className={s.weekTotal}>
          {t('Завершений: {v0}', { v0: buckets.reduce((sum, b) => sum + b.count, 0) })}
        </strong>
        <div
          className={s.weekBars}
          role='img'
          aria-label={buckets
            .map(
              (b) =>
                `${b.start.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short' })}: ${b.count}`,
            )
            .join('; ')}
        >
          {buckets.map((b, i) => (
            <div key={b.start.toISOString()}>
              <span>{b.count}</span>
              <i
                data-peak={b.count === maximum}
                style={{ height: `${(b.count / maximum) * 240}px` }}
              />
              <small>
                {b.start.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </small>
              {i === weeks - 1 && <span className={s.currentWeek}>{t('Сейчас')}</span>}
            </div>
          ))}
        </div>
        {!buckets.some((b) => b.count) && (
          <p className={s.muted}>{t('За этот период завершений пока нет.')}</p>
        )}
      </section>
      <section className={s.card}>
        <div className={s.spread}>
          <h2>{t(by === 'course' ? 'По курсам' : 'По группам')}</h2>
          <div className={s.summarySwitch}>
            {[
              ['course', 'По курсам'],
              ['group', 'По группам'],
            ].map(([id, label]) => (
              <button key={id} aria-pressed={by === id} onClick={() => setBy(id)}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t(by === 'course' ? 'Курс' : 'Группа')}</th>
                <th>{t('Назначено')}</th>
                <th>{t('В процессе')}</th>
                <th>{t('Завершили')}</th>
                <th>{t('Просрочили')}</th>
                <th>{t('Средний балл')}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped).map(([id, row]) => {
                const scores = row.items.flatMap((a) =>
                  a.score_percent === null ? [] : [a.score_percent],
                );
                return (
                  <tr key={id}>
                    <td>{row.title}</td>
                    <td>{row.items.length}</td>
                    <td>{row.items.filter((a) => a.status === 'in_progress').length}</td>
                    <td>{row.items.filter((a) => a.status === 'completed').length}</td>
                    <td className={s.overdueValue}>
                      {
                        row.items.filter(
                          (a) =>
                            a.status !== 'completed' &&
                            a.due_at &&
                            timestamp(a.due_at) < Date.now(),
                        ).length
                      }
                    </td>
                    <td>
                      {scores.length
                        ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!grouped.size && <p className={s.muted}>{t('Назначений с такими условиями нет')}</p>}
      </section>
    </div>
  );
}
