# SKOROZVON-GCK

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg)](https://nodejs.org/)

**SKOROZVON-GCK** — это полнофункциональная система автоматизации и аналитики звонков для отдела продаж с интеграцией телефонии, транскрибацией разговоров и детальным контролем качества.

## 📋 Содержание

- [Возможности](#-возможности)
- [Технологический стек](#-технологический-стек)
- [Архитектура](#-архитектура)
- [Быстрый старт](#-быстрый-старт)
- [Настройка окружения](#-настройка-окружения)
- [API Documentation](#-api-documentation)
- [Docker](#-docker)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Лицензия](#-лицензия)

## ✨ Возможности

### 📞 Автоматизация звонков
- Интеграция с VoIP/телефонией через вебхуки
- Автоматическое создание и обновление записей о звонках
- Поддержка различных провайдеров телефонии (Twilio, Voximplant, etc.)
- Отслеживание статуса звонков в реальном времени

### 📊 Аналитика и дашборды
- Общая статистика по звонкам
- Performance менеджеров (answer rate, average duration)
- Дневная/недельная/месячная статистика
- Фильтрация по периодам и менеджерам

### 📝 Транскрибация и контроль качества
- Расшифровка записей разговоров
- Оценка менеджеров по скрипту продаж
- Анализ ключевых фраз и метрик

### 👥 Управление клиентами
- CRM-функциональность
- История взаимодействий с клиентом
- Теги и заметки

### 🔐 Безопасность и доступ
- JWT аутентификация
- Ролевая модель (admin, manager, operator)
- Защита API endpoints

## 🛠 Технологический стек

### Backend
| Технология | Версия | Описание |
|------------|--------|----------|
| **Runtime** | Node.js 20+ | JavaScript runtime |
| **Framework** | Hono 4.x | Ultrafast web framework |
| **Language** | TypeScript 5.7+ | Type-safe JavaScript |
| **Database** | PostgreSQL 15+ | Relational database |
| **Auth** | JWT + bcryptjs | Token-based auth |
| **Validation** | Zod | Schema validation |

### Frontend
| Технология | Версия | Описание |
|------------|--------|----------|
| **Framework** | React 18.3+ | UI library |
| **Build Tool** | Vite 6.x | Next-gen bundler |
| **State** | Zustand 5.x | State management |
| **Data Fetching** | TanStack Query 5.x | Server state management |
| **Routing** | React Router 7.x | Client-side routing |
| **Styling** | TailwindCSS 3.4+ | Utility-first CSS |
| **HTTP Client** | Axios 1.7+ | HTTP requests |

## 🏗 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │      Services       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│                  ┌───────▼───────┐                           │
│                  │  API Client   │                           │
│                  │   (Axios)     │                           │
│                  └───────┬───────┘                           │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTP/REST
                           │ Bearer Token Auth
┌──────────────────────────▼───────────────────────────────────┐
│                       Backend (Hono)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Middleware  │  │      Services       │  │
│  │  /api/*     │  │  Auth/CORS  │  │   Business Logic    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│                  ┌───────▼───────┐                           │
│                  │   Database    │                           │
│                  │   (PostgreSQL)│                           │
│                  └───────────────┘                           │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ Webhooks
┌──────────────────────────▼───────────────────────────────────┐
│                   Telephony Provider                         │
│              (Twilio / Voximplant / etc.)                    │
└──────────────────────────────────────────────────────────────┘
```

### Структура проекта

```
skorozvon-gck/
├── backend/
│   ├── src/
│   │   ├── db/           # Database connection & migrations
│   │   ├── middleware/   # Auth, logging, error handling
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types & schemas
│   │   └── index.ts      # Application entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   ├── store/        # Zustand stores
│   │   ├── utils/        # Helper functions
│   │   └── App.tsx       # Root component
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 20+ 
- PostgreSQL 15+
- npm или pnpm

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd skorozvon-gck
```

### 2. Настройка Backend

```bash
cd backend

# Установка зависимостей
npm install

# Копирование env файла
cp ../.env.example .env

# Редактирование .env (см. ниже)

# Запуск миграций
npm run db:migrate

# Запуск в режиме разработки
npm run dev
```

Backend будет доступен на `http://localhost:3001`

### 3. Настройка Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## ⚙️ Настройка окружения

### Переменные окружения

Скопируйте `.env.example` в оба каталога (`backend/` и `frontend/`) и настройте:

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skorozvon

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# Telephony Integration (optional)
TELEPHONY_API_KEY=your-telephony-api-key
TELEPHONY_WEBHOOK_SECRET=your-webhook-secret
```

#### Frontend (.env)

```bash
VITE_API_URL=/api
```

### Создание первого пользователя (Admin)

После запуска приложения создайте первого администратора через API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Или используйте seed скрипт (если доступен).

## 📡 API Documentation

### Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

### Authentication

Все endpoints кроме `/auth/login` требуют JWT токен в заголовке:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Auth

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/register` | Register new user | Admin |
| GET | `/auth/me` | Get current user | Auth |
| PUT | `/auth/me` | Update current user | Auth |
| GET | `/auth/users` | List all users | Admin |

#### Calls

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/calls` | List calls (paginated) | Auth |
| GET | `/calls/:id` | Get single call | Auth |
| POST | `/calls` | Create call | Admin/Manager |
| PUT | `/calls/:id` | Update call | Admin/Manager |
| DELETE | `/calls/:id` | Delete call | Admin |

#### Clients

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/clients` | List clients | Auth |
| GET | `/clients/:id` | Get single client | Auth |
| POST | `/clients` | Create client | Admin/Manager |
| PUT | `/clients/:id` | Update client | Admin/Manager |
| DELETE | `/clients/:id` | Delete client | Admin |

#### Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/analytics/overview` | Dashboard stats | Auth |
| GET | `/analytics/managers` | Manager performance | Admin/Manager |
| GET | `/analytics/daily` | Daily statistics | Auth |

#### Telephony

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/telephony/webhook` | Receive telephony events | Public* |
| GET | `/telephony/status` | Integration status | Admin |

*\*Webhook endpoint requires signature verification*

### Примеры запросов

#### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "manager",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Get Calls with Filters

```bash
curl -X GET "http://localhost:3001/api/calls?status=answered&startDate=2024-01-01&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

## 🐳 Docker

### Docker Compose

Для быстрого развертывания используйте Docker Compose:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Dockerfile (Backend)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 🚀 Deployment

### Production Checklist

- [ ] Установить `NODE_ENV=production`
- [ ] Сгенерировать безопасный `JWT_SECRET` (минимум 32 символа)
- [ ] Настроить HTTPS
- [ ] Настроить базу данных (connection pooling, индексы)
- [ ] Настроить логирование (Winston/Pino)
- [ ] Настроить мониторинг (health checks)
- [ ] Настроить backup базы данных
- [ ] Настроить rate limiting
- [ ] Проверить CORS настройки

### Environment Variables for Production

```bash
# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:strong-password@db-host:5432/skorozvon
JWT_SECRET=<generate-with-openssl-rand-base64-64>
PORT=3001
TELEPHONY_API_KEY=<your-production-key>
TELEPHONY_WEBHOOK_SECRET=<your-production-secret>
```

### Health Checks

- `/health` - Full health check with database connectivity
- `/ready` - Readiness probe for Kubernetes

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change PORT in .env
```

#### JWT Token Invalid

- Проверьте что `JWT_SECRET` совпадает
- Проверьте время жизни токена (`JWT_EXPIRES_IN`)
- Очистите localStorage и войдите заново

#### Migration Errors

```bash
# Drop and recreate database (development only!)
psql -c "DROP DATABASE IF EXISTS skorozvon;"
psql -c "CREATE DATABASE skorozvon;"

# Run migrations again
npm run db:migrate
```

### Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 📄 Лицензия

Proprietary. Все права защищены.

---

**SKOROZVON-GCK** © 2024
