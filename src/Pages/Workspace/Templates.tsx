import {Link} from 'react-router-dom';
import {Shell,styles} from './shared';
import {templates} from './template-data';
export default function Templates(){return <Shell title="Сценарии курса" description="Выберите основу настроек. Содержание курса будет подготовлено из ваших источников."><div className={styles.grid}>{templates.map(t=><article key={t.id} className={styles.card}><h2>{t.title}</h2><p>{t.description}</p><p>{t.lessons} уроков · настройки можно изменить</p><Link className={styles.primary} to={`/express?template=${t.id}`}>Использовать сценарий →</Link></article>)}</div></Shell>;}
