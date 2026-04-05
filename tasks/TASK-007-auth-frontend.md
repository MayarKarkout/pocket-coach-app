# TASK-007: Auth Frontend — Login Page + Middleware

Status: DONE
Milestone: M2

## Goal
Add a `/login` page and Next.js middleware that redirects unauthenticated users to `/login`. All routes except `/login` are protected.

## Subtasks
- [x] Create `apps/web/app/login/page.tsx` — email + password form, POST to `/auth/login`, redirect to `/` on success
- [x] Create `apps/web/proxy.ts` — check for `session` cookie; redirect to `/login` if absent; redirect `/login` to `/` if already authenticated
- [x] Add `lib/api.ts` — thin fetch wrapper that always includes `credentials: "include"` (so cookies are sent)
- [x] Update home page (`app/page.tsx`) to show a logout button that calls `POST /auth/logout` then redirects to `/login`
- [x] Use shadcn `Button` for the form; plain `<input>` with Tailwind for inputs (Input component not installed)

## API Contract (assumed from TASK-005/006)
- `POST /auth/login` body: `{email, password}` → 200 sets HttpOnly `session` cookie; 401 on bad credentials
- `POST /auth/logout` → 200, clears cookie
- `GET /auth/me` → `{id, email}`
- Cookie name: `session`

## Decisions
- Middleware uses cookie presence as the auth signal (no server-side validation in middleware — that's the API's job)
- No auth context/provider needed for M2; page-level fetch to /auth/me if needed
- Keep the login page minimal — shadcn form, no extra libraries
