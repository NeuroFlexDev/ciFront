import { useEffect, useState } from 'react';
import { Film, Play, X } from 'lucide-react';
import { apiFetch, assertAuthSession, captureAuthSession } from '@/shared/api';
import { errorMessage } from '@/shared/errors';
import { useLocale } from '@/i18n/useLocale';
import styles from './protectedVideo.module.css';

/** Video bytes are requested only on user action and remain authenticated.
 * Blob URLs avoid putting account tokens or public download links in markup. */
export default function ProtectedVideo({ src, title }: { src: string; title?: string }) {
  const { t } = useLocale();
  const [requestedPath, setRequestedPath] = useState<string>();
  const [blob, setBlob] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const path = src.match(
    /^(?:\/api)?(\/(?:media\/\d+\/content|support\/grants\/\d+\/media\/\d+\/content))$/,
  )?.[1];
  const requested = !!path && requestedPath === path;
  useEffect(() => {
    setBlob(undefined);
    setError('');
    setProgress(null);
    if (!requested || !path) return;
    let active = true;
    let url: string | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const controller = new AbortController();
    const session = captureAuthSession();
    void (async () => {
      try {
        const response = await apiFetch(path, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Войдите снова, затем повторите действие.'
              : 'Видео недоступно. Обновите страницу или обратитесь к руководителю.',
          );
        const mime = response.headers.get('content-type')?.split(';')[0];
        if (!mime || !['video/mp4', 'video/webm'].includes(mime))
          throw new Error('Сервер вернул неподдерживаемый формат видео.');
        const total = Number(response.headers.get('content-length'));
        reader = response.body?.getReader();
        let data: Blob;
        if (reader) {
          const chunks: Uint8Array<ArrayBuffer>[] = [];
          let received = 0;
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            assertAuthSession(session);
            if (!active) {
              await reader.cancel();
              return;
            }
            chunks.push(new Uint8Array(next.value));
            received += next.value.length;
            if (total > 0) setProgress(Math.min(100, Math.round((received * 100) / total)));
          }
          data = new Blob(chunks, { type: mime });
        } else data = await response.blob();
        assertAuthSession(session);
        if (!active) return;
        url = URL.createObjectURL(data);
        setBlob(url);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    })();
    return () => {
      active = false;
      controller.abort();
      void reader?.cancel().catch(() => {});
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, requested]);
  if (!path) return <span role='alert'>{t('Видео недоступно.')}</span>;
  return (
    <span className={styles.player}>
      {blob ? (
        <video
          src={blob}
          controls
          playsInline
          preload='metadata'
          aria-label={title || t('Видео')}
          onError={() =>
            setError(t('Браузер не смог воспроизвести видео. Попробуйте MP4 с H.264.'))
          }
        />
      ) : (
        <span className={styles.placeholder}>
          <Film size={32} aria-hidden />
          {title && <strong>{title}</strong>}
          {!requested && (
            <button type='button' onClick={() => setRequestedPath(path)}>
              <Play size={18} />
              {t('Открыть видео')}
            </button>
          )}
          {requested && !error && (
            <span role='status'>
              {t('Загружаем видео…')}
              {progress !== null && ` ${progress}%`}
            </span>
          )}
        </span>
      )}
      {error && (
        <span role='alert' className={styles.error}>
          {t(error)}
        </span>
      )}
      {requested && (
        <button type='button' className={styles.close} onClick={() => setRequestedPath(undefined)}>
          <X size={16} />
          {t(blob || error ? 'Закрыть видео' : 'Отменить загрузку')}
        </button>
      )}
    </span>
  );
}
