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

## CI/CD

`.github/workflows/ci.yml` запускает lint, tests, dependency audit и production
build на каждом PR. Push в `main` публикует образ
`ghcr.io/neuroflexdev/cifront:sha-<commit>`, проверяет его на HIGH/CRITICAL
уязвимости, сохраняет SPDX SBOM и только после успешной проверки деплоит staging
с pinned commit image.

Для production используйте ручной workflow
`.github/workflows/promote.yml`. В Environment `production` задайте required
reviewers, `PRODUCTION_HOST`, `PRODUCTION_USER`, при необходимости пару
`PRODUCTION_BASTION_HOST`/`PRODUCTION_BASTION_USER`, а также секреты
`PRODUCTION_SSH_KEY` и `PRODUCTION_KNOWN_HOSTS`. В workflow передаётся SHA-тег
успешной сборки и HTTPS origin для health-check.


## Платформа и отдельная админка

`npm run dev` запускает платформу, `npm run dev:admin` — админку на порту 5174.
API по умолчанию: 8000 и 8002 соответственно; `VITE_BACKEND_URL` позволяет изменить адрес.
`npm run build` создаёт `dist` и `admin-dist`. Docker-образ содержит обе сборки,
но они обслуживаются разными контейнерами и виртуальными хостами.

В основной сборке отсутствуют операторские страницы `/admin`; переход оператора в
управление открывает отдельный адрес. Админка использует собственный вход и меню,
включает заказчиков, лимиты, пользователей, оплату, диагностику и согласованный доступ поддержки.
Настройки безопасности/MFA доступны в каждом сервисе. Платформенные сессии не подходят для admin API.

В B2B (`organization_kind=business`) владелец и управляющий начинают с `/company`:
должности → обязанности и навыки → сотрудники → курсы. Только владелец назначает
управляющих. Должность можно архивировать и восстановить; доступ сотрудника — приостановить,
сохраняя его данные. Из карточки должности открывается обычный мастер курса с привязкой к
требованиям этой работы. После публикации курс назначают сотрудникам должности.
Для B2G и образовательных организаций сохранены существующие экраны.
