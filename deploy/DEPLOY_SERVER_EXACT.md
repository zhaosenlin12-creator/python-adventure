# Exact Server Deploy Commands

This file defines the only supported production deployment flow for the current
server. Normal releases do not use `git pull` on the server.

Standard process:

1. Build the zip locally from this repo.
2. Upload the zip in BT to the live code directory.
3. Unzip in place.
4. Run one `deploy/post-upload-*.sh` script.

Important:

- Do not overwrite `PATH` with only the Node directory.
- Use the full safe `PATH` shown below.
- If `unzip` prints `appears to use backslashes as path separators`, that warning is harmless for the zip files built on Windows as long as extraction succeeds.

## Server Facts

- Frontend code dir: `/www/wwwroot/game`
- Backend code dir: `/www/wwwroot/game-backend`
- Frontend nginx vhost: `/www/server/panel/vhost/nginx/game.codebn.cn.conf`
- PM2 owner: `game`
- Frontend PM2 app: `game`
- Backend PM2 app: `game-backend`
- Frontend port: `3003`
- Backend health URL: `http://127.0.0.1:8000/health`
- Node bin path: `/www/server/nodejs/v20.19.6/bin`
- Python 3.10 path: `/www/server/python_manager/versions/3.10.0/bin/python3.10`
- Production DB path: `/www/data/game-backend/code_adventure.db`

## Backend Package

Local build command:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-backend.ps1
```

Server commands from a `root` shell:

```bash
cd /www/wwwroot/game-backend
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/usr/bin/unzip -oq backend-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/bash deploy/post-upload-backend.sh
```

Expected behavior:

- the script keeps PM2 under user `game`
- the script verifies the production SQLite path before restart
- the script backs up the DB before the backend restarts

Verify the runtime DB path after deploy:

```bash
cd /www/wwwroot/game-backend
./venv/bin/python - <<'PY'
from app.core.config import settings
print(settings.DATABASE_URL)
PY
```

Expected output:

```text
sqlite:////www/data/game-backend/code_adventure.db
```

## Frontend Package

Local build command:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build.ps1
```

Server commands from a `root` shell:

```bash
cd /www/wwwroot/game
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/usr/bin/unzip -oq game-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/bash deploy/post-upload-frontend.sh
```

One-time cleanup of legacy frontend deploy files already left on the server:

```bash
cd /www/wwwroot/game
/bin/rm -f deploy.sh deploy-secure-frontend.sh ecosystem.config.js
```

Expected behavior:

- the package already contains the built `.next` output
- the script installs runtime dependencies on the server
- the script installs `deploy/nginx.conf` to the BT nginx vhost path and runs `nginx -t`
- the script restarts PM2 as user `game`
- the script clears nginx proxy cache and reloads nginx when run as `root`

Important:

- run `deploy/post-upload-frontend.sh` from a `root` shell so nginx config install, syntax test, cache cleanup, and reload all happen
- if the nginx syntax test fails, the script restores the previous vhost config backup and exits non-zero

## Health Checks

Backend:

```bash
curl -fsS http://127.0.0.1:8000/health
```

Frontend:

```bash
curl -fsS http://127.0.0.1:3003
```

Public header spot-checks after frontend deploy:

```bash
curl -I https://game.codebn.cn/_next/static/
curl -I https://game.codebn.cn/typing/data/catalog.json
curl -I 'https://game.codebn.cn/api/typing/rankings?limit=10'
```

## Automatic DB Backups

```bash
crontab -u game -l 2>/dev/null > /tmp/game-cron.txt || true
grep -q 'backup-database.sh' /tmp/game-cron.txt || echo '0 */6 * * * /bin/bash /www/wwwroot/game-backend/deploy/backup-database.sh >> /www/wwwlogs/game-db-backup.log 2>&1' >> /tmp/game-cron.txt
crontab -u game /tmp/game-cron.txt
rm -f /tmp/game-cron.txt
crontab -u game -l
```

## If `deploy/*.sh` Are Missing On Server

That means the server is using an older package that did not include the runtime
deploy helpers.

Fix:

1. Rebuild the zip from the latest local repo.
2. Upload the new zip.
3. Unzip it directly into the live code directory.
4. Verify the required `deploy/post-upload-*.sh` file exists.
5. Run that script.

## Non-Negotiable Rules

- Never store the live SQLite file inside `/www/wwwroot/game-backend`
- Never use `root` to manage PM2 directly for this app
- Never run normal releases with random `git pull` commands on the server
- Never upload an old zip without checking which deploy helpers it contains
- Always deploy backend to `/www/wwwroot/game-backend`
- Always deploy frontend to `/www/wwwroot/game`
