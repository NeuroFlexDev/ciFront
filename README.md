# 🎓 NeuroLearn — Frontend (`ciFront`)

Фронтенд платформа для генерации, редактирования и прохождения образовательных курсов с использованием AI.

---

## 🧠 Технологии

* ⚛️ **React + TypeScript**
* ⚡ **Vite** — быстрый сборщик
* 🎨 **Tailwind CSS** + PostCSS + кастомный UI-kit
* 🧪 Jest + React Testing Library
* API-интеграция с FastAPI (`ciBack`)

---

## 🚀 Быстрый старт

```bash
npm ci
npm run dev
```

Открой в браузере:
[http://localhost:5173](http://localhost:5173)

> ⚠️ Backend (`ciBack`) должен быть запущен на `http://localhost:8000`

---

## 🗂️ Структура проекта

```
ciFront/
├── src/
│   ├── components/       # UI компоненты
│   ├── pages/            # Страницы
│   ├── assets/           # Иконки, изображения
│   ├── styles/           # Глобальные стили
│   └── App.tsx           # Роутинг
├── docker-compose.yml
└── .env.example
```

---

## 🔌 Интеграция с API

Основной эндпоинт: `http://127.0.0.1:8000/api/`

Примеры:

* `GET /courses/` — список курсов
* `PUT /courses/{id}` — редактирование курса
* `GET /courses/{id}/modules/` — модули курса
* `GET /courses/{id}/generate_modules` — генерация модулей

---

## 🧪 Тестирование фронтенда

```bash
npm run test
```

Smoke-тесты расположены в `src/__tests__/`.

---

## 📌 Основная функциональность

* Просмотр и редактирование курсов
* Генерация контента через AI-backend
* Экспорт в PDF / Markdown
* Управление уроками и заданиями
* Темная и светлая тема

---

## 🧠 Made with ❤️ by NeuroFlex

*"Показать всем буйство нейронов"*

> Нашёл баг или идею? Создай issue или pull-request 🙌

---

## 🎯 Основные команды

### Backend

```bash
# Локальный запуск
make run

# Тесты
make test

# Docker
docker compose up -d --build
```

### Frontend

```bash
npm run dev
npm run build
npm run test
```

---

Теперь оба репозитория полностью синхронизированы:

* `ciBack/` содержит бэкенд и документацию по запуску и деплою
* `ciFront/` содержит фронтенд с Docker и CI/CD
* `mlcourse/` игнорируется и не мешает линтерам и коммитам.
