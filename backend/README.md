# SKOROZVON-GCK Backend

Production-ready FastAPI backend for call automation and analytics system.

## Features

- 🔐 **JWT Authentication** - Secure token-based auth with refresh tokens
- 📞 **Call Management** - Full CRUD for call records
- 📊 **Analytics** - Dashboard stats, agent performance, daily metrics
- 🗄️ **Async Database** - PostgreSQL with SQLAlchemy async
- 🧪 **Testing** - Comprehensive pytest test suite
- 📝 **Structured Logging** - JSON logs with structlog
- ✅ **Validation** - Pydantic v2 for request/response validation
- 🛡️ **Error Handling** - Global exception handlers
- 🔒 **Security** - Password hashing, CORS, input validation

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (optional, for caching)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - SECRET_KEY
# - JWT_SECRET_KEY  
# - DATABASE_URL

# Run migrations (if using Alembic)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Development Server

```bash
# With auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py        # Main router
│   │   ├── schemas.py       # Pydantic models
│   │   ├── auth.py          # Auth endpoints
│   │   ├── users.py         # User endpoints
│   │   ├── calls.py         # Call endpoints
│   │   └── analytics.py     # Analytics endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Settings management
│   │   ├── database.py      # DB connection
│   │   ├── security.py      # Auth utilities
│   │   ├── logging_config.py # Logging setup
│   │   └── exceptions.py    # Error handlers
│   └── models/
│       └── __init__.py      # SQLAlchemy models
├── tests/
│   ├── conftest.py          # Test fixtures
│   ├── test_auth.py
│   ├── test_users.py
│   └── test_calls.py
├── requirements.txt
├── .env.example
└── pytest.ini
```

## Running Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_auth.py -v

# Run with output
pytest -s -v
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| APP_NAME | Application name | SKOROZVON-GCK |
| APP_ENV | Environment (development/production) | development |
| DEBUG | Debug mode | False |
| SECRET_KEY | App secret key | Required |
| JWT_SECRET_KEY | JWT signing key | Required |
| DATABASE_URL | PostgreSQL connection string | Required |
| REDIS_URL | Redis connection string | redis://localhost:6379/0 |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:3000 |

See `.env.example` for full list.

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Users
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/me` - Get current user
- `PUT /api/v1/users/me` - Update current user
- `GET /api/v1/users/` - List users (auth required)
- `GET /api/v1/users/{id}` - Get user by ID
- `PATCH /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Calls
- `POST /api/v1/calls/` - Create call
- `GET /api/v1/calls/` - List calls (paginated)
- `GET /api/v1/calls/{id}` - Get call
- `PATCH /api/v1/calls/{id}` - Update call
- `DELETE /api/v1/calls/{id}` - Delete call
- `GET /api/v1/calls/stats/summary` - Call statistics

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard stats
- `GET /api/v1/analytics/calls/daily` - Daily metrics
- `GET /api/v1/analytics/agents/performance` - Agent performance
- `GET /api/v1/analytics/metrics` - Custom metrics

## Database Models

- **User** - Authentication & authorization
- **Call** - Call records with transcription support
- **CallAssignment** - Agent-call assignments
- **Analytics** - Aggregated metrics

## Security

- Passwords hashed with bcrypt
- JWT tokens with configurable expiration
- CORS protection
- Input validation with Pydantic
- SQL injection protection via SQLAlchemy

## License

Proprietary
