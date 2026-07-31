#!/usr/bin/env python3
"""安全轮换 D050 合成用户凭证，不输出凭证明文。"""

from __future__ import annotations

import hashlib
import http.cookies
import io
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
import tempfile
import time
from urllib import error, request


TARGET_PERSIST_ID = "p6_load_a"
SESSION_COOKIE_NAME = "__Host-lingxi_session"
RECEIPT_NAME = "d050-token-rotation-receipt.json"
RECEIPT_SCHEMA = "d050-token-rotation-v1"
MAX_BACKUPS = 7
HASH_RE = re.compile(r"sha256:[0-9a-f]{64}")
BACKUP_NAME_RE = re.compile(r"d050-env-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}\.bak")
TOKEN_LINE_RE = re.compile(
    r"(?m)^([ \t]*(?:export[ \t]+)?BRAIN_GATEWAY_USER_TOKENS[ \t]*=[ \t]*)"
    r"([^\r\n]*)(\r?)$"
)


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _systemd_dotenv_value(value: str) -> str:
    _require("'" not in value and "\n" not in value and "\r" not in value, "凭证映射无法安全写入环境文件")
    return f"'{value}'"


def _replace_token_line(text: str, value: str) -> str:
    matches = list(TOKEN_LINE_RE.finditer(text))
    _require(len(matches) == 1, "BRAIN_GATEWAY_USER_TOKENS 必须恰好出现一次")
    match = matches[0]
    return (
        text[: match.start()]
        + match.group(1)
        + _systemd_dotenv_value(value)
        + match.group(3)
        + text[match.end() :]
    )


def _redact_token_line(text: str) -> str:
    matches = list(TOKEN_LINE_RE.finditer(text))
    _require(len(matches) == 1, "BRAIN_GATEWAY_USER_TOKENS 必须恰好出现一次")
    match = matches[0]
    return text[: match.start(2)] + "<redacted>" + text[match.end(2) :]


def _atomic_write(path: Path, payload: bytes, source_stat: os.stat_result) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    temporary = path.with_name(f".{path.name}.d050-{secrets.token_hex(8)}")
    try:
        descriptor = os.open(temporary, flags, 0o600)
        try:
            with os.fdopen(descriptor, "wb", closefd=False) as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
        finally:
            os.close(descriptor)
        if hasattr(os, "chown"):
            os.chown(temporary, source_stat.st_uid, source_stat.st_gid)
        os.chmod(temporary, stat.S_IMODE(source_stat.st_mode))
        os.replace(temporary, path)
        if os.name != "nt":
            directory_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    finally:
        temporary.unlink(missing_ok=True)


def _validate_secure_chain(path: Path, expected_uid: int) -> None:
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        metadata = current.lstat()
        _require(stat.S_ISDIR(metadata.st_mode), "配置备份父链不是目录")
        _require(not current.is_symlink(), "配置备份父链包含符号链接")
        _require(metadata.st_uid == expected_uid, "配置备份父链所有者错误")
        _require(metadata.st_mode & 0o022 == 0, "配置备份父链可被非所有者写入")


def _validate_env_metadata(
    metadata: os.stat_result, *, expected_group_gid: int | None = None
) -> None:
    _require(metadata.st_uid == 0, "生产 .env 所有者错误")
    mode = stat.S_IMODE(metadata.st_mode)
    _require(mode in {0o600, 0o640}, "生产 .env 权限必须为 0600 或 0640")
    if mode == 0o640:
        if expected_group_gid is None:
            import grp

            expected_group_gid = grp.getgrnam("myagent").gr_gid
        _require(metadata.st_gid == expected_group_gid, "生产 .env group-read 未绑定 myagent")


def _open_backup_root(backup_root: Path, *, strict: bool) -> int:
    if strict:
        _require(os.name != "nt" and os.geteuid() == 0, "轮换脚本必须由 root 执行")
        _require(backup_root.is_absolute(), "配置备份目录必须是绝对路径")
        _validate_secure_chain(backup_root.parent, 0)
    if not backup_root.exists():
        backup_root.mkdir(mode=0o700)
    _require(backup_root.is_dir() and not backup_root.is_symlink(), "配置备份目录无效")
    metadata = backup_root.stat()
    expected_uid = 0 if strict else getattr(os, "geteuid", lambda: metadata.st_uid)()
    if os.name != "nt":
        _require(metadata.st_uid == expected_uid, "配置备份目录所有者错误")
        _require(metadata.st_mode & 0o077 == 0, "配置备份目录权限过宽")
    if strict:
        _validate_secure_chain(backup_root, 0)
    if os.name == "nt":
        return os.open(backup_root / ".d050-directory-handle", os.O_RDWR | os.O_CREAT, 0o600)
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(backup_root, flags)
    opened = os.fstat(descriptor)
    _require(stat.S_ISDIR(opened.st_mode), "配置备份目录复核失败")
    if os.name != "nt":
        _require(opened.st_uid == expected_uid, "配置备份目录所有者复核失败")
    return descriptor


def _write_dir_file(
    backup_root: Path,
    directory_fd: int,
    filename: str,
    payload: bytes,
    *,
    replace: bool,
) -> None:
    temporary = f".{filename}.d050-{secrets.token_hex(8)}"
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    try:
        if os.name == "nt":
            descriptor = os.open(backup_root / temporary, flags, 0o600)
        else:
            descriptor = os.open(temporary, flags, 0o600, dir_fd=directory_fd)
        try:
            if os.name != "nt":
                os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb", closefd=False) as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
        finally:
            os.close(descriptor)
        if os.name == "nt":
            source = backup_root / temporary
            target = backup_root / filename
            if not replace and target.exists():
                raise FileExistsError(filename)
            os.replace(source, target)
        elif replace:
            os.replace(
                temporary,
                filename,
                src_dir_fd=directory_fd,
                dst_dir_fd=directory_fd,
            )
        else:
            os.link(
                temporary,
                filename,
                src_dir_fd=directory_fd,
                dst_dir_fd=directory_fd,
                follow_symlinks=False,
            )
            os.unlink(temporary, dir_fd=directory_fd)
        if os.name != "nt":
            os.fsync(directory_fd)
    finally:
        try:
            if os.name == "nt":
                (backup_root / temporary).unlink(missing_ok=True)
            else:
                os.unlink(temporary, dir_fd=directory_fd)
        except FileNotFoundError:
            pass


