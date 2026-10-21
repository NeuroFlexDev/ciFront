import { useLocale } from "@/i18n/useLocale";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import Menu from "@/Components/Menu/Menu";
import styles from "./workspace.module.css";
export function Shell({
  title,
  description,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <>
      <Menu />
      <main className={styles.page}>
        <header className={styles.heading}>
          <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
        {children}
      </main>
    </>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export function CopyLink({ url, title }: { url: string; title?: string }) {
  const { t } = useLocale();

  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section className={styles.linkBox}>
      <h3>{title ?? t("Приглашение готово")}</h3>
      <p>
        {t(
          "Передайте ссылку нужному человеку лично. После закрытия страницы она не отображается повторно.",
        )}
      </p>
      <label>
        {t("Ссылка для передачи")}
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </label>
      <button
        className={styles.primary}
        onClick={() =>
          void navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied(true);
              setFailed(false);
            })
            .catch(() => setFailed(true))
        }
      >
        {copied ? t("Скопировано") : t("Скопировать ссылку")}
      </button>
      {failed && <p>{t("Выделите ссылку в поле и скопируйте её вручную.")}</p>}
    </section>
  );
}
