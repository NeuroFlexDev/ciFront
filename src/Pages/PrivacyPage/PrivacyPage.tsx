import { Link } from 'react-router-dom';

import styles from './styles.module.css';

function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>
          Вернуться на главную
        </Link>

        <p className={styles.kicker}>Политика конфиденциальности</p>
        <h1 className={styles.title}>Lernium уважает данные пользователей и команд.</h1>

        <div className={styles.content}>
          <p>
            Мы используем персональные данные только для предоставления доступа к платформе, демонстрациям,
            обратной связи и развитию продукта.
          </p>
          <p>
            В рабочем контуре Lernium доступ к платформенным действиям предоставляется только после аутентификации,
            а пользовательские сценарии отделены от публичной продуктовой страницы.
          </p>
          <p>
            Для вопросов, связанных с обработкой данных, доступом к аккаунту или удалением информации, можно
            связаться по адресу <a href="mailto:admin@lernium.ru">admin@lernium.ru</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default PrivacyPage;
