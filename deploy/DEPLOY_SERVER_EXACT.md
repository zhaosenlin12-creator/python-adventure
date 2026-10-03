# Server Deploy

Build the two zips on the dev machine, upload them to the live code dirs, and
let the bundled post-upload scripts do the rest. No `git pull` on the server.

## Server facts

- Frontend code dir: `/www/wwwroot/game`, PM2 app `game`
- Backend code dir: `/www/wwwroot/game-backend`, PM2 app `game-backend`
- Production DB path: `/www/data/game-backend/code_adventure.db`
- Node bin path: `/www/server/nodejs/v20.19.6/bin`
- Python 3.10 path: `/www/server/python_manager/versions/3.10.0/bin/python3.10`
- Backend health: `http://127.0.0.1:8000/health`
- Frontend port: `3003`

## Local build

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-backend.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-deploy-packages.ps1
```

Both packs must end with `PASS: deployment package shell scripts are LF-only and database-safe`.
The exact zip hashes are written to `release/SHA256SUMS.txt`.

## Backend (extract as root, deploy as game)

Upload `deploy/backend-deploy.zip` to `/www/wwwroot/game-backend/`, then as root:

```bash
cd /www/wwwroot/game-backend
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/usr/bin/unzip -oq backend-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/mkdir -p /www/data/game-backend /www/backups/game-backend /www/wwwlogs
/bin/chown -R game:game /www/wwwroot/game-backend /www/data/game-backend /www/backups/game-backend
su - game
```

Then as `game`:

```bash
cd /www/wwwroot/game-backend
export PATH=/www/server/nodejs/v20.19.6/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

/bin/bash deploy/post-upload-backend.sh
```

Verify the live database path (must not change):

```bash
curl -fsS http://127.0.0.1:8000/health

./venv/bin/python - <<'PY'
from app.core.config import settings
print(settings.DATABASE_URL)
PY
```

Expected:

```text
{"status":"healthy"}
sqlite:////www/data/game-backend/code_adventure.db
```

## Frontend (run the deployment script as `root`, app runs as `game`)

Upload `deploy/game-deploy.zip` to `/www/wwwroot/game/`, then execute the
replacement steps as `root`. Removing the old `.next` directory must happen
before extraction; otherwise an old Next.js chunk can remain active even when
`build-info.json` shows the new release marker.

```bash
cd /www/wwwroot/game
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/bin/rm -rf .next
/usr/bin/unzip -oq game-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/bash deploy/post-upload-frontend.sh
```

The script repairs ownership and `.next` read/execute permissions as root,
starts the Next.js process through `game`, and verifies both the release marker
and collision runtime signature through the active `/world` chunk graph. The
expected marker for the current package is `v20261003-collision-deploy-r2`.
Do not run `npm install` manually: the bundled script uses `npm ci --omit=dev`
and never rewrites `package-lock.json`.

If the archive was already extracted and the permission error is shown, run the
same script as `root`; do not run it directly as `game`:

```bash
cd /www/wwwroot/game
/bin/chown -R game:game /www/wwwroot/game
/bin/chmod -R u+rwX,go+rX /www/wwwroot/game/.next
/bin/bash deploy/post-upload-frontend.sh
```

If the script reports the expected local marker but the public site still shows
the old build, the remaining problem is outside the app process: the Nginx
proxy cache is serving an old HTML response. Ask the server administrator to
purge `/www/server/nginx/proxy_cache_dir/` and reload Nginx, then verify:

```bash
curl -fsS "https://game.codebn.cn/build-info.json?release=v20261003-collision-deploy-r2"
```

Verify:

```bash
curl -fsS http://127.0.0.1:3003
```

## 6-hour DB backup cron

```bash
crontab -u game -l 2>/dev/null > /tmp/game-cron.txt || true
grep -q 'backup-database.sh' /tmp/game-cron.txt || echo '0 */6 * * * /bin/bash /www/wwwroot/game-backend/deploy/backup-database.sh >> /www/wwwlogs/game-db-backup.log 2>&1' >> /tmp/game-cron.txt
crontab -u game /tmp/game-cron.txt
rm -f /tmp/game-cron.txt
crontab -u game -l
```

## Hard rules

- Never store the live SQLite file inside `/www/wwwroot/game-backend`.
- Never run PM2 as `root` for this app.
- Never use `git pull` on the server for a normal release.
- Always confirm the package SHA256 in `release/SHA256SUMS.txt` before upload.
- Always deploy backend to `/www/wwwroot/game-backend`, frontend to `/www/wwwroot/game`.
