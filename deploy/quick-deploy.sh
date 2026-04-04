#!/bin/bash
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin"

echo "INFO: quick-deploy.sh now runs the standardized backend and frontend post-upload scripts."
echo "INFO: Exact commands are documented in /www/wwwroot/game/deploy/DEPLOY_SERVER_EXACT.md"

/bin/bash /www/wwwroot/game-backend/deploy/post-upload-backend.sh
/bin/bash /www/wwwroot/game/deploy/post-upload-frontend.sh

echo "DONE: quick deploy completed"
