import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Network, Route, Users } from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import styles from './styles.module.css';

type ThemeKey = 'graphite' | 'ivory';

const capabilities = [
  {
    icon: Network,
    title: 'Структура курса',
    body: 'Модули, уроки, связи и зависимости собираются в одну рабочую схему без разрыва между планированием и исполнением.',
  },
  {
    icon: Bot,
    title: 'AI внутри продукта',
    body: 'Генерация, подсказки и развитие содержания запускаются прямо в рабочем контуре, а не в отдельном чате.',
  },
  {
    icon: Route,
    title: 'Траектории и логика',
    body: 'Курс можно вести как линейный поток, как ветвящуюся программу или как карту для нескольких ролей и уровней.',
  },
];

const workflow = [
  'Создайте проект и задайте контур программы.',
  'Соберите структуру вручную или запустите генерацию.',
  'Перейдите в канву и доработайте логику курса.',
  'Доведите содержание до публикационного состояния.',
];

const teams = [
  'Онлайн-школы',
  'Корпоративные академии',
  'Методические команды',
  'Предметные эксперты',
];

function MainPage() {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<ThemeKey>('graphite');

  const primaryPlatformLink = isAuthenticated ? '/courses' : '/auth?mode=register';

  return (
    <main className={styles.page} data-theme={theme}>
      <div className={styles.ambient} aria-hidden="true" />

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandTitle}>Lernium</span>
          <span className={styles.brandNote}>Платформа курсов для команд</span>
        </Link>

        <nav className={styles.nav}>
          <a href="#platform" className={styles.navLink}>Платформа</a>
          <a href="#workflow" className={styles.navLink}>Процесс</a>
          <a href="#teams" className={styles.navLink}>Команды</a>
          <a href="#access" className={styles.navLink}>Доступ</a>
        </nav>

        <div className={styles.headerActions}>
          <div className={styles.themeSwitch} aria-label="Переключение темы">
            <button
              type="button"
              className={theme === 'graphite' ? styles.themeButtonActive : styles.themeButton}
              onClick={() => setTheme('graphite')}
            >
              Графит
            </button>
            <button
              type="button"
              className={theme === 'ivory' ? styles.themeButtonActive : styles.themeButton}
              onClick={() => setTheme('ivory')}
            >
              Свет
            </button>
          </div>

          <Link to={primaryPlatformLink} className={styles.headerCta}>
            {isAuthenticated ? 'Открыть платформу' : 'Запросить доступ'}
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Lernium</p>
          <h1 className={styles.heroTitle}>
            Платформа, где курс собирается как управляемая система.
          </h1>
          <p className={styles.heroLead}>
            Структура, содержание, AI и логика прохождения работают в одном продукте. Команда не перескакивает между файлами, таблицами и разрозненными инструментами.
          </p>

          <div className={styles.heroActions}>
            <Link to={primaryPlatformLink} className={styles.primaryLink}>
              {isAuthenticated ? 'Перейти в платформу' : 'Создать доступ'}
            </Link>
            <a href="#platform" className={styles.secondaryLink}>Посмотреть возможности</a>
          </div>

          <div className={styles.heroList}>
            <div className={styles.heroListItem}><CheckCircle2 size={16} />Канва курса</div>
            <div className={styles.heroListItem}><CheckCircle2 size={16} />Генерация и ручная сборка</div>
            <div className={styles.heroListItem}><CheckCircle2 size={16} />Единый контур для команды</div>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.previewShell}>
            <div className={styles.previewToolbar}>
              <span className={styles.previewDot} />
              <span className={styles.previewDot} />
              <span className={styles.previewDot} />
            </div>

            <div className={styles.previewBody}>
              <div className={styles.previewBoard}>
                <div className={`${styles.previewNode} ${styles.nodeCourse}`}>Курс</div>
                <div className={`${styles.previewNode} ${styles.nodeModule}`}>Модуль</div>
                <div className={`${styles.previewNode} ${styles.nodeLesson}`}>Урок</div>
                <div className={`${styles.previewNode} ${styles.nodePractice}`}>Практика</div>
                <span className={`${styles.previewEdge} ${styles.edgeOne}`} />
                <span className={`${styles.previewEdge} ${styles.edgeTwo}`} />
                <span className={`${styles.previewEdge} ${styles.edgeThree}`} />
              </div>

              <div className={styles.previewSide}>
                <div className={styles.sideCard}>
                  <span className={styles.sideCaption}>Свойства</span>
                  <strong className={styles.sideTitle}>Модуль 01</strong>
                  <span className={styles.sideLine} />
                  <span className={styles.sideLineShort} />
                </div>

                <div className={styles.sideCard}>
                  <span className={styles.sideCaption}>AI</span>
                  <strong className={styles.sideTitle}>Разбить на уроки</strong>
                  <span className={styles.sideAction}>
                    Запустить <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>1</span>
          <span className={styles.metricLabel}>рабочий контур для структуры и содержания</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>2</span>
          <span className={styles.metricLabel}>пути запуска: генерация или прямая канва</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>AI</span>
          <span className={styles.metricLabel}>встроен в редактор и шаги сборки курса</span>
        </div>
      </section>

      <section className={styles.section} id="platform">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Платформа</p>
          <h2 className={styles.sectionTitle}>Один продукт вместо набора разрозненных инструментов</h2>
          <p className={styles.sectionLead}>
            Lernium объединяет создание проекта, структуру, генерацию, канву и редактирование в одном рабочем процессе.
          </p>
        </div>

        <div className={styles.capabilityGrid}>
          {capabilities.map(({ icon: Icon, title, body }) => (
            <article key={title} className={styles.capability}>
              <div className={styles.capabilityIcon}>
                <Icon size={18} />
              </div>
              <h3 className={styles.capabilityTitle}>{title}</h3>
              <p className={styles.capabilityBody}>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="workflow">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Процесс</p>
          <h2 className={styles.sectionTitle}>Путь от идеи до готового курса без потери логики</h2>
        </div>

        <div className={styles.workflow}>
          {workflow.map((item, index) => (
            <div key={item} className={styles.workflowItem}>
              <span className={styles.workflowIndex}>0{index + 1}</span>
              <p className={styles.workflowText}>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="teams">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Для команд</p>
          <h2 className={styles.sectionTitle}>Подходит тем, кто выпускает и развивает образовательные продукты</h2>
        </div>

        <div className={styles.teamGrid}>
          {teams.map((team) => (
            <div key={team} className={styles.teamCard}>
              <Users size={18} />
              <span>{team}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection} id="access">
        <div>
          <p className={styles.kicker}>Доступ</p>
          <h2 className={styles.ctaTitle}>Откройте платформу и начните собирать курс в едином контуре</h2>
          <p className={styles.ctaLead}>
            Регистрация открывает защищенный доступ к проектам, структуре, канве и AI-инструментам внутри продукта.
          </p>
        </div>

        <div className={styles.ctaActions}>
          <Link to={primaryPlatformLink} className={styles.primaryLink}>
            {isAuthenticated ? 'Открыть платформу' : 'Перейти к регистрации'}
          </Link>
          <a href="mailto:admin@lernium.ru" className={styles.secondaryLink}>
            Связаться с командой
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <span className={styles.footerBrand}>Lernium</span>
          <p className={styles.footerText}>Платформа для структуры курса, канвы и управляемой сборки образовательных продуктов.</p>
        </div>

        <div className={styles.footerLinks}>
          <Link to="/privacy" className={styles.footerLink}>Политика конфиденциальности</Link>
          <a href="mailto:admin@lernium.ru" className={styles.footerLink}>admin@lernium.ru</a>
        </div>
      </footer>
    </main>
  );
}

export default MainPage;
