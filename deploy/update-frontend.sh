#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "INFO: git-pull frontend deploy is deprecated on this server."
echo "INFO: Use uploaded game-deploy.zip plus the standardized post-upload script."
echo "INFO: Exact commands are documented in $SCRIPT_DIR/DEPLOY_SERVER_EXACT.md"

exec /bin/bash "$SCRIPT_DIR/post-upload-frontend.sh" "$@"
