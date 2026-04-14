import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

import { useAuth } from "@/auth/useAuth";
import styles from "./styles.module.css";

type Mode = "login" | "register";

function readMode(value: string | null): Mode {
  return value === "register" ? "register" : "login";
}

function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login, register } = useAuth();

  const [mode, setMode] = useState<Mode>(() => readMode(searchParams.get("mode")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(readMode(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    navigate(searchParams.get("next") ?? "/courses", { replace: true });
  }, [isAuthenticated, isLoading, navigate, searchParams]);

  function switchMode(nextMode: Mode) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("mode", nextMode);
    setSearchParams(nextParams, { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "register" && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        email: email.trim(),
        password,
      };

      if (mode === "register") {
        await register(payload);
      } else {
        await login(payload);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Не удалось выполнить вход");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.copy}>
          <div className={styles.copyTop}>
            <Link to="/" className={styles.brand}>
              Lernium
            </Link>

            <div className={styles.copyBadge}>
              <ShieldCheck size={16} />
              Защищенный вход в рабочее пространство
            </div>
          </div>

          <div className={styles.copyBody}>
            <p className={styles.kicker}>{mode === "register" ? "Регистрация команды" : "Доступ к платформе"}</p>
            <h1 className={styles.title}>
              {mode === "register"
                ? "Создайте аккаунт команды и откройте платформу Lernium."
                : "Войдите в Lernium и продолжите работу с курсами и проектами."}
            </h1>
            <p className={styles.lead}>
              {mode === "register"
                ? "После регистрации доступны курсы, канва, структура и AI-инструменты в одном рабочем контуре."
                : "Авторизация открывает доступ к проектам, канве, структуре курса и внутренним AI-действиям."}
            </p>
          </div>

          <div className={styles.copyPanel}>
            <div className={styles.copyPanelHeader}>
              <Sparkles size={16} />
              После входа
            </div>
            <div className={styles.benefits}>
              <div className={styles.benefitItem}>
                <CheckCircle2 size={16} />
                Визуальная канва курса с узлами, связями и группировками
              </div>
              <div className={styles.benefitItem}>
                <CheckCircle2 size={16} />
                AI-действия внутри редактора, а не отдельным чатом
              </div>
              <div className={styles.benefitItem}>
                <CheckCircle2 size={16} />
                Защищенный рабочий контур для команды и структуры программы
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardKicker}>{mode === "register" ? "Новый аккаунт" : "С возвращением"}</p>
              <h2 className={styles.cardTitle}>
                {mode === "register" ? "Регистрация в платформе" : "Вход в Lernium"}
              </h2>
            </div>
            <p className={styles.cardNote}>
              {searchParams.get("next")
                ? "После авторизации вы будете перенаправлены в нужный раздел."
                : "Вход выполняется по email и паролю."}
            </p>
          </div>

          <div className={styles.modeSwitch}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={mode === "login" ? styles.modeButtonActive : styles.modeButton}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={mode === "register" ? styles.modeButtonActive : styles.modeButton}
            >
              Регистрация
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="team@company.ru"
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Не менее 8 символов"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>

            {mode === "register" ? (
              <label className={styles.field}>
                <span>Повторите пароль</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            ) : null}

            {mode === "register" ? (
              <div className={styles.passwordRules}>
                <span className={password.length >= 8 ? styles.ruleOk : styles.ruleMuted}>Минимум 8 символов</span>
                <span className={password && password === confirmPassword ? styles.ruleOk : styles.ruleMuted}>
                  Совпадение паролей
                </span>
              </div>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting
                ? "Подождите..."
                : mode === "register"
                  ? "Создать аккаунт"
                  : "Войти в платформу"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className={styles.cardFooter}>
            {mode === "register"
              ? "Аккаунт создается сразу и открывает доступ к рабочему пространству платформы."
              : "Нет доступа? Переключитесь на регистрацию и создайте рабочий аккаунт."}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
