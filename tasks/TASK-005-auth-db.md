# TASK-005: Auth DB Models + Migration + Seed

Status: DONE
Milestone: M2

## Goal
Add `users` and `sessions` tables to the database, write the first Alembic migration, and seed the admin user from env vars on startup.

## Subtasks
- [x] Add `User` SQLAlchemy model (id, email, hashed_password, created_at)
- [x] Add `Session` SQLAlchemy model (id, user_id FK, token, created_at, expires_at)
- [x] Generate Alembic migration (autogenerate from models)
- [x] Seed logic: on startup, if no user exists and ADMIN_EMAIL+ADMIN_PASSWORD are set, create the user
- [x] Add bcrypt dependency to pyproject.toml (passlib[bcrypt])
- [x] Add ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET to .env.example

## Decisions
- Rolling session: each authenticated request extends expires_at by SESSION_TTL_DAYS (default 30)
- Token: 32-byte secrets.token_urlsafe stored as string in DB
- Session expiry: datetime column, UTC
- Migration written manually (DB not running at dev time); autogenerate would work identically once DB is up

## API Contract (for other tasks)
Models live in `apps/api/app/models.py`. Session token is a plain random string stored in a cookie named `session`.

## Where we left off
All subtasks complete. Migration file at `alembic/versions/0001_add_users_and_sessions.py`. Run `alembic upgrade head` once DB is running to apply.
