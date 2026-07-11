#!/usr/bin/env bash
set -euo pipefail

if (( $# < 3 )); then
  echo "用法: $0 <release_root> <保留数量> <受保护 release>..." >&2
  exit 2
fi

release_root="$1"
keep_count="$2"
shift 2

if [[ ! "$keep_count" =~ ^[1-9][0-9]*$ ]]; then
  echo "保留数量必须是正整数: $keep_count" >&2
  exit 2
fi

release_root="$(readlink -f -- "$release_root")"
case "$release_root" in
  /*/releases) ;;
  *) echo "拒绝清理异常 release 根目录: $release_root" >&2; exit 1 ;;
esac
test -d "$release_root"

protected=()
for path in "$@"; do
  resolved="$(readlink -f -- "$path" 2>/dev/null || true)"
  if test -n "$resolved" && test "$(dirname -- "$resolved")" = "$release_root"; then
    protected+=("$resolved")
  fi
done

mapfile -d '' -t releases < <(
  find "$release_root" -mindepth 1 -maxdepth 1 -type d \
    -name 'release-*' -printf '%T@ %p\0' | sort -z -nr
)

position=0
removed=0
for entry in "${releases[@]}"; do
  candidate="${entry#* }"
  candidate="$(readlink -f -- "$candidate")"
  base="$(basename -- "$candidate")"
  case "$base" in
    release-|release-*[!A-Za-z0-9._-]*)
      echo "跳过异常 release 名称: $base" >&2
      continue
      ;;
    release-*) ;;
    *) continue ;;
  esac
  test "$(dirname -- "$candidate")" = "$release_root"

  position=$((position + 1))
  keep=0
  if (( position <= keep_count )); then
    keep=1
  else
    for path in "${protected[@]}"; do
      if test "$candidate" = "$path"; then
        keep=1
        break
      fi
    done
  fi

  if (( keep == 0 )); then
    rm -rf --one-file-system -- "$candidate"
    removed=$((removed + 1))
  fi
done

printf 'release retention: kept_newest=%s protected=%s removed=%s\n' \
  "$keep_count" "${#protected[@]}" "$removed"
