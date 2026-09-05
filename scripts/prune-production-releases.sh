#!/usr/bin/env bash
# release 回收只允许续做可信终态的固定计划；不接受任意根目录或保护参数。
set -euo pipefail
if (( $# != 1 )); then
  echo '用法：$0 <txn_id>；从独立核验的原 MyWeb 制品续做终态清理' >&2
  exit 2
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
exec bash "$script_dir/production-release-transaction.sh" cleanup "$1"
