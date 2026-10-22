import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { renderDiagram, type DiagramResult } from "@/shared/diagrams";
import { useLocale } from "@/i18n/useLocale";
import styles from "./DiagramBlock.module.css";

export default function DiagramBlock({
  source,
  kind = "mermaid",
}: {
  source: string;
  kind?: string;
}) {
  const { t } = useLocale();
  const [result, setResult] = useState<DiagramResult>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    let active = true;
    setResult(undefined);
    setError("");
    const timer = setTimeout(() => {
      void renderDiagram(source, kind).then(
        (value) => {
          if (active) setResult(value);
        },
        (reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Не удалось построить схему.",
            );
        },
      );
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [source, kind, retry]);
  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([result.svg], { type: "image/svg+xml" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "diagram.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <figure className={styles.diagram}>
      <figcaption className={styles.header}>
        <span>{t("Схема")}</span>
        <span>
          {result && (
            <>
              <button
                type="button"
                onClick={() => setZoom((value) => !value)}
                aria-pressed={zoom}
              >
                {zoom ? t("Уместить") : t("Увеличить")}
              </button>
              <button
                type="button"
                onClick={download}
                aria-label={t("Скачать схему SVG")}
              >
                <Download size={16} />
              </button>
            </>
          )}
        </span>
      </figcaption>
      {error ? (
        <div role="alert" className={styles.error}>
          <p>{t(error)}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            <RefreshCw size={16} /> {t("Повторить")}
          </button>
        </div>
      ) : result ? (
        <div
          className={styles.viewport}
          data-zoom={zoom}
          role="img"
          aria-label={t("Схема урока; текст доступен ниже")}
          tabIndex={0}
          dangerouslySetInnerHTML={{ __html: result.svg }}
        />
      ) : (
        <p role="status">{t("Строим схему…")}</p>
      )}
      <details className={styles.source} open={error ? true : undefined}>
        <summary>{t("Исходный текст схемы")}</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  );
}
