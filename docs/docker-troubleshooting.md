# Docker Troubleshooting (WSL2)

## Two Docker daemons

Two Docker daemons coexist on this machine:

- **Rootless Docker** — socket at `/run/user/1000/docker.sock`, used by `docker-compose` (via `DOCKER_HOST` env var). Containers run as `miro`.
- **Snap Docker** — socket at `/var/run/docker.sock`, root daemon. Old containers here can block port binding for rootless Docker.

## "Port already in use" errors

If `docker-compose up` fails with ports 8000, 3000, or 5433 "already in use", snap Docker has stale containers occupying those ports.

**Fix:**
```bash
# See what's running in snap Docker
DOCKER_HOST=unix:///var/run/docker.sock docker ps

# Stop all snap Docker containers
DOCKER_HOST=unix:///var/run/docker.sock docker stop $(DOCKER_HOST=unix:///var/run/docker.sock docker ps -q)

# Now start normally
docker-compose up -d
```

## Normal dev workflow

```bash
docker-compose up -d --build    # build + start all containers
docker-compose down             # stop + remove containers (keeps DB volume)
docker-compose up -d            # start without rebuilding

docker logs pocket-coach-app-api-1 --tail 50    # debug API
docker logs pocket-coach-app-web-1 --tail 50    # debug web
```

Migrations must be run manually after deploying new DB changes:
```bash
docker exec pocket-coach-app-api-1 alembic upgrade head
```
