import { useLocale } from "@/i18n/useLocale";
import { Children, isValidElement, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { apiFetch } from "@/shared/api";
import { ApiError, errorMessage } from "@/shared/errors";
import { useReconnect } from "@/hooks/useReconnect";
import DiagramBlock from "./DiagramBlock";
import { DIAGRAM_LANGUAGES } from "@/shared/diagrams";

export function ProtectedImage({ src, alt }: { src?: string; alt?: string }) {
  const { t } = useLocale();
  const [blob, setBlob] = useState<string>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useReconnect(() => { if (error) setVersion(value => value + 1); });
  const protectedPath = src?.match(
    /^(?:\/api)?(\/(?:images\/\d+\/content|support\/grants\/\d+\/images\/\d+\/content))$/,
  )?.[1];
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
            response.status === 401 ? "Войдите снова, затем повторите действие."
              : response.status >= 500 ? "Иллюстрация временно недоступна. Повторите загрузку."
                : "Иллюстрация недоступна в вашем сеансе.",
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
      rehypePlugins={[
        [rehypeKatex, { trust: false, maxSize: 20, maxExpand: 1000 }],
      ]}
      components={{
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          if (
            isValidElement<{ className?: string; children?: string }>(child)
          ) {
            const kind = /(?:^|\s)language-(\w+)/
              .exec(child.props.className ?? "")?.[1]
              ?.toLowerCase();
            if (kind && DIAGRAM_LANGUAGES.has(kind))
              return (
                <DiagramBlock
                  source={String(child.props.children ?? "")}
                  kind={kind}
                />
              );
          }
          return <pre>{children}</pre>;
        },
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
