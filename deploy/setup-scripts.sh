#!/bin/bash
set -euo pipefail

FRONTEND_DEPLOY_DIR="/www/wwwroot/game/deploy"
BACKEND_DEPLOY_DIR="/www/wwwroot/game-backend/deploy"

echo "========================================="
echo "Setup deploy scripts"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

if [ -d "$FRONTEND_DEPLOY_DIR" ]; then
    /bin/chmod +x "$FRONTEND_DEPLOY_DIR"/*.sh 2>/dev/null || true
fi

if [ -d "$BACKEND_DEPLOY_DIR" ]; then
    /bin/chmod +x "$BACKEND_DEPLOY_DIR"/*.sh 2>/dev/null || true
fi

mkdir -p /www/backups/game-backend /www/wwwlogs /www/server/nginx/proxy_cache_dir

echo
echo "Supported production deploy flow:"
echo "1. Read: $FRONTEND_DEPLOY_DIR/DEPLOY_SERVER_EXACT.md"
echo "2. Upload zip into the live code directory"
echo "3. Unzip in place"
echo "4. Run the matching post-upload script"
echo
echo "Frontend:"
echo "  cd /www/wwwroot/game"
echo "  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin"
echo "  /usr/bin/unzip -oq game-deploy.zip"
echo "  /bin/chmod +x deploy/*.sh"
echo "  /bin/bash deploy/post-upload-frontend.sh"
echo
echo "Backend:"
echo "  cd /www/wwwroot/game-backend"
echo "  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin"
echo "  /usr/bin/unzip -oq backend-deploy.zip"
echo "  /bin/chmod +x deploy/*.sh"
echo "  /bin/bash deploy/post-upload-backend.sh"
echo
echo "DONE: setup completed"
