// src/Pages/AccountPage/AccountPage.tsx
import { useEffect, useState } from 'react';
import { getProfile, getMyCourses, getMyFeedback, User, updateProfile, changePassword } from '@/features/user/api';
import { useAuth } from '@/hooks/useAuth';
import Menu from '@/Components/Menu/Menu';
import styles from './AccountPage.module.css';

const AccountPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const [u, c, f] = await Promise.all([getProfile(), getMyCourses().catch(() => []), getMyFeedback().catch(() => [])]);
        setUser(u);
        setFullName(u.full_name || '');
        setEmail(u.email);
        setCourses(c);
        setFeedback(f);
      } catch (e: any) {
        setErr(e?.response?.data?.detail || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({ full_name: fullName, email });
      setUser(data);
      setEditOpen(false);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setPwdSaving(true);
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd });
      setPwdOpen(false);
      setOldPwd('');
      setNewPwd('');
      alert('Пароль обновлён');
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Ошибка смены пароля');
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) return <div className={styles.loader}>Загрузка...</div>;
  if (err) return <div className={styles.error}>{err}</div>;
  if (!user) return <div className={styles.error}>Нет данных пользователя</div>;

  return (
    <div className={styles.layout}>
      <Menu />

      <main className={styles.page}>
        <section className={styles.profile}>
          <div className={styles.avatar}>{user.full_name?.[0] || user.email[0]}</div>
          <div className={styles.info}>
            <h1 className={styles.name}>{user.full_name || 'Без имени'}</h1>
            <p className={styles.email}>{user.email}</p>

            <div className={styles.actions}>
              <button onClick={() => setEditOpen(true)} className={styles.actionBtn}>Редактировать</button>
              <button onClick={() => setPwdOpen(true)} className={styles.actionBtn}>Сменить пароль</button>
              <button onClick={() => { logout(); window.location.href = '/auth'; }} className={styles.logoutBtn}>Выйти</button>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Мои курсы</h2>
          {courses.length === 0 && <p className={styles.empty}>Курсов пока нет</p>}
          <ul className={styles.list}>
            {courses.map((c) => (
              <li key={c.id} className={styles.card}>
                <h3>{c.name}</h3>
                {c.description && <p className={styles.desc}>{c.description}</p>}
                {c.level && <span className={styles.level}>{c.level}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Мой фидбек</h2>
          {feedback.length === 0 && <p className={styles.empty}>Вы еще не оставляли отзывов</p>}
          <ul className={styles.list}>
            {feedback.map((f) => (
              <li key={f.id} className={styles.card}>
                <div className={styles.fbHeader}>
                  <span className={styles.tag}>{f.type}</span>
                  {typeof f.rating === 'number' && <span className={styles.rating}>★ {f.rating}</span>}
                </div>
                {f.comment && <p className={styles.desc}>{f.comment}</p>}
                <small>lesson_id: {f.lesson_id}</small>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Модалка редактирования */}
      {editOpen && (
        <div className={styles.modalBackdrop} onClick={() => setEditOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Редактировать профиль</h3>
            <label>Имя</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className={styles.modalActions}>
              <button onClick={() => setEditOpen(false)}>Отмена</button>
              <button disabled={saving} onClick={saveProfile}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка смены пароля */}
      {pwdOpen && (
        <div className={styles.modalBackdrop} onClick={() => setPwdOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Смена пароля</h3>
            <label>Старый пароль</label>
            <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
            <label>Новый пароль</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            <div className={styles.modalActions}>
              <button onClick={() => setPwdOpen(false)}>Отмена</button>
              <button disabled={pwdSaving} onClick={savePassword}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
