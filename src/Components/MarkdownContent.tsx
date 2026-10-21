import { useLocale } from "@/i18n/useLocale";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { apiFetch } from "@/shared/api";
import { ApiError, errorMessage } from "@/shared/errors";

export function ProtectedImage({ src, alt }: { src?: string; alt?: string }) {
  const { t } = useLocale();
  const [blob, setBlob] = useState<string>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const protectedPath = src?.match(/^(?:\/api)?(\/images\/\d+\/content)$/)?.[1];
  useEffect(() => {
    if (!protectedPath) return;
    let active = true;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    setBlob(undefined);
    setError("");
    void (async () => {
      try {
        const response = await apiFetch(protectedPath, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new ApiError(
            "Иллюстрация недоступна в вашем сеансе.",
            response.status,
            "http",
          );
        const data = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setBlob(objectUrl);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    })();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [protectedPath, version]);
  if (!protectedPath)
    return (
      <img
        src={src}
        alt={alt ?? t("Иллюстрация")}
        loading="lazy"
        referrerPolicy="no-referrer"
        style={{ maxWidth: "100%" }}
      />
    );
  if (error)
    return (
      <span role="alert">
        {t(error)}{" "}
        <button type="button" onClick={() => setVersion((value) => value + 1)}>
          {t("Загрузить изображение снова")}
        </button>
      </span>
    );
  if (!blob) return <span role="status">{t("Загружаем иллюстрацию…")}</span>;
  return (
    <img
      src={blob}
      alt={alt ?? t("Иллюстрация")}
      style={{ maxWidth: "100%" }}
    />
  );
}

/** Raw HTML stays disabled. GFM tables and TeX are rendered from the saved source. */
export default function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, {trust:false, maxSize:20, maxExpand:1000}]]}
      components={{
        img: ({ src, alt }) => <ProtectedImage src={src} alt={alt} />,
        a: ({ href, children }) => (
          <a href={href} rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
