# TASK-006: Auth API Endpoints

Status: DONE
Milestone: M2

## Goal
Implement `/auth/login`, `/auth/logout`, `/auth/me` in FastAPI. Sessions are DB-backed with a rolling HttpOnly cookie.

## Subtasks
- [x] Create `apps/api/app/auth.py` with router
- [x] `POST /auth/login`: validate email+password, create session, set HttpOnly cookie (`session=<token>`, persistent, SameSite=lax)
- [x] `POST /auth/logout`: delete session from DB, clear cookie
- [x] `GET /auth/me`: return `{id, email}` for the authenticated user
- [x] FastAPI dependency `get_current_user`: reads cookie, looks up session, checks expiry, rolls expiry
- [x] Register auth router in main.py
- [x] Return 401 (not 403) for unauthenticated requests

## Decisions
- Cookie name: `session`
- Cookie max-age: SESSION_TTL_DAYS * 86400 (default 30 days), reset on every authenticated request (rolling)
- Password check: passlib CryptContext with bcrypt
- No JWT — plain random token stored in sessions table
- `secure=False` on cookie for local HTTP dev

## Dependencies
- Requires TASK-005 models to exist (User, Session in app/models.py)

## Where we left off
Implementation complete. `apps/api/app/auth.py` created with all three endpoints and the `get_current_user` dependency. `apps/api/app/main.py` updated to register the auth router at `/auth`. Next step is the frontend auth UI (TASK-007 or equivalent).
