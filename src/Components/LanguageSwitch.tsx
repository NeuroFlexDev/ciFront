import { useLocale } from '@/i18n/useLocale';
export default function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <label className='language-picker'>
      <span>{locale === 'en' ? 'Language' : 'Язык'}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'ru')}
      >
        <option value='ru'>Русский</option>
        <option value='en'>English</option>
      </select>
    </label>
  );
}
