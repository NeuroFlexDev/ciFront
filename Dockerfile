# ---- Шаг 1: Сборка (Builder) ----
FROM node:20 AS builder

# Установим рабочую директорию
WORKDIR /app

ARG VITE_API_BASE_URL=/api

# Скопируем package*.json и установим зависимости
COPY package*.json ./
RUN npm install

# Скопируем остальной код
COPY . .

# Собираем продакшн-бандл
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---- Шаг 2: Production-контейнер ----
FROM nginx:alpine

# Копируем готовую сборку из builder-а
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx в форграунде
CMD ["nginx", "-g", "daemon off;"]
