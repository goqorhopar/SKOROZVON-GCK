# SKOROZVON-GCK

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com)
[![Tests](https://img.shields.io/badge/tests-19%20passed-brightgreen.svg)]()
[![Coverage](https://img.shields.io/badge/coverage-67%25-yellowgreen.svg)]()

**Скорость звонков** — production-ready система автоматизации и аналитики звонков для отдела продаж.

## 📋 Содержание

- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Технологический стек](#-технологический-стек)
- [Быстрый старт](#-быстрый-старт)
- [API Документация](#-api-документация)
- [Структура проекта](#-структура-проекта)
- [Разработка](#-разработка)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Лицензия](#-лицензия)

## ✨ Возможности

### Authentication & Authorization
- 🔐 JWT аутентификация с access/refresh токенами
- 🔑 Хеширование паролей (bcrypt)
- 👥 Ролевая модель (Admin, Manager, Agent, Viewer)
- ⏰ Настраиваемое время жизни токенов

### Call Management
- 📞 Полный CRUD для записей о звонках
- 📝 Транскрибация разговоров
- 🎙️ Интеграция с телефонией (Twilio, Vonage)
- 📊 Статистика и фильтрация звонков
- 🔄 Назначение звонков менеджерам

### Analytics & Reporting
- 📈 Дашборды с ключевыми метриками
- 📅 Дневные/недельные/месячные отчёты
- 👤 Performance менеджеров
- 🎯 Конверсия и воронки продаж

### Security & Reliability
- 🛡️ Валидация входных данных (Pydantic v2)
- 🚫 Глобальная обработка ошибок
- 📝 Структурированное логирование (JSON logs)
- 🔒 CORS защита
- 💉 SQL injection protection

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│         (Web App / Mobile App / Third-party API)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer               │
│                    (Nginx / Traefik)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth API   │  │   Users API  │  │   Calls API  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Analytics API│  │  Telephony   │                         │
│  └──────────────┘  │   Service    │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ PostgreSQL  │ │   Redis     │ │ File Store  │
     │  (Primary)  │ │  (Cache)    │ │  (S3/Local) │
     └─────────────┘ └─────────────┘ └─────────────┘
```

## 🛠️ Технологический стек

| Категория | Технология | Версия |
|-----------|------------|--------|
| **Backend Framework** | FastAPI | 0.109.2 |
| **Language** | Python | 3.11+ |
| **Database ORM** | SQLAlchemy | 2.0.25 |
| **Database Driver** | asyncpg | 0.29.0 |
| **Migrations** | Alembic | 1.13.1 |
| **Validation** | Pydantic | 2.5.3 |
| **Auth** | python-jose, passlib | latest |
| **Logging** | structlog | 24.1.0 |
| **Testing** | pytest, pytest-asyncio | 7.4.4 |
| **HTTP Client** | httpx, aiohttp | 0.26.0 |
| **Task Queue** | Celery | 5.3.6 |
| **Cache** | Redis | 5.0.1 |
| **Monitoring** | Prometheus | 0.19.0 |

## 🚀 Быстрый старт

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ (или SQLite для разработки)
- Redis (опционально, для кэширования)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd SKOROZVON-GCK/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Minimum required:
# - SECRET_KEY (min 32 characters)
# - JWT_SECRET_KEY (min 32 characters)
# - DATABASE_URL

# Initialize database (development only)
# Tables will be created automatically in DEBUG mode

# Start server
uvicorn app.main:app --reload
```

### Verify Installation

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","app":"SKOROZVON-GCK","environment":"development"}
```

## 📚 API Документация

После запуска сервера доступны:

| Endpoint | Описание |
|----------|----------|
| http://localhost:8000/docs | Swagger UI (интерактивная документация) |
| http://localhost:8000/redoc | ReDoc (альтернативная документация) |
| http://localhost:8000/health | Health check endpoint |
| http://localhost:8000/openapi.json | OpenAPI schema |

### Основные endpoints

#### Authentication
```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

# Refresh token
POST /api/v1/auth/refresh
{
  "refresh_token": "<refresh_token>"
}

# Logout
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

#### Users
```bash
# Create user
POST /api/v1/users/
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "role": "agent"
}

# Get current user
GET /api/v1/users/me
Authorization: Bearer <access_token>

# List users
GET /api/v1/users/?skip=0&limit=100
Authorization: Bearer <access_token>
```

#### Calls
```bash
# Create call
POST /api/v1/calls/
{
  "from_number": "+1234567890",
  "to_number": "+0987654321",
  "direction": "outbound",
  "notes": "Follow-up call"
}

# List calls with filters
GET /api/v1/calls/?status=completed&direction=outbound&skip=0&limit=50
Authorization: Bearer <access_token>

# Get call statistics
GET /api/v1/calls/stats/summary
Authorization: Bearer <access_token>
```

#### Analytics
```bash
# Dashboard stats
GET /api/v1/analytics/dashboard?days=7
Authorization: Bearer <access_token>

# Daily metrics
GET /api/v1/analytics/calls/daily?days=30
Authorization: Bearer <access_token>

# Agent performance
GET /api/v1/analytics/agents/performance?days=30&limit=50
Authorization: Bearer <access_token>
```

## 📁 Структура проекта

```
backend/
├── app/
│   ├── __init__.py              # Package initialization
│   ├── main.py                  # FastAPI application factory
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py            # Main router aggregation
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── users.py             # User management endpoints
│   │   ├── calls.py             # Call management endpoints
│   │   └── analytics.py         # Analytics and reporting endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Settings management (pydantic-settings)
│   │   ├── database.py          # Database connection & session factory
│   │   ├── security.py          # JWT, password hashing, auth utilities
│   │   ├── logging_config.py    # Structured logging setup
│   │   └── exceptions.py        # Global exception handlers
│   └── models/
│       └── __init__.py          # SQLAlchemy ORM models
├── tests/
│   ├── conftest.py              # Pytest fixtures & configuration
│   ├── test_auth.py             # Authentication tests
│   ├── test_users.py            # User management tests
│   └── test_calls.py            # Call management tests
├── uploads/                     # File upload directory
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── requirements.txt             # Python dependencies
├── pytest.ini                   # Pytest configuration
└── README.md                    # This file
```

## 🔧 Разработка

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage report
pytest --cov=app --cov-report=html

# View coverage in browser
open htmlcov/index.html  # Mac/Linux
start htmlcov/index.html # Windows
```

### Code Style

```bash
# Install dev dependencies
pip install black isort flake8 mypy

# Format code
black app/ tests/
isort app/ tests/

# Type checking
mypy app/

# Linting
flake8 app/ tests/
```

### Database Migrations (Production)

```bash
# Initialize Alembic (one time)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🚀 Deployment

### Production Server

```bash
# Using uvicorn with multiple workers
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop \
  --http httptools

# Using gunicorn with uvicorn workers
gunicorn app.main:app \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker
```

### Environment Variables (Production)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `APP_NAME` | Application name | No | SKOROZVON-GCK |
| `APP_ENV` | Environment (production/development) | No | development |
| `DEBUG` | Debug mode | No | false |
| `SECRET_KEY` | App secret key | **Yes** | - |
| `JWT_SECRET_KEY` | JWT signing key | **Yes** | - |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | - |
| `REDIS_URL` | Redis connection string | No | redis://localhost:6379/0 |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | No | http://localhost:3000 |
| `LOG_LEVEL` | Logging level | No | INFO |
| `LOG_FORMAT` | Log format (json/console) | No | json |

See `.env.example` for full list.

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build image
docker build -t skorozvon-gck .

# Run container
docker run -p 8000:8000 --env-file .env skorozvon-gck
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://localhost:8000/docs;
    }
}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Could not connect to database
```
**Solution:** Check `DATABASE_URL` in `.env`. Ensure PostgreSQL is running.

#### 2. JWT Token Decode Failed
```
Warning: token_decode_failed error=Subject must be a string
```
**Solution:** Fixed in latest version. User ID is now converted to string in JWT.

#### 3. CORS Error
```
Access-Control-Allow-Origin header missing
```
**Solution:** Add your frontend URL to `CORS_ORIGINS` in `.env`.

#### 4. Module Not Found
```
ModuleNotFoundError: No module named 'app'
```
**Solution:** Run from backend directory or add to PYTHONPATH:
```bash
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
```

### Logs

Logs are written to stdout in JSON format (production) or console format (development).

```bash
# View logs in real-time
uvicorn app.main:app --reload 2>&1 | grep -E "(ERROR|WARNING)"

# Search for specific errors
grep "token_decode_failed" logs/*.log
```

## 📊 Testing Coverage

Current test coverage: **67%**

| Module | Coverage | Status |
|--------|----------|--------|
| `app/api/schemas.py` | 97% | ✅ Excellent |
| `app/core/security.py` | 81% | ✅ Good |
| `app/core/exceptions.py` | 76% | ✅ Good |
| `app/main.py` | 68% | ⚠️ Needs improvement |
| `app/api/calls.py` | 40% | ⚠️ Needs tests |
| `app/api/users.py` | 38% | ⚠️ Needs tests |
| `app/api/analytics.py` | 29% | ❌ Critical |

## 🔐 Security Checklist

- [x] Password hashing with bcrypt
- [x] JWT tokens with expiration
- [x] Input validation with Pydantic
- [x] SQL injection protection (SQLAlchemy)
- [x] CORS configuration
- [x] Rate limiting ready
- [ ] Token blacklisting (Redis)
- [ ] 2FA support
- [ ] Audit logging
- [ ] Security headers

## 📝 License

Proprietary — All rights reserved.

---

**Made with ❤️ by SKOROZVON-GCK Team**
