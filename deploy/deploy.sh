#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "INFO: deploy.sh is deprecated."
echo "INFO: Use the standardized upload-and-run flow in $SCRIPT_DIR/DEPLOY_SERVER_EXACT.md"
echo "INFO: Running post-upload frontend deploy for compatibility."

exec /bin/bash "$SCRIPT_DIR/post-upload-frontend.sh" "$@"
