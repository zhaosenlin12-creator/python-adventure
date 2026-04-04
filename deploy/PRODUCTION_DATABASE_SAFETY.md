# Production Database Safety

This document exists to stop production SQLite rollbacks from happening again.

## Root Cause Summary

The original production backend used SQLite inside the deploy directory:

```bash
/www/wwwroot/game-backend/code_adventure.db
```

That layout is unsafe. Any unzip, overwrite, rebuild, or cleanup inside the backend
deploy directory can silently replace the live database.

The safe production layout is:

```bash
code: /www/wwwroot/game-backend
data: /www/data/game-backend/code_adventure.db
```

## Current Safety Rules

1. Production `DATABASE_URL` must point to an absolute path outside the backend deploy directory.
2. Backend packages must not contain any `.db`, `.sqlite`, `-wal`, `-shm`, `db_backups`, or `_archive_` files.
3. Every backend update must have a fresh compressed backup in `/www/backups/game-backend`.
4. Backend deploy should be blocked if the preflight safety checks fail.

## Mandatory Preflight Before Every Backend Release

Run these commands on the server before updating the backend:

```bash
cd /www/wwwroot/game-backend
bash deploy/backup-database.sh
bash deploy/database-safety-preflight.sh
```

If `database-safety-preflight.sh` fails, stop the release and fix the reported issue first.

## Recommended Scheduled Backup

Install a 6-hour backup job under the `game` user:

```bash
crontab -u game -l 2>/dev/null > /tmp/game-cron.txt || true
grep -q 'backup-database.sh' /tmp/game-cron.txt || echo '0 */6 * * * /bin/bash /www/wwwroot/game-backend/deploy/backup-database.sh >> /www/wwwlogs/game-db-backup.log 2>&1' >> /tmp/game-cron.txt
crontab -u game /tmp/game-cron.txt
rm -f /tmp/game-cron.txt
```

Verify:

```bash
crontab -u game -l
ls -lh /www/backups/game-backend
```

## Safe Backend Update Flow

```bash
cd /www/wwwroot/game-backend
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

bash deploy/backup-database.sh
bash deploy/database-safety-preflight.sh
bash deploy/update-backend.sh
```

## Emergency Database Comparison

If data loss is suspected, compare all candidates before restoring anything:

```bash
cd /www/wwwroot/game-backend
bash deploy/compare-database-candidates.sh | tee /tmp/game-db-compare.txt
```

Never restore by guesswork. Compare user counts, pet counts, and latest business timestamps first.

## Emergency Restore From a Verified Candidate

Only restore after you have positively identified the correct candidate:

```bash
cd /www/wwwroot/game-backend
bash deploy/restore-from-db-candidate.sh /absolute/path/to/candidate.db
```

## Release Operator Checklist

- `DATABASE_URL` points to `/www/data/game-backend/code_adventure.db`
- `bash deploy/backup-database.sh` succeeded
- `bash deploy/database-safety-preflight.sh` succeeded
- `backend-deploy.zip` contains no DB artifacts
- `curl http://127.0.0.1:8000/health` succeeds after restart
- `/www/backups/game-backend` contains a fresh compressed backup

## What Not To Do

- Do not keep the live SQLite file inside `/www/wwwroot/game-backend`
- Do not deploy backend code by blindly deleting the whole directory
- Do not unzip unknown historical backend packages into production
- Do not restore a DB file just because its timestamp looks recent
