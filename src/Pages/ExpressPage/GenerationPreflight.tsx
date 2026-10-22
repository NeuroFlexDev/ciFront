import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, ListChecks, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";
import type { GenerationSettings } from "./CourseWizard";
import styles from "./wizard.module.css";

export type Preflight = {
  allowed: boolean; reasons: string[]; source_characters: number; source_bytes: number;
  minimum_calls: number; calls_limit: number; output_token_reservation: number; tokens_limit: number; note: string;
};

export default function GenerationPreflight({ settings, preflight, sourceCount, busy, onPrepare, onGenerate, onBack }: {
  settings: GenerationSettings; preflight: Preflight | null; sourceCount: number; busy: boolean;
  onPrepare: () => void; onGenerate: () => void; onBack: () => void;
}) {
  const { t, locale } = useLocale();
  const number = (value: number) => value.toLocaleString(locale === "en" ? "en-GB" : "ru-RU");
  const ready = preflight?.allowed;
  return <section className={styles.preflight} aria-labelledby="preflight-title">
    <header className={styles.preflightHeader}>
      <span className={styles.preflightIcon}><Sparkles size={28} aria-hidden="true" /></span>
      <div><span className={styles.eyebrow}>{t("Всё о будущем курсе")}</span>
        <h2 id="preflight-title">{t("Проверка перед генерацией")}</h2>
        <p>{t("Проверьте детали — дальше Лерниум подготовит структуру, уроки и задания. Вы сможете отредактировать результат перед публикацией.")}</p>
      </div>
    </header>
    <div className={styles.courseSummary}><span className={styles.eyebrow}>{t("Ваш курс")}</span>
      <h3>{settings.title || t("Название ещё не задано")}</h3><p>{settings.goal}</p>
      {settings.target_audience && <p><strong>{t("Для кого:")} </strong>{settings.target_audience}</p>}
    </div>
    <dl className={styles.preflightFacts}>
      <div><FileText aria-hidden="true" /><dt>{t("Документы")}</dt><dd>{sourceCount}<small>{t("источников выбрано")}</small></dd></div>
      <div><BookOpen aria-hidden="true" /><dt>{t("Объём курса")}</dt><dd>{settings.lesson_count}<small>{t("уроков в плане")}</small></dd></div>
      <div><ListChecks aria-hidden="true" /><dt>{t("Проверка знаний")}</dt><dd className={styles.testSummary}>{settings.module_tests_enabled && settings.final_test_enabled ? t("Тесты + итоговый") : settings.module_tests_enabled ? t("После модулей") : settings.final_test_enabled ? t("Итоговый тест") : t("Без тестов")}<small>{t("по вашим настройкам")}</small></dd></div>
    </dl>
    <div className={styles.preflightNext}>
      <h3>{t("Что произойдёт дальше")}</h3>
      <ol><li><span>1</span><div><strong>{t("Разберём материалы")}</strong><p>{t("Выделим ключевые темы и соберём логичный учебный план.")}</p></div></li>
        <li><span>2</span><div><strong>{t("Подготовим курс")}</strong><p>{t("Создадим уроки и выбранные проверки знаний. Ход работы будет виден на экране.")}</p></div></li>
        <li><span>3</span><div><strong>{t("Передадим вам на проверку")}</strong><p>{t("Курс сохранится как черновик. Ученики увидят его только после вашей публикации и назначения.")}</p></div></li></ol>
    </div>
    {preflight ? <>
      <div className={`${styles.preflightStatus} ${ready ? styles.ready : styles.needsAttention}`} role={ready ? "status" : "alert"}>
        {ready ? <ShieldCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
        <div><strong>{ready ? t("Предварительная проверка пройдена") : t("Нужно скорректировать параметры")}</strong>
          <p>{ready ? t("Источники доступны, выбранный объём укладывается в лимиты одного запуска. Доступная квота будет повторно проверена при старте.") : t("Генерация пока не запущена. Ваши документы и настройки сохранены.")}</p>
          {!ready && <ul>{preflight.reasons.map(reason => <li key={reason}>{t(reason)}</li>)}</ul>}
        </div>
      </div>
      <details className={styles.resourceDetails}>
        <summary>{t("Ресурсы и ограничения генерации")}</summary>
        <dl><div><dt>{t("Обработанные источники")}</dt><dd>{number(preflight.source_characters)} {t("символов")} · {number(Math.round(preflight.source_bytes / 1024))} {t("КБ")}</dd></div>
          <div><dt>{t("Минимум обращений к ИИ")}</dt><dd>{number(preflight.minimum_calls)} / {number(preflight.calls_limit)}</dd></div>
          <div><dt>{t("Резерв для текста ответа")}</dt><dd>{number(preflight.output_token_reservation)} / {number(preflight.tokens_limit)} {t("токенов")}</dd></div></dl>
        <p>{t(preflight.note)}</p><p>{t("Это предварительный расчёт, а не окончательная стоимость. Сервер учитывает фактические обращения, чтение источников и исправления.")}</p>
      </details>
    </> : <div className={styles.preflightStatus}><Check aria-hidden="true" /><p>{t("Перед запуском проверим источники, количество уроков и доступный бюджет.")}</p></div>}
    <footer className={styles.preflightFooter}>
      <button disabled={busy} onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />{t("Изменить настройки")}</button>
      <button className={styles.primary} disabled={busy || (preflight !== null && !ready)} onClick={preflight ? onGenerate : onPrepare}>
        {busy ? t("Подготавливаем…") : preflight ? t("Сгенерировать курс") : t("Проверить параметры")}<ArrowRight size={18} aria-hidden="true" />
      </button>
    </footer>
    <p className={styles.preflightFootnote}>{t("Генерация не публикует курс автоматически. Ваши исходные документы сохранятся.")}</p>
  </section>;
}
