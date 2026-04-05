# PocketCoach

A personal sports and health tracking app with an AI coach.

## What it does

Log everything relevant to your athletic life — gym workouts, football sessions, walks, wellbeing, food — and ask a coach for personalised advice based on your actual data.

**Core loop:** log → insights → ask the coach.

## Running locally

```bash
docker-compose up -d
docker exec pocket-coach-app-api-1 alembic upgrade head
```

App at `http://localhost:3000` · API at `http://localhost:8000`

See `docs/docker-troubleshooting.md` if ports are already in use.