def _read_dir_file(backup_root: Path, directory_fd: int, filename: str) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    if os.name == "nt":
        descriptor = os.open(backup_root / filename, flags)
    else:
        descriptor = os.open(filename, flags, dir_fd=directory_fd)
    try:
        metadata = os.fstat(descriptor)
        _require(stat.S_ISREG(metadata.st_mode), "轮换持久文件类型无效")
        if os.name != "nt":
            _require(metadata.st_uid == os.fstat(directory_fd).st_uid, "轮换持久文件所有者错误")
            _require(metadata.st_mode & 0o077 == 0, "轮换持久文件权限过宽")
        with os.fdopen(descriptor, "rb", closefd=False) as handle:
            return handle.read()
    finally:
        os.close(descriptor)


def _create_config_backup(backup_root: Path, directory_fd: int, payload: bytes) -> str:
    filename = (
        "d050-env-"
        + time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        + f"-{secrets.token_hex(4)}.bak"
    )
    _write_dir_file(backup_root, directory_fd, filename, payload, replace=False)
    _require(_read_dir_file(backup_root, directory_fd, filename) == payload, "配置备份复读不一致")
    return filename


def _store_receipt(backup_root: Path, directory_fd: int, receipt: dict[str, object]) -> None:
    payload = json.dumps(receipt, ensure_ascii=True, sort_keys=True, separators=(",", ":")).encode("utf-8")
    _write_dir_file(backup_root, directory_fd, RECEIPT_NAME, payload, replace=True)
    _require(_read_dir_file(backup_root, directory_fd, RECEIPT_NAME) == payload, "轮换收据复读不一致")


def _load_receipt(backup_root: Path, directory_fd: int) -> dict[str, object] | None:
    try:
        payload = _read_dir_file(backup_root, directory_fd, RECEIPT_NAME)
    except FileNotFoundError:
        return None
    receipt = json.loads(payload.decode("utf-8"))
    required = {
        "schema_version",
        "persist_id",
        "expected_revision",
        "old_token_hash",
        "new_token_hash",
        "new_env_sha256",
        "backup_file",
        "backup_sha256",
        "state",
        "updated_at",
    }
    _require(isinstance(receipt, dict) and set(receipt) == required, "轮换收据字段无效")
    _require(receipt["schema_version"] == RECEIPT_SCHEMA, "轮换收据版本无效")
    _require(receipt["persist_id"] == TARGET_PERSIST_ID, "轮换收据用户无效")
    _require(re.fullmatch(r"[0-9a-f]{40}", str(receipt["expected_revision"])) is not None, "轮换收据 revision 无效")
    _require(HASH_RE.fullmatch(str(receipt["old_token_hash"])) is not None, "轮换收据旧哈希无效")
    _require(HASH_RE.fullmatch(str(receipt["new_token_hash"])) is not None, "轮换收据新哈希无效")
    _require(re.fullmatch(r"[0-9a-f]{64}", str(receipt["new_env_sha256"])) is not None, "轮换收据新配置摘要无效")
    _require(BACKUP_NAME_RE.fullmatch(str(receipt["backup_file"])) is not None, "轮换收据备份名无效")
    _require(re.fullmatch(r"[0-9a-f]{64}", str(receipt["backup_sha256"])) is not None, "轮换收据备份摘要无效")
    _require(
        receipt["state"] in {"prepared", "applied", "verified", "rollback_pending"},
        "轮换收据状态无效",
    )
    _require(isinstance(receipt["updated_at"], int) and receipt["updated_at"] > 0, "轮换收据时间无效")
    return receipt


def _update_receipt_state(
    backup_root: Path,
    directory_fd: int,
    receipt: dict[str, object],
    state_value: str,
) -> None:
    receipt["state"] = state_value
    receipt["updated_at"] = int(time.time())
    _store_receipt(backup_root, directory_fd, receipt)


def _retain_backups(backup_root: Path, directory_fd: int, keep: str) -> int:
    names = os.listdir(backup_root if os.name == "nt" else directory_fd)
    backups = sorted(name for name in names if BACKUP_NAME_RE.fullmatch(name))
    retained = set(backups[-MAX_BACKUPS:]) | {keep}
    if len(retained) > MAX_BACKUPS:
        retained.remove(min(name for name in retained if name != keep))
    for name in backups:
        if name in retained:
            continue
        if os.name == "nt":
            (backup_root / name).unlink()
        else:
            os.unlink(name, dir_fd=directory_fd)
    if os.name != "nt":
        os.fsync(directory_fd)
    return len(retained)


def _mapping_from_bytes(payload: bytes, dotenv_values: object, parse_user_token_map: object) -> dict[str, str]:
    values = dotenv_values(stream=io.StringIO(payload.decode("utf-8")))
    return parse_user_token_map(str(values.get("BRAIN_GATEWAY_USER_TOKENS") or ""))


def _restart_gateway() -> None:
    subprocess.run(
        ["systemctl", "restart", "myagent-gateway.service"],
        check=True,
        capture_output=True,
        timeout=120,
    )


def _stop_gateway() -> None:
    subprocess.run(
        ["systemctl", "stop", "myagent-gateway.service"],
        check=True,
        capture_output=True,
        timeout=120,
    )


def _gateway_active() -> bool:
    return (
        subprocess.run(
            ["systemctl", "is-active", "--quiet", "myagent-gateway.service"],
            check=False,
            capture_output=True,
            timeout=15,
        ).returncode
        == 0
    )


