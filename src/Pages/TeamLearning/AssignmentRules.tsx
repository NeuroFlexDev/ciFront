import { useLocale } from "@/i18n/useLocale";
import type { Rules } from "../Learning/types";
import type { TeamSettings } from "./types";
import s from "../Learning/learning.module.css";
export type RuleOverrides = Partial<
  Pick<
    Rules,
    "max_attempts" | "pass_percent" | "allow_late_submission" | "reveal_answers"
  >
>;
const names = {
  max_attempts: "Число попыток",
  pass_percent: "Проходной результат",
  allow_late_submission: "Сдача после срока",
  reveal_answers: "Открытие правильных ответов",
} as const;
export default function AssignmentRules({
  settings,
  value,
  onChange,
  disabled,
}: {
  settings: TeamSettings;
  value: RuleOverrides;
  onChange: (value: RuleOverrides) => void;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const allowed = settings.rules.assignment_overrides;
  const unavailable = Object.keys(value).filter(
    (key) => !allowed.includes(key),
  );
  const set = (key: keyof RuleOverrides, next: number | boolean | string) =>
    onChange({ ...value, [key]: next });
  return (
    <details className={s.card} style={{ marginTop: 24 }}>
      <summary>{t("Правила этого назначения")}</summary>
      <p className={s.muted}>
        {t(
          "Версия правил организации: {v0}. Исключения сохраняются только в новом назначении; старые результаты не меняются.",
          { v0: settings.revision },
        )}
      </p>
      <p>
        {t("Попыток: {v0} · проходной балл: {v1}%", {
          v0: value.max_attempts ?? settings.rules.max_attempts,
          v1: value.pass_percent ?? settings.rules.pass_percent,
        })}
      </p>
      {unavailable.length > 0 && (
        <div className={s.conflict}>
          <p>
            {t(
              "Организация больше не разрешает часть сохранённых исключений. Уберите их перед назначением.",
            )}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(
                Object.fromEntries(
                  Object.entries(value).filter(([key]) =>
                    allowed.includes(key),
                  ),
                ),
              )
            }
          >
            {t("Убрать недоступные исключения")}
          </button>
        </div>
      )}
      {!allowed.length && (
        <p>
          {t("Для этого пространства индивидуальные исключения не разрешены.")}
        </p>
      )}
      <div className={s.formGrid}>
        {(Object.keys(names) as (keyof RuleOverrides)[])
          .filter((key) => allowed.includes(key))
          .map((key) => (
            <div key={key} className={s.stack}>
              <label className={s.check}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={value[key] !== undefined}
                  onChange={(event) => {
                    if (event.target.checked) set(key, settings.rules[key]);
                    else {
                      const next = { ...value };
                      delete next[key];
                      onChange(next);
                    }
                  }}
                />
                {t(names[key])}
              </label>
              {value[key] !== undefined &&
                (key === "max_attempts" || key === "pass_percent" ? (
                  <input
                    aria-label={t(names[key])}
                    type="number"
                    min={key === "max_attempts" ? 1 : 0}
                    max={100}
                    step={key === "max_attempts" ? 1 : "any"}
                    disabled={disabled}
                    value={Number(value[key])}
                    onChange={(event) => set(key, Number(event.target.value))}
                  />
                ) : key === "allow_late_submission" ? (
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(value[key])}
                      onChange={(event) => set(key, event.target.checked)}
                    />
                    {t("Разрешить сдавать после срока")}
                  </label>
                ) : (
                  <select
                    aria-label={t(names[key])}
                    disabled={disabled}
                    value={String(value[key])}
                    onChange={(event) => set(key, event.target.value)}
                  >
                    <option value="never">{t("Не показывать")}</option>
                    <option value="after_pass">
                      {t("После успешной попытки")}
                    </option>
                    <option value="after_final_attempt">
                      {t("После последней попытки")}
                    </option>
                  </select>
                ))}
            </div>
          ))}
      </div>
    </details>
  );
}
