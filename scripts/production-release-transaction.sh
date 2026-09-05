#!/usr/bin/env bash
# deploy/recover 共享入口；只从独立核验制品运行，不 source 待恢复记录。
set -euo pipefail
case "${1:-}" in
  deploy|recover|cleanup|history|policy) ;;
  *) echo '用法：production-release-transaction.sh <deploy|recover|cleanup|history|policy> ...' >&2; exit 2 ;;
esac
control_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
exec /usr/bin/python3 -I -B "$control_dir/release_transaction.py" "$@"