def _unit_main_pid(unit: str) -> int:
    result = subprocess.run(
        ["systemctl", "show", unit, "-p", "MainPID", "--value"],
        check=True,
        capture_output=True,
        text=True,
        timeout=15,
    )
    return int(result.stdout.strip() or "0")


def _json_request(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 15,
) -> tuple[dict, object]:
    response = request.urlopen(
        request.Request(url, method=method, headers=headers or {}, data=body),
        timeout=timeout,
    )
    with response:
        return json.loads(response.read().decode("utf-8")), response.headers


def _wait_health(base_url: str, expected_revision: str) -> bool:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            payload, _ = _json_request(f"{base_url}/api/health", timeout=10)
            if (
                payload.get("backend_revision") == expected_revision
                and payload.get("ok") is True
            ):
                return True
        except (error.URLError, json.JSONDecodeError, TimeoutError):
            pass
        time.sleep(1)
    return False


def _session_cookie_pair(headers: object) -> str:
    cookie = http.cookies.SimpleCookie()
    cookie.load(str(headers.get("Set-Cookie") or ""))
    session = cookie.get(SESSION_COOKIE_NAME)
    _require(session is not None and bool(session.value), "新凭证登录未返回目标短会话 Cookie")
    _require(session["path"] == "/", "短会话 Cookie Path 错误")
    _require(not session["domain"], "短会话 Cookie 不得包含 Domain")
    _require(bool(session["secure"]), "短会话 Cookie 缺少 Secure")
    _require(bool(session["httponly"]), "短会话 Cookie 缺少 HttpOnly")
    _require(str(session["samesite"]).lower() == "strict", "短会话 Cookie SameSite 错误")
    return f"{SESSION_COOKIE_NAME}={session.value}"


def _verify_login(base_url: str, token: str) -> None:
    payload, headers = _json_request(
        f"{base_url}/api/session",
        method="POST",
        headers={
            "Content-Type": "application/json",
        },
        body=json.dumps({"token": token}, separators=(",", ":")).encode("utf-8"),
    )
    session_pair = ""
    try:
        session_pair = _session_cookie_pair(headers)
        _require(payload.get("scope") == "user", "新凭证权限范围错误")
        _require(payload.get("persist_id") == TARGET_PERSIST_ID, "新凭证身份绑定错误")
    finally:
        if session_pair:
            deleted, _ = _json_request(
                f"{base_url}/api/session",
                method="DELETE",
                headers={
                    "Cookie": session_pair,
                    "X-Lingxi-Expected-Persist-Id": TARGET_PERSIST_ID,
                },
            )
            _require(deleted.get("ok") is True, "轮换验证短会话未清理")


def _verify_login_rejected(base_url: str, token: str) -> None:
    try:
        _, headers = _json_request(
            f"{base_url}/api/session",
            method="POST",
            headers={
                "Content-Type": "application/json",
            },
            body=json.dumps({"token": token}, separators=(",", ":")).encode(
                "utf-8"
            ),
        )
    except error.HTTPError as exc:
        try:
            _require(exc.code == 401, "旧凭证拒绝状态不是 401")
        finally:
            exc.close()
        return
    session_pair = ""
    try:
        session_pair = _session_cookie_pair(headers)
    except RuntimeError:
        pass
    if session_pair:
        _json_request(
            f"{base_url}/api/session",
            method="DELETE",
            headers={
                "Cookie": session_pair,
                "X-Lingxi-Expected-Persist-Id": TARGET_PERSIST_ID,
            },
        )
    raise RuntimeError("旧凭证仍可登录")


