#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  echo "用法: $0 <staging_root> <当前上传目录>" >&2
  exit 2
fi

staging_root="$1"
current_upload="$2"
maintenance_marker="${MYAGENT_MAINTENANCE_MARKER:-/run/myagent-release-maintenance}"
preserve_marker="${HI_VEBLEN_PRESERVE_MARKER:-/run/hi-veblen-release-preserve}"

assert_no_global_protection() {
  if test -e "$maintenance_marker" || test -L "$maintenance_marker" || \
    test -e "$preserve_marker" || test -L "$preserve_marker"; then
    echo "检测到全局发布保护标记，拒绝回收 staging。" >&2
    exit 1
  fi
}

staging_root="$(readlink -f -- "$staging_root")"
case "$staging_root" in
  /*/staging) ;;
  *) echo "拒绝清理异常 staging 根目录: $staging_root" >&2; exit 1 ;;
esac
test -d "$staging_root"
test -d "$current_upload"
test ! -L "$current_upload"
current_upload="$(readlink -f -- "$current_upload")"
test "$(dirname -- "$current_upload")" = "$staging_root"
current_name="$(basename -- "$current_upload")"
if [[ ! "$current_name" =~ ^run-[0-9]+-[0-9]+$ ]]; then
  echo "拒绝保护异常上传目录: $current_upload" >&2
  exit 1
fi

preserved="$(find "$staging_root" -mindepth 2 -maxdepth 2 \
  -name PRESERVE ! -path "$current_upload/PRESERVE" -print -quit)"
assert_no_global_protection
if test -n "$preserved"; then
  echo "检测到 staging 发布保护现场，拒绝回收: $preserved" >&2
  exit 1
fi

candidates="$(mktemp)"
trap 'rm -f -- "$candidates"' EXIT
find "$staging_root" -mindepth 1 -maxdepth 1 -type d \
  -name 'run-*' -print0 > "$candidates"

removed=0
while IFS= read -r -d '' candidate; do
  candidate_name="$(basename -- "$candidate")"
  if [[ ! "$candidate_name" =~ ^run-[0-9]+-[0-9]+$ ]] || \
    test "$candidate" = "$current_upload"; then
    continue
  fi
  if test -e "$candidate/PRESERVE" || test -L "$candidate/PRESERVE"; then
    echo "检测到 staging 发布保护现场，拒绝回收: $candidate/PRESERVE" >&2
    exit 1
  fi
  assert_no_global_protection
  rm -rf --one-file-system -- "$candidate"
  removed=$((removed + 1))
done < "$candidates"

printf 'staging retention: protected=%s removed=%s\n' \
  "$current_name" "$removed"
