import { ExternalLink, Globe2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import styles from './webSearch.module.css';

export type WebSearchEvidence = {
  status: 'not_needed' | 'disabled' | 'completed' | 'unavailable' | 'no_results' | 'unknown' | 'searching';
  reason?: string;
  warning?: string | null;
  queries?: string[];
  sources?: { url: string; title: string; retrieved_at?: string }[];
};

function publicLink(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export default function WebSearchStatus({ evidence }: { evidence?: WebSearchEvidence | null }) {
  const { locale } = useLocale();
  if (!evidence) return null;
  const en = locale === 'en';
  const labels: Record<WebSearchEvidence['status'], string> = {
    completed: en ? 'Internet sources found' : 'Найдены материалы в интернете',
    not_needed: en ? 'Your sources are sufficient' : 'Ваших материалов достаточно',
    disabled: en ? 'Internet search is off' : 'Поиск в интернете выключен',
    unavailable: en ? 'Internet search is unavailable' : 'Поиск в интернете недоступен',
    no_results: en ? 'No verified sources found' : 'Проверяемые источники не найдены',
    unknown: en ? 'Search status is not confirmed yet' : 'Статус поиска пока не подтверждён',
    searching: en ? 'Looking for additional sources' : 'Ищем дополнительные материалы',
  };
  const reasons: Record<string, string> = {
    author_or_delivery_setting: en ? 'Generation uses the documents you selected.' : 'Генерация использует выбранные вами документы.',
    source_coverage_sufficient: en ? 'No additional search was required by the source coverage check.' : 'По проверке объёма и тем исходных материалов дополнительный поиск не потребовался.',
    uncovered_plan_topics: en ? 'Some topics in the approved plan were not found in your documents.' : 'Часть тем подтверждённого плана не найдена в ваших документах.',
    limited_source_text: en ? 'Additional information was requested because the source text is limited.' : 'Для выбранного объёма курса в документах мало текста, поэтому запрошены дополнительные сведения.',
  };
  const reason = reasons[evidence.reason ?? ''];
  const sources = Array.from(new Map((evidence.sources ?? []).flatMap(source => {
    const url = publicLink(source.url);
    return url ? [[url, { ...source, url }] as const] : [];
  })).values());
  return <section className={styles.card} aria-label={en ? 'Internet sources' : 'Источники из интернета'}>
    <div className={styles.heading}><Globe2 size={21} aria-hidden='true' /><h3>{labels[evidence.status] ?? labels.unknown}</h3></div>
    {reason && <p>{reason}</p>}
    {evidence.warning && <p className={styles.warning}>{evidence.warning}</p>}
    {sources.length > 0 && <>
      <p>{en ? 'These sources supplement your uploaded documents. Review them before publishing.' : 'Эти источники дополняют загруженные документы. Проверьте их перед публикацией курса.'}</p>
      <ul>{sources.map(source => <li key={source.url}>
        <a href={source.url} target='_blank' rel='noopener noreferrer'>
          <span>{source.title || new URL(source.url).hostname}<small>{new URL(source.url).hostname}</small></span>
          <ExternalLink size={16} aria-hidden='true' />
        </a>
      </li>)}</ul>
    </>}
    {!!evidence.queries?.length && <details><summary>{en ? 'Search queries' : 'Поисковые запросы'}</summary><ul>{evidence.queries.map((query, index) => <li key={index}>{query}</li>)}</ul></details>}
  </section>;
}