def rotate(
    env_path: Path,
    data_dir: Path,
    backup_root: Path,
    expected_current_hash: str,
    expected_revision: str,
    base_url: str,
    *,
    strict_environment: bool = True,
) -> int:
    from dotenv import dotenv_values

    from brain.workspace.p6_config import (
        is_gateway_token_revoked,
        parse_user_token_map,
        token_hash,
    )

    evidence: dict[str, object] = {
        "persist_id": TARGET_PERSIST_ID,
        "token_rotated": False,
        "idempotent": False,
        "rollback_attempted": False,
        "rollback_restored": False,
        "config_backup_created": False,
        "gateway_active": False,
        "health_revision_ok": False,
        "session_verified": False,
        "BAD": 1,
    }
    backup_payload = b""
    applied_payload = b""
    source_stat: os.stat_result | None = None
    backup_fd = -1
    receipt: dict[str, object] | None = None
    rollback_allowed = False
    restart_attempted = False
    manual_recovery = False

    def rollback_token() -> str:
        _require(receipt is not None and backup_payload, "轮换回滚缺少备份绑定")
        backup_mapping = _mapping_from_bytes(
            backup_payload, dotenv_values, parse_user_token_map
        )
        token = str(backup_mapping.get(TARGET_PERSIST_ID) or "")
        _require(token_hash(token) == receipt["old_token_hash"], "回滚备份旧凭证不匹配")
        _require(
            is_gateway_token_revoked(data_dir, str(receipt["old_token_hash"])),
            "回滚目标旧凭证未撤销",
        )
        return token

    try:
        _require(HASH_RE.fullmatch(expected_current_hash) is not None, "当前凭证哈希格式无效")
        _require(re.fullmatch(r"[0-9a-f]{40}", expected_revision) is not None, "后端 revision 格式无效")
        _require(env_path.is_file() and not env_path.is_symlink(), "生产 .env 路径无效")
        if strict_environment:
            _validate_secure_chain(env_path.parent, 0)
        user_dir = data_dir / "users" / TARGET_PERSIST_ID
        _require(not user_dir.exists() and not user_dir.is_symlink(), "合成用户目录必须不存在")

        source_stat = env_path.stat()
        if strict_environment:
            _validate_env_metadata(source_stat)
        current_payload = env_path.read_bytes()
        original_text = current_payload.decode("utf-8")
        values = dotenv_values(env_path)
        mapping = parse_user_token_map(str(values.get("BRAIN_GATEWAY_USER_TOKENS") or ""))
        current_token = str(mapping.get(TARGET_PERSIST_ID) or "")
        _require(bool(current_token), "合成用户凭证不存在")
        current_hash = token_hash(current_token)
        _require(current_hash == expected_current_hash, "凭证状态在备份后发生变化")
        current_revoked = is_gateway_token_revoked(data_dir, current_hash)
        evidence["previous_token_revoked"] = current_revoked
        backup_fd = _open_backup_root(backup_root, strict=strict_environment)
        receipt = _load_receipt(backup_root, backup_fd)
        if strict_environment:
            release_file = Path("/opt/myagent/backend-current/release.txt")
            _require(release_file.is_file(), "锁内 backend release 文件缺失")
            _require(
                release_file.read_text(encoding="utf-8").strip() == expected_revision,
                "锁内 backend release revision 漂移",
            )
        if receipt is not None and receipt["state"] == "rollback_pending":
            try:
                _require(receipt["expected_revision"] == expected_revision, "回滚收据 revision 不匹配")
                backup_payload = _read_dir_file(
                    backup_root, backup_fd, str(receipt["backup_file"])
                )
                _require(
                    hashlib.sha256(backup_payload).hexdigest() == receipt["backup_sha256"],
                    "回滚收据备份摘要不匹配",
                )
                old_token = rollback_token()
                disk_sha256 = hashlib.sha256(current_payload).hexdigest()
                if disk_sha256 == receipt["new_env_sha256"]:
                    _atomic_write(env_path, backup_payload, source_stat)
                else:
                    _require(disk_sha256 == receipt["backup_sha256"], "回滚配置摘要不匹配")
                restart_attempted = True
                _restart_gateway()
                _require(
                    env_path.read_bytes() == backup_payload
                    and _gateway_active()
                    and _wait_health(base_url, expected_revision),
                    "挂起轮换回滚未恢复",
                )
                _verify_login_rejected(base_url, old_token)
                _update_receipt_state(backup_root, backup_fd, receipt, "prepared")
                evidence.update(
                    {
                        "config_backup_created": True,
                        "config_backup_file": receipt["backup_file"],
                        "config_backup_bytes": len(backup_payload),
                        "config_backup_sha256": receipt["backup_sha256"],
                        "rollback_attempted": True,
                        "rollback_restored": True,
                        "old_token_rejected": True,
                        "receipt_persisted": True,
                        "receipt_state": "prepared",
                    }
                )
                return rotate(
                    env_path,
                    data_dir,
                    backup_root,
                    str(receipt["old_token_hash"]),
                    expected_revision,
                    base_url,
                    strict_environment=strict_environment,
                )
            except Exception:
                manual_recovery = True
                restart_attempted = False
                _stop_gateway()
                evidence["gateway_stopped_for_manual_recovery"] = True
                raise
        if strict_environment:
            _require(
                _wait_health(base_url, expected_revision),
                "锁内本机 backend health revision 漂移",
            )
            evidence["locked_prewrite_revision_ok"] = True
        world_pid_before = _unit_main_pid("myagent-world.service")
        gateway_pid_before = _unit_main_pid("myagent-gateway.service")
        _require(world_pid_before > 0 and gateway_pid_before > 0, "生产服务 PID 无效")

        other_bindings = {
            persist_id: token
            for persist_id, token in mapping.items()
            if persist_id != TARGET_PERSIST_ID
        }
        if current_revoked:
            if receipt is not None:
                _require(receipt["expected_revision"] == expected_revision, "现有轮换收据 revision 不匹配")
                if receipt["state"] in {"prepared", "applied"}:
                    _require(receipt["old_token_hash"] == current_hash, "活动轮换收据不匹配当前旧凭证")
                    _require(
                        receipt["backup_sha256"]
                        == hashlib.sha256(current_payload).hexdigest(),
                        "活动轮换收据不匹配已恢复配置",
                    )
                else:
                    _require(receipt["new_token_hash"] == current_hash, "已验证轮换收据不匹配当前凭证")
            backup_file = _create_config_backup(backup_root, backup_fd, current_payload)
            backup_sha256 = hashlib.sha256(current_payload).hexdigest()
            backup_payload = current_payload
            evidence.update(
                {
                    "config_backup_created": True,
                    "config_backup_file": backup_file,
                    "config_backup_bytes": len(current_payload),
                    "config_backup_sha256": backup_sha256,
                }
            )
            for _ in range(10):
                replacement = secrets.token_urlsafe(48)
                replacement_hash = token_hash(replacement)
                if replacement not in mapping.values() and not is_gateway_token_revoked(
                    data_dir, replacement_hash
                ):
                    break
            else:
                raise RuntimeError("无法生成未撤销的新凭证")
            updated_mapping = dict(mapping)
            updated_mapping[TARGET_PERSIST_ID] = replacement
            serialized = json.dumps(
                updated_mapping,
                ensure_ascii=True,
                sort_keys=True,
                separators=(",", ":"),
            )
            updated_text = _replace_token_line(original_text, serialized)
            applied_payload = updated_text.encode("utf-8")
            _require(
                _redact_token_line(original_text) == _redact_token_line(updated_text),
                "轮换修改越过目标环境变量",
            )
            receipt = {
                "schema_version": RECEIPT_SCHEMA,
                "persist_id": TARGET_PERSIST_ID,
                "expected_revision": expected_revision,
                "old_token_hash": current_hash,
                "new_token_hash": replacement_hash,
                "new_env_sha256": hashlib.sha256(applied_payload).hexdigest(),
                "backup_file": backup_file,
                "backup_sha256": backup_sha256,
                "state": "prepared",
                "updated_at": int(time.time()),
            }
            _store_receipt(backup_root, backup_fd, receipt)
            rollback_allowed = True
            _require(env_path.read_bytes() == current_payload, "生产 .env 在轮换期间发生变化")
            _atomic_write(env_path, applied_payload, source_stat)
            _update_receipt_state(backup_root, backup_fd, receipt, "applied")
            evidence["token_rotated"] = True
            current_token = replacement
            current_hash = replacement_hash
        else:
            _require(receipt is not None, "未撤销凭证缺少持久轮换收据")
            _require(receipt["expected_revision"] == expected_revision, "轮换收据 revision 不匹配")
            _require(receipt["new_token_hash"] == current_hash, "当前凭证不匹配轮换收据")
            _require(
                receipt["new_env_sha256"] == hashlib.sha256(current_payload).hexdigest(),
                "当前配置不匹配轮换收据",
            )
            _require(
                is_gateway_token_revoked(data_dir, str(receipt["old_token_hash"])),
                "轮换收据旧凭证未撤销",
            )
            backup_payload = _read_dir_file(
                backup_root, backup_fd, str(receipt["backup_file"])
            )
            _require(
                hashlib.sha256(backup_payload).hexdigest() == receipt["backup_sha256"],
                "轮换收据备份摘要不匹配",
            )
            backup_mapping = _mapping_from_bytes(
                backup_payload, dotenv_values, parse_user_token_map
            )
            old_token = str(backup_mapping.get(TARGET_PERSIST_ID) or "")
            _require(token_hash(old_token) == receipt["old_token_hash"], "轮换备份旧凭证不匹配")
            _require(
                {key: value for key, value in backup_mapping.items() if key != TARGET_PERSIST_ID}
                == other_bindings,
                "轮换备份其他用户凭证不匹配",
            )
            applied_payload = current_payload
            rollback_allowed = receipt["state"] != "verified"
            if receipt["state"] == "prepared":
                _update_receipt_state(backup_root, backup_fd, receipt, "applied")
            evidence["idempotent"] = True
            evidence.update(
                {
                    "config_backup_created": True,
                    "config_backup_file": receipt["backup_file"],
                    "config_backup_bytes": len(backup_payload),
                    "config_backup_sha256": receipt["backup_sha256"],
                }
            )

        restart_attempted = True
        _restart_gateway()

        _require(_gateway_active(), "网关服务未运行")
        _require(_wait_health(base_url, expected_revision), "网关健康或 revision 复核失败")
        _verify_login(base_url, current_token)
        backup_mapping = _mapping_from_bytes(backup_payload, dotenv_values, parse_user_token_map)
        old_token = str(backup_mapping.get(TARGET_PERSIST_ID) or "")
        _require(token_hash(old_token) == receipt["old_token_hash"], "旧凭证备份绑定错误")
        try:
            _verify_login_rejected(base_url, old_token)
        except Exception:
            if not rollback_allowed:
                manual_recovery = True
                restart_attempted = False
                _stop_gateway()
                evidence["gateway_stopped_for_manual_recovery"] = True
            raise
        world_pid_after = _unit_main_pid("myagent-world.service")
        gateway_pid_after = _unit_main_pid("myagent-gateway.service")
        _require(world_pid_after == world_pid_before, "轮换意外重启 world 服务")
        _require(gateway_pid_after > 0, "轮换后 gateway PID 无效")
        _require(gateway_pid_after != gateway_pid_before, "gateway 未重新加载生产配置")

        final_values = dotenv_values(env_path)
        final_payload = env_path.read_bytes()
        final_mapping = parse_user_token_map(
            str(final_values.get("BRAIN_GATEWAY_USER_TOKENS") or "")
        )
        final_token = str(final_mapping.get(TARGET_PERSIST_ID) or "")
        _require(token_hash(final_token) == receipt["new_token_hash"], "轮换后凭证复读不一致")
        _require(
            {
                persist_id: token
                for persist_id, token in final_mapping.items()
                if persist_id != TARGET_PERSIST_ID
            }
            == other_bindings,
            "轮换改动了其他用户凭证",
        )
        _require(not is_gateway_token_revoked(data_dir, current_hash), "新凭证仍处于撤销态")
        _require(
            _redact_token_line(backup_payload.decode("utf-8"))
            == _redact_token_line(final_payload.decode("utf-8")),
            "轮换改动了非目标环境配置",
        )
        _require(
            is_gateway_token_revoked(data_dir, str(receipt["old_token_hash"])),
            "旧凭证撤销记录丢失",
        )
        _require(not user_dir.exists() and not user_dir.is_symlink(), "轮换意外创建用户目录")
        _update_receipt_state(backup_root, backup_fd, receipt, "verified")
        rollback_allowed = False
        retained = _retain_backups(
            backup_root, backup_fd, str(receipt["backup_file"])
        )
        evidence.update(
            {
                "token_hash_changed": receipt["old_token_hash"] != receipt["new_token_hash"],
                "old_revocation_retained": True,
                "current_token_revoked": False,
                "directory_absent": True,
                "non_target_env_bytes_preserved": True,
                "other_token_bindings_preserved": True,
                "gateway_active": True,
                "world_pid_unchanged": True,
                "gateway_restarted": True,
                "health_revision_ok": True,
                "session_verified": True,
                "old_token_rejected": True,
                "receipt_persisted": True,
                "receipt_state": "verified",
                "backup_retained_count": retained,
                "BAD": 0,
            }
        )
    except Exception as exc:
        evidence["error_type"] = type(exc).__name__
        persisted_receipt = None
        if backup_fd >= 0:
            try:
                persisted_receipt = _load_receipt(backup_root, backup_fd)
            except Exception:
                persisted_receipt = None
        if (
            persisted_receipt is not None
            and persisted_receipt.get("state") == "verified"
            and receipt is not None
            and persisted_receipt.get("new_token_hash") == receipt.get("new_token_hash")
        ):
            rollback_allowed = False
        if rollback_allowed and source_stat is not None and backup_payload:
            evidence["rollback_attempted"] = True
            try:
                _require(receipt is not None and backup_fd >= 0, "轮换回滚缺少持久收据")
                try:
                    _update_receipt_state(
                        backup_root, backup_fd, receipt, "rollback_pending"
                    )
                except Exception:
                    durable = _load_receipt(backup_root, backup_fd)
                    _require(
                        durable is not None
                        and durable["state"] == "rollback_pending"
                        and durable["new_token_hash"] == receipt["new_token_hash"],
                        "轮换回滚意图未持久化",
                    )
                    receipt = durable
                disk_payload = env_path.read_bytes()
                old_token = rollback_token()
                if disk_payload == applied_payload:
                    _atomic_write(env_path, backup_payload, source_stat)
                elif disk_payload != backup_payload:
                    raise RuntimeError("生产 .env 与事务新旧摘要均不匹配")
                restart_attempted = True
                _restart_gateway()
                evidence["rollback_restored"] = bool(
                    env_path.read_bytes() == backup_payload
                    and _gateway_active()
                    and _wait_health(base_url, expected_revision)
                )
                if evidence["rollback_restored"]:
                    _verify_login_rejected(base_url, old_token)
                    evidence["old_token_rejected"] = True
                    _update_receipt_state(
                        backup_root, backup_fd, receipt, "prepared"
                    )
            except Exception as rollback_exc:
                evidence["rollback_error_type"] = type(rollback_exc).__name__
                manual_recovery = True
                restart_attempted = False
                try:
                    _stop_gateway()
                    evidence["gateway_stopped_for_manual_recovery"] = True
                except Exception as stop_exc:
                    evidence["gateway_stop_error_type"] = type(stop_exc).__name__
        elif restart_attempted and not manual_recovery:
            try:
                _restart_gateway()
                evidence["failure_gateway_restarted"] = bool(
                    _gateway_active() and _wait_health(base_url, expected_revision)
                )
            except Exception as cleanup_exc:
                evidence["failure_gateway_restart_error_type"] = type(cleanup_exc).__name__
        print(json.dumps(evidence, ensure_ascii=False, sort_keys=True))
        return 1
    finally:
        if backup_fd >= 0:
            os.close(backup_fd)

    print(json.dumps(evidence, ensure_ascii=False, sort_keys=True))
    return 0


def _self_test() -> None:
    import contextlib
    import types

    original = (
        "MODEL='claude-fable-5'\n"
        'BRAIN_GATEWAY_USER_TOKENS={"p6_load_a":"old","p6_load_b":"keep"}\n'
        "CHANNEL=unchanged\n"
    )
    _validate_env_metadata(
        types.SimpleNamespace(st_uid=0, st_gid=123, st_mode=0o100640),
        expected_group_gid=123,
    )
    _validate_env_metadata(types.SimpleNamespace(st_uid=0, st_gid=456, st_mode=0o100600))
    for invalid_metadata in (
        types.SimpleNamespace(st_uid=1, st_gid=123, st_mode=0o100640),
        types.SimpleNamespace(st_uid=0, st_gid=123, st_mode=0o100644),
        types.SimpleNamespace(st_uid=0, st_gid=456, st_mode=0o100640),
    ):
        try:
            _validate_env_metadata(invalid_metadata, expected_group_gid=123)
        except RuntimeError:
            pass
        else:
            raise AssertionError("生产 .env 所有权或权限门未生效")
    request_calls: list[dict[str, object]] = []
    original_json_request = _json_request

    def fake_json_request(url: str, **kwargs: object) -> tuple[dict, object]:
        request_calls.append({"url": url, **kwargs})
        if kwargs.get("method") == "POST":
            return (
                {"scope": "user", "persist_id": TARGET_PERSIST_ID},
                {
                    "Set-Cookie": "__Host-lingxi_session=test; Path=/; Secure; "
                    "HttpOnly; SameSite=Strict"
                },
            )
        return {"ok": True}, {}

    try:
        globals()["_json_request"] = fake_json_request
        _verify_login("http://local", "secret")
        assert request_calls[0]["body"] == b'{"token":"secret"}'
        assert "Authorization" not in request_calls[0]["headers"]
        assert request_calls[1]["method"] == "DELETE"
    finally:
        globals()["_json_request"] = original_json_request

    request_calls.clear()

    def fake_wrong_identity(url: str, **kwargs: object) -> tuple[dict, object]:
        request_calls.append({"url": url, **kwargs})
        if kwargs.get("method") == "POST":
            return (
                {"scope": "user", "persist_id": "wrong-user"},
                {
                    "Set-Cookie": "__Host-lingxi_session=test; Path=/; Secure; "
                    "HttpOnly; SameSite=Strict"
                },
            )
        return {"ok": True}, {}

    try:
        globals()["_json_request"] = fake_wrong_identity
        try:
            _verify_login("http://local", "secret")
        except RuntimeError:
            pass
        else:
            raise AssertionError("身份错误未失败关闭")
        assert request_calls[-1]["method"] == "DELETE"
    finally:
        globals()["_json_request"] = original_json_request

    request_calls.clear()

    def fake_unrelated_cookie(url: str, **kwargs: object) -> tuple[dict, object]:
        request_calls.append({"url": url, **kwargs})
        return (
            {"scope": "user", "persist_id": TARGET_PERSIST_ID},
            {"Set-Cookie": "unrelated=test; Path=/; Secure; HttpOnly; SameSite=Strict"},
        )

    try:
        globals()["_json_request"] = fake_unrelated_cookie
        try:
            _verify_login("http://local", "secret")
        except RuntimeError:
            pass
        else:
            raise AssertionError("无关 Cookie 被误判为目标短会话")
        assert len(request_calls) == 1
    finally:
        globals()["_json_request"] = original_json_request

    try:
        _session_cookie_pair(
            {
                "Set-Cookie": "__Host-lingxi_session=test; Domain=example.com; "
                "Path=/; Secure; HttpOnly; SameSite=Strict"
            }
        )
    except RuntimeError:
        pass
    else:
        raise AssertionError("带 Domain 的 __Host- Cookie 未失败关闭")

    request_calls.clear()
    try:
        globals()["_json_request"] = fake_json_request
        try:
            _verify_login_rejected("http://local", "old-secret")
        except RuntimeError:
            pass
        else:
            raise AssertionError("意外可登录的旧凭证未失败关闭")
        assert request_calls[0]["method"] == "POST"
        assert request_calls[-1]["method"] == "DELETE"
    finally:
        globals()["_json_request"] = original_json_request

    updated = _replace_token_line(
        original,
        '{"p6_load_a":"new","p6_load_b":"keep"}',
    )
    assert _redact_token_line(original) == _redact_token_line(updated)
    assert "BRAIN_GATEWAY_USER_TOKENS='{\"p6_load_a\":\"new\",\"p6_load_b\":\"keep\"}'" in updated
    assert "MODEL='claude-fable-5'" in updated
    assert "CHANNEL=unchanged" in updated
    for invalid in ("A=1\n", original + original):
        try:
            _replace_token_line(invalid, "{}")
        except RuntimeError:
            pass
        else:
            raise AssertionError("目标环境变量数量门未生效")
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / ".env"
        path.write_text(original, encoding="utf-8")
        os.chmod(path, 0o640)
        source_stat = path.stat()
        _atomic_write(path, updated.encode("utf-8"), source_stat)
        assert path.read_text(encoding="utf-8") == updated
        assert stat.S_IMODE(path.stat().st_mode) == stat.S_IMODE(source_stat.st_mode)

    fake_dotenv = types.ModuleType("dotenv")
    fake_config = types.ModuleType("brain.workspace.p6_config")
    revoked_hashes: set[str] = set()

    def fake_token_hash(token: str) -> str:
        return "sha256:" + hashlib.sha256(token.encode("utf-8")).hexdigest()

    def fake_dotenv_values(
        path: Path | None = None, *, stream: io.StringIO | None = None
    ) -> dict[str, str]:
        text = stream.read() if stream is not None else Path(path).read_text(encoding="utf-8")
        match = TOKEN_LINE_RE.search(text)
        assert match is not None
        value = match.group(2).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        return {"BRAIN_GATEWAY_USER_TOKENS": value}

    fake_dotenv.dotenv_values = fake_dotenv_values
    fake_config.parse_user_token_map = json.loads
    fake_config.token_hash = fake_token_hash
    fake_config.is_gateway_token_revoked = (
        lambda _data_dir, value: value in revoked_hashes
    )

    module_names = ("dotenv", "brain", "brain.workspace", "brain.workspace.p6_config")
    previous_modules = {name: sys.modules.get(name) for name in module_names}
    sys.modules["dotenv"] = fake_dotenv
    sys.modules["brain"] = types.ModuleType("brain")
    sys.modules["brain.workspace"] = types.ModuleType("brain.workspace")
    sys.modules["brain.workspace.p6_config"] = fake_config

    original_runtime_helpers = (
        _restart_gateway,
        _stop_gateway,
        _gateway_active,
        _wait_health,
        _verify_login,
        _verify_login_rejected,
        _unit_main_pid,
        _atomic_write,
    )
    restart_count = 0
    stop_count = 0
    verified_tokens: list[str] = []
    unit_pids = {
        "myagent-world.service": 101,
        "myagent-gateway.service": 202,
    }

    def fake_restart() -> None:
        nonlocal restart_count
        restart_count += 1
        unit_pids["myagent-gateway.service"] += 1

    def fake_stop() -> None:
        nonlocal stop_count
        stop_count += 1

    def invoke(
        env_path: Path,
        data_dir: Path,
        backup_root: Path,
        expected_hash: str,
    ) -> tuple[int, dict[str, object]]:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = rotate(
                env_path,
                data_dir,
                backup_root,
                expected_hash,
                "a" * 40,
                "http://local",
                strict_environment=False,
            )
        return result, json.loads(output.getvalue())

    try:
        globals()["_restart_gateway"] = fake_restart
        globals()["_stop_gateway"] = fake_stop
        globals()["_gateway_active"] = lambda: True
        globals()["_wait_health"] = lambda _base, _revision: True
        globals()["_verify_login"] = lambda _base, token: verified_tokens.append(token)
        globals()["_verify_login_rejected"] = lambda _base, _token: None
        globals()["_unit_main_pid"] = lambda unit: unit_pids[unit]
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            env_path = root / ".env"
            data_dir = root / "data"
            (data_dir / "users").mkdir(parents=True)
            env_path.write_text(original, encoding="utf-8")
            old_hash = fake_token_hash("old")
            revoked_hashes.add(old_hash)

            result, first_evidence = invoke(
                env_path, data_dir, root / "backups", old_hash
            )
            assert result == 0 and restart_count == 1 and len(verified_tokens) == 1, (
                result,
                restart_count,
                len(verified_tokens),
                first_evidence,
            )
            assert first_evidence["token_rotated"] is True
            assert first_evidence["receipt_state"] == "verified"
            rotated_mapping = fake_dotenv_values(env_path)["BRAIN_GATEWAY_USER_TOKENS"]
            rotated_token = json.loads(rotated_mapping)[TARGET_PERSIST_ID]
            rotated_hash = fake_token_hash(rotated_token)
            assert rotated_hash not in revoked_hashes and rotated_token != "old"

            result, idempotent_evidence = invoke(
                env_path, data_dir, root / "backups", rotated_hash
            )
            assert result == 0 and restart_count == 2
            assert idempotent_evidence["idempotent"] is True

            backup_fd = _open_backup_root(root / "backups", strict=False)
            try:
                receipt = _load_receipt(root / "backups", backup_fd)
                assert receipt is not None and receipt["state"] == "verified"
                for _ in range(8):
                    _create_config_backup(root / "backups", backup_fd, original.encode())
                assert _retain_backups(
                    root / "backups", backup_fd, str(receipt["backup_file"])
                ) <= MAX_BACKUPS
                assert sum(
                    bool(BACKUP_NAME_RE.fullmatch(name))
                    for name in os.listdir(root / "backups")
                ) <= MAX_BACKUPS
            finally:
                os.close(backup_fd)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            env_path = root / ".env"
            data_dir = root / "data"
            (data_dir / "users").mkdir(parents=True)
            live = original.replace('"old"', '"live-token-that-is-not-revoked-1234567890"')
            env_path.write_text(live, encoding="utf-8")
            live_hash = fake_token_hash("live-token-that-is-not-revoked-1234567890")
            before_restarts = restart_count
            result, no_receipt = invoke(env_path, data_dir, root / "backups", live_hash)
            assert result == 1 and no_receipt["error_type"] == "RuntimeError"
            assert restart_count == before_restarts

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            env_path = root / ".env"
            data_dir = root / "data"
            (data_dir / "users").mkdir(parents=True)
            env_path.write_text(original, encoding="utf-8")
            restart_count = 0
            globals()["_verify_login"] = lambda _base, _token: _require(
                False, "injected verification failure"
            )
            result, failed_evidence = invoke(
                env_path, data_dir, root / "backups", old_hash
            )
            assert result == 1 and restart_count == 2
            assert failed_evidence["rollback_restored"] is True
            assert env_path.read_text(encoding="utf-8") == original

        globals()["_verify_login"] = lambda _base, token: verified_tokens.append(token)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            env_path = root / ".env"
            data_dir = root / "data"
            (data_dir / "users").mkdir(parents=True)
            env_path.write_text(original, encoding="utf-8")
            original_atomic_write = original_runtime_helpers[-1]
            original_replace = os.replace
            original_fsync = os.fsync
            env_replaced = False
            fsync_failed = False

            def track_env_replace(source: object, target: object, *args: object, **kwargs: object) -> None:
                nonlocal env_replaced, fsync_failed
                original_replace(source, target, *args, **kwargs)
                if not args and not kwargs and Path(target) == env_path:
                    env_replaced = True
                    if os.name == "nt" and not fsync_failed:
                        fsync_failed = True
                        raise OSError("injected post-replace failure")

            def fail_directory_fsync(descriptor: int) -> None:
                nonlocal fsync_failed
                if (
                    env_replaced
                    and not fsync_failed
                    and stat.S_ISDIR(os.fstat(descriptor).st_mode)
                ):
                    fsync_failed = True
                    raise OSError("injected directory fsync failure")
                original_fsync(descriptor)

            os.replace = track_env_replace
            os.fsync = fail_directory_fsync
            rollback_restart_failed = False

            def fail_first_rollback_restart() -> None:
                nonlocal rollback_restart_failed
                if not rollback_restart_failed:
                    rollback_restart_failed = True
                    raise RuntimeError("injected rollback restart failure")
                fake_restart()

            globals()["_restart_gateway"] = fail_first_rollback_restart
            try:
                result, fsync_evidence = invoke(
                    env_path, data_dir, root / "backups", old_hash
                )
                assert result == 1 and fsync_evidence["rollback_restored"] is False
                assert fsync_evidence["gateway_stopped_for_manual_recovery"] is True
                assert env_path.read_text(encoding="utf-8") == original
            finally:
                os.replace = original_replace
                os.fsync = original_fsync
                globals()["_restart_gateway"] = fake_restart
            backup_fd = _open_backup_root(root / "backups", strict=False)
            try:
                pending = _load_receipt(root / "backups", backup_fd)
                assert pending is not None and pending["state"] == "rollback_pending"
            finally:
                os.close(backup_fd)
            result, recovered = invoke(
                env_path, data_dir, root / "backups", old_hash
            )
            assert result == 0 and recovered["receipt_state"] == "verified"
            assert recovered["old_token_rejected"] is True
            assert recovered["token_rotated"] is True

        globals()["_atomic_write"] = original_runtime_helpers[-1]

        class InjectedCrash(BaseException):
            pass

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            env_path = root / ".env"
            data_dir = root / "data"
            (data_dir / "users").mkdir(parents=True)
            env_path.write_text(original, encoding="utf-8")
            crash_once = True

            def crash_after_replace(
                path: Path, payload: bytes, metadata: os.stat_result
            ) -> None:
                nonlocal crash_once
                original_atomic_write(path, payload, metadata)
                if crash_once:
                    crash_once = False
                    raise InjectedCrash()

            globals()["_atomic_write"] = crash_after_replace
            try:
                invoke(env_path, data_dir, root / "backups", old_hash)
            except InjectedCrash:
                pass
            else:
                raise AssertionError("进程中断注入未触发")
            globals()["_atomic_write"] = original_atomic_write
            interrupted_mapping = fake_dotenv_values(env_path)[
                "BRAIN_GATEWAY_USER_TOKENS"
            ]
            interrupted_token = json.loads(interrupted_mapping)[TARGET_PERSIST_ID]
            result, resumed = invoke(
                env_path,
                data_dir,
                root / "backups",
                fake_token_hash(interrupted_token),
            )
            assert result == 0 and resumed["idempotent"] is True
            assert resumed["receipt_state"] == "verified"
    finally:
        (
            globals()["_restart_gateway"],
            globals()["_stop_gateway"],
            globals()["_gateway_active"],
            globals()["_wait_health"],
            globals()["_verify_login"],
            globals()["_verify_login_rejected"],
            globals()["_unit_main_pid"],
            globals()["_atomic_write"],
        ) = original_runtime_helpers
        for name, module in previous_modules.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module
    print("d050 synthetic token rotation self-test OK")


def main() -> int:
    if sys.argv[1:] == ["--self-test"]:
        _self_test()
        return 0
    if len(sys.argv) != 7:
        raise SystemExit(
            "usage: d050_rotate_synthetic_token.py ENV_PATH DATA_DIR BACKUP_ROOT "
            "EXPECTED_CURRENT_HASH EXPECTED_REVISION BASE_URL"
        )
    return rotate(
        Path(sys.argv[1]),
        Path(sys.argv[2]),
        Path(sys.argv[3]),
        sys.argv[4],
        sys.argv[5],
        sys.argv[6].rstrip("/"),
    )


if __name__ == "__main__":
    raise SystemExit(main())
