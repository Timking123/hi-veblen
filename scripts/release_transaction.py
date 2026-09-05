#!/usr/bin/env python3
"""MyWeb 发布事务：固定生产路径、fd 绑定前像和持久恢复回执。"""

from __future__ import annotations

import base64
import copy
import errno
import hashlib
import json
import math
import os
import re
import secrets
import shlex
import stat
import subprocess
import sys
import urllib.error
import urllib.request
from contextlib import contextmanager
from typing import Any, Iterator

try:
    import fcntl
except ImportError:
    fcntl = None


RECORD_SCHEMA = "previous-backend-v1"
RECEIPT_SCHEMA = "release-transaction-state-v1"
RECORD_NAME = "previous-backend-v1.json"
RECEIPT_NAME = "release-transaction-state-v1.json"
WEB_ROOT = "/opt/hi-veblen"
PROJECT_ROOT = "/opt/myagent"
RELEASES_ROOT = WEB_ROOT + "/releases"
STAGING_ROOT = WEB_ROOT + "/staging"
LOCK_PATH = "/run/hi-veblen-release.lock"
LEASE_PATH = "/run/hi-veblen-release-lease"
MAINTENANCE_PATH = "/run/myagent-release-maintenance"
PRESERVE_PATH = "/run/hi-veblen-release-preserve"
SLOTS = ("portal", "lingxi", "backend")
CURRENT = {"portal": WEB_ROOT + "/portal-current", "lingxi": WEB_ROOT + "/lingxi-current",
           "backend": PROJECT_ROOT + "/backend-current"}
CONTROL = {"helper": "release_transaction.py", "driver": "production-release-transaction.sh",
           "health_validator": "validate_release_health.py"}
CONFIG = {
    "world_unit": ("/etc/systemd/system/myagent-world.service", "systemd/myagent-world.service"),
    "gateway_unit": ("/etc/systemd/system/myagent-gateway.service", "systemd/myagent-gateway.service"),
    "nginx_primary_available": ("/etc/nginx/sites-available/hi-veblen.com.conf", "nginx-available/hi-veblen.com.conf"),
    "nginx_secondary_available": ("/etc/nginx/sites-available/lingxi.hi-veblen.com.conf", "nginx-available/lingxi.hi-veblen.com.conf"),
    "nginx_primary_enabled": ("/etc/nginx/sites-enabled/hi-veblen.com.conf", "nginx-enabled/hi-veblen.com.conf"),
    "nginx_secondary_enabled": ("/etc/nginx/sites-enabled/lingxi.hi-veblen.com.conf", "nginx-enabled/lingxi.hi-veblen.com.conf"),
    "apparmor_profile": ("/etc/apparmor.d/myagent-persona-parser", "apparmor/myagent-persona-parser"),
}
PRE_EXPOSING = ("prepared", "deploying", "rollback-pending", "restored")
TERMINAL_PHASES = ("terminal", "record-removed", "preserve-removed", "pruning", "pruned", "lease-releasing", "closed")
PHASES = PRE_EXPOSING + ("exposing", "committing") + TERMINAL_PHASES
IDENTITY_KEYS = ("device", "inode", "uid", "gid", "mode", "link_count")
RECORD_KEYS = ("schema_version", "txn", "phase", "canary_hashes", "previous_phase", "previous_canary_hashes",
               "candidate", "previous", "current_links", "candidate_links", "config_backup", "previous_apparmor_loaded",
               "preserve", "anchors", "control", "rollback_floor")
RECEIPT_KEYS = ("schema_version", "txn_id", "record_sha256", "phase", "operation", "restore_plan", "prune_plan", "terminal")
CHECKS = ("pointers", "services", "configuration", "health", "maintenance_blocked", "traffic_reopened", "identities_stable")
MAX_UINT = (1 << 64) - 1
# 固定解释器启动时的原生能力，故障注入包装不会改变平台本身的支持情况。
DIR_FD_SUPPORTED = all(function in os.supports_dir_fd
                       for function in (os.open, os.stat, os.readlink, os.unlink, os.mkdir, os.rename))


def _observation_policy() -> tuple[float, float, float]:
    # 发布专用时长、间隔和超时尚待契约裁决，不能借用 watcher 的通用默认值。
    raise TransactionError("E_GATES", "HOLD：发布专用 P6 观察策略尚未冻结")


class TransactionError(RuntimeError):
    """仅暴露固定错误码，不把配置、响应或凭据写入诊断。"""

    def __init__(self, code: str, message: str = "发布事务校验失败") -> None:
        self.code = code
        super().__init__(f"{code}: {message}")


def _require(condition: bool, code: str, message: str = "发布事务校验失败") -> None:
    if not condition:
        raise TransactionError(code, message)


def _keys(value: Any, keys: Any, code: str = "E_RECORD_INVALID") -> None:
    _require(type(value) is dict and set(value) == set(keys), code, "对象键集合不合法")


def _hex(value: Any, length: int, code: str = "E_RECORD_INVALID") -> None:
    _require(type(value) is str and re.fullmatch(r"[0-9a-f]{%d}" % length, value) is not None, code)


def _uint(value: Any, code: str = "E_RECORD_INVALID") -> None:
    _require(type(value) is int and 0 <= value <= MAX_UINT, code)


def _canonical(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def _digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        _require(key not in result, "E_RECORD_INVALID", "拒绝重复 JSON 键")
        result[key] = value
    return result


def _decode_json(raw: bytes, limit: int, code: str) -> dict[str, Any]:
    try:
        _require(len(raw) <= limit, code)
        value = json.loads(raw.decode("utf-8", errors="strict"), object_pairs_hook=_pairs,
                           parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        _require(type(value) is dict and _canonical(value) == raw, code, "JSON 必须为规范完整字节")
        return value
    except (ValueError, TypeError, RecursionError, TransactionError) as error:
        raise TransactionError(code, "JSON 结构或规范字节不合法") from error


def _b64(value: Any, code: str = "E_RECORD_INVALID") -> bytes:
    try:
        _require(type(value) is str, code)
        raw = base64.b64decode(value, validate=True)
        _require(base64.b64encode(raw).decode("ascii") == value, code)
        return raw
    except (ValueError, TypeError) as error:
        raise TransactionError(code, "Base64 不合法") from error


def _identity(info: os.stat_result) -> dict[str, int]:
    return dict(zip(IDENTITY_KEYS, (info.st_dev, info.st_ino, info.st_uid, info.st_gid, info.st_mode, info.st_nlink)))


def _validate_identity(value: Any, kind: str) -> None:
    _keys(value, IDENTITY_KEYS)
    for item in value.values():
        _uint(item)
    _require(value["inode"] > 0 and value["link_count"] > 0 and value["mode"] <= 65535, "E_IDENTITY")
    predicate = {"file": stat.S_ISREG, "directory": stat.S_ISDIR, "symlink": stat.S_ISLNK}[kind]
    _require(predicate(value["mode"]) and value["uid"] == 0, "E_IDENTITY")
    if kind != "directory":
        _require(value["link_count"] == 1, "E_IDENTITY")
    if kind != "symlink":
        _require(value["mode"] & 0o022 == 0, "E_IDENTITY")


def _same(actual: dict[str, int], expected: dict[str, int], *, directory_children: bool = False) -> None:
    keys = set(IDENTITY_KEYS) - ({"link_count"} if directory_children else set())
    _require(all(actual[key] == expected[key] for key in keys), "E_DRIFT", "已捕获对象身份发生漂移")


def _path(value: Any) -> list[str]:
    _require(type(value) is str and value.startswith("/") and "\x00" not in value, "E_PATH")
    parts = value.split("/")[1:]
    _require(bool(parts) and all(part not in ("", ".", "..") for part in parts), "E_PATH")
    return parts


def _platform() -> None:
    _require(os.name == "posix" and fcntl is not None and hasattr(os, "O_NOFOLLOW") and hasattr(os, "O_DIRECTORY"),
             "E_PLATFORM", "需要 Linux POSIX no-follow、dir-fd、flock 和目录 fsync")
    _require(DIR_FD_SUPPORTED, "E_PLATFORM")


def _open_root_fd() -> int:
    # 测试仅替换这个私有入口，所有事务、身份校验与磁盘操作仍真实执行。
    return os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)


class _Fs:
    def __init__(self) -> None:
        _platform()
        self.root = _open_root_fd()
        _validate_identity(_identity(os.fstat(self.root)), "directory")

    def __enter__(self) -> _Fs:
        return self

    def __exit__(self, *_: Any) -> None:
        os.close(self.root)

    @contextmanager
    def directory(self, path: str) -> Iterator[int]:
        parts = [] if path == "/" else _path(path)
        fd = os.dup(self.root)
        try:
            for part in parts:
                next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=fd)
                try:
                    _validate_identity(_identity(os.fstat(next_fd)), "directory")
                except BaseException:
                    os.close(next_fd)
                    raise
                os.close(fd)
                fd = next_fd
            yield fd
        except OSError as error:
            if error.errno in (errno.ELOOP, errno.ENOTDIR):
                raise TransactionError("E_PATH", "路径组件不能为符号链接或非目录") from error
            raise
        finally:
            os.close(fd)

    @contextmanager
    def parent(self, path: str) -> Iterator[tuple[int, str]]:
        parts = _path(path)
        with self.directory("/" + "/".join(parts[:-1]) if len(parts) > 1 else "/") as fd:
            yield fd, parts[-1]

    def info(self, path: str) -> dict[str, int]:
        with self.parent(path) as (fd, name):
            return _identity(os.stat(name, dir_fd=fd, follow_symlinks=False))

    def exists(self, path: str) -> bool:
        try:
            self.info(path)
            return True
        except FileNotFoundError:
            return False

    def ref(self, path: str) -> dict[str, Any]:
        with self.directory(path) as fd:
            return {"path": path, "identity": _identity(os.fstat(fd))}

    def read(self, path: str, limit: int = 4 * 1024 * 1024) -> tuple[bytes, dict[str, int]]:
        with self.parent(path) as (parent_fd, name):
            return self.read_at(parent_fd, name, limit)

    def read_at(self, parent_fd: int, name: str, limit: int = 4 * 1024 * 1024) -> tuple[bytes, dict[str, int]]:
        _require(type(name) is str and name not in ("", ".", "..") and "/" not in name and "\x00" not in name, "E_PATH")
        before = _identity(os.stat(name, dir_fd=parent_fd, follow_symlinks=False))
        _validate_identity(before, "file")
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK, dir_fd=parent_fd)
        try:
            _same(_identity(os.fstat(fd)), before)
            chunks: list[bytes] = []
            length = 0
            while True:
                chunk = os.read(fd, min(65536, limit + 1 - length))
                if not chunk:
                    break
                chunks.append(chunk)
                length += len(chunk)
                _require(length <= limit, "E_ARTIFACT", "受信文件超出大小限制")
            _same(_identity(os.fstat(fd)), before)
            _same(_identity(os.stat(name, dir_fd=parent_fd, follow_symlinks=False)), before)
            return b"".join(chunks), before
        finally:
            os.close(fd)

    def file_image(self, path: str) -> dict[str, Any]:
        raw, identity = self.read(path)
        return {"identity": identity, "bytes_b64": base64.b64encode(raw).decode("ascii"), "sha256": _digest(raw)}

    def link(self, path: str) -> dict[str, Any]:
        with self.parent(path) as (fd, name):
            before = _identity(os.stat(name, dir_fd=fd, follow_symlinks=False))
            _validate_identity(before, "symlink")
            raw = os.readlink(os.fsencode(name), dir_fd=fd)
            _require(bool(raw) and len(raw) <= 4096 and b"\x00" not in raw, "E_PATH")
            _same(_identity(os.stat(name, dir_fd=fd, follow_symlinks=False)), before)
            return {"identity": before, "link_text_b64": base64.b64encode(raw).decode("ascii")}

    def sync(self, path: str) -> None:
        with self.directory(path) as fd:
            os.fsync(fd)

    def sync_file(self, path: str) -> None:
        with self.parent(path) as (fd, name):
            identity = self.info(path)
            _validate_identity(identity, "file")
            opened = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=fd)
            try:
                _same(_identity(os.fstat(opened)), identity)
                os.fsync(opened)
            finally:
                os.close(opened)
            os.fsync(fd)

    def mkdir(self, path: str, mode: int = 0o700) -> None:
        with self.parent(path) as (fd, name):
            os.mkdir(name, mode, dir_fd=fd)
            os.fsync(fd)

    def symlink(self, path: str, raw: bytes) -> dict[str, Any]:
        with self.parent(path) as (fd, name):
            os.symlink(raw, os.fsencode(name), dir_fd=fd)
            os.fsync(fd)
        return self.link(path)

    def write(self, path: str, raw: bytes, *, expected: dict[str, int] | None = None, mode: int = 0o600) -> None:
        with self.parent(path) as (fd, name):
            temporary = f".{name}.{secrets.token_hex(16)}.tmp"
            opened = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, mode, dir_fd=fd)
            try:
                os.fchmod(opened, mode)
                _validate_identity(_identity(os.fstat(opened)), "file")
                position = 0
                while position < len(raw):
                    written = os.write(opened, raw[position:])
                    _require(written > 0, "E_IO")
                    position += written
                os.fsync(opened)
            finally:
                os.close(opened)
            # 正式记录禁止覆盖；唯一锁及 root-only 父目录保证这次查验至 rename 的独占性。
            if expected is None:
                _require(not self.exists(path), "E_STATE", "拒绝覆盖已有首次发布文件")
            else:
                _same(_identity(os.stat(name, dir_fd=fd, follow_symlinks=False)), expected)
            os.rename(temporary, name, src_dir_fd=fd, dst_dir_fd=fd)
            os.fsync(fd)

    def remove(self, path: str, expected: dict[str, int], *, directory: bool = False) -> None:
        with self.parent(path) as (fd, name):
            actual = _identity(os.stat(name, dir_fd=fd, follow_symlinks=False))
            _same(actual, expected, directory_children=directory)
            if directory:
                os.rmdir(name, dir_fd=fd)
            else:
                os.unlink(name, dir_fd=fd)
            os.fsync(fd)


def _validate_phases(phases: Any, hashes: Any, code: str = "E_PHASE") -> None:
    _keys(phases, ("persona_schema", "persona_growth", "world_ledger"), code)
    _require(phases["persona_schema"] in ("compat", "active") and phases["persona_growth"] in ("compat", "shadow", "canary", "active")
             and phases["world_ledger"] in ("compat", "active"), code)
    _require(phases["persona_schema"] != "compat" or phases["persona_growth"] in ("compat", "shadow"), code)
    _require(type(hashes) is list and len(hashes) <= 512, code)
    for value in hashes:
        _hex(value, 64, code)
    _require(hashes == sorted(set(hashes)) and (phases["persona_growth"] == "canary" or not hashes), code)


def _txn(txn_id: Any) -> dict[str, str]:
    _require(type(txn_id) is str, "E_ARGUMENT")
    match = re.fullmatch(r"run-([1-9][0-9]*)-([1-9][0-9]*)-([0-9a-f]{40})", txn_id)
    _require(match is not None, "E_ARGUMENT")
    run_id, attempt, revision = match.groups()
    _require(len(run_id) <= 20 and len(attempt) <= 20 and int(run_id) <= MAX_UINT and int(attempt) <= MAX_UINT, "E_ARGUMENT")
    return {"txn_id": txn_id, "run_id": run_id, "run_attempt": attempt, "portal_revision": revision}


def _locations(txn_id: str) -> tuple[str, str, str]:
    txn = _txn(txn_id)
    suffix = txn["run_id"] + "-" + txn["run_attempt"]
    upload = STAGING_ROOT + "/run-" + suffix
    return upload, upload + "/rollback", RELEASES_ROOT + "/release-" + txn["portal_revision"] + "-" + suffix


def _release_env(revision: str, legacy: bool = False) -> bytes:
    raw = f"BRAIN_RELEASE_SHA={revision}\nLINGXI_PERSONA_SCHEMA_CAPABILITY=dual-read-v1\n"
    if not legacy:
        raw += "LINGXI_WORLD_LEDGER_SCHEMA_CAPABILITY=dual-read-v2-preserve\n"
    return raw.encode("ascii")


def _validate_file_image(value: Any) -> bytes:
    _keys(value, ("identity", "bytes_b64", "sha256"))
    _validate_identity(value["identity"], "file")
    raw = _b64(value["bytes_b64"])
    _hex(value["sha256"], 64)
    _require(_digest(raw) == value["sha256"], "E_BINDING")
    return raw


def _validate_link_image(value: Any) -> bytes:
    _keys(value, ("identity", "link_text_b64"))
    _validate_identity(value["identity"], "symlink")
    raw = _b64(value["link_text_b64"])
    _require(0 < len(raw) <= 4096 and b"\x00" not in raw, "E_PATH")
    return raw


def _validate_ref(value: Any) -> None:
    _keys(value, ("path", "identity"))
    _path(value["path"])
    _validate_identity(value["identity"], "directory")


def _validate_bundle(bundle: Any, *, candidate: bool) -> bool:
    _keys(bundle, SLOTS)
    legacy = False
    for slot in SLOTS:
        value = bundle[slot]
        _keys(value, ("directory", "revision", "release_txt", "release_env") if slot == "backend" else ("directory", "revision", "release_txt"))
        _validate_ref(value["directory"])
        _require(re.fullmatch(re.escape(RELEASES_ROOT) + r"/[A-Za-z0-9._-]+/" + slot, value["directory"]["path"]) is not None, "E_PATH")
        _hex(value["revision"], 40)
        _require(_validate_file_image(value["release_txt"]) == (value["revision"] + "\n").encode("ascii"), "E_ARTIFACT")
        if slot == "backend":
            raw = _validate_file_image(value["release_env"])
            legacy = raw == _release_env(value["revision"], True)
            _require(raw == _release_env(value["revision"]) or (not candidate and legacy), "E_ARTIFACT")
    _require(bundle["lingxi"]["revision"] == bundle["backend"]["revision"], "E_BINDING")
    return legacy


def _validate_record(record: Any, txn_id: str) -> None:
    _keys(record, RECORD_KEYS)
    _require(record["schema_version"] == RECORD_SCHEMA, "E_RECORD_INVALID")
    txn = record["txn"]
    _keys(txn, ("txn_id", "run_id", "run_attempt", "portal_revision", "backend_revision", "package_sha256"))
    parsed = _txn(txn_id)
    _require(all(txn[key] == value for key, value in parsed.items()), "E_BINDING")
    _hex(txn["backend_revision"], 40)
    _hex(txn["package_sha256"], 64)
    _validate_phases(record["phase"], record["canary_hashes"])
    _validate_bundle(record["candidate"], candidate=True)
    legacy = _validate_bundle(record["previous"], candidate=False)
    upload, rollback, candidate = _locations(txn_id)
    for slot in SLOTS:
        _require(record["candidate"][slot]["directory"]["path"] == candidate + "/" + slot, "E_BINDING")
        _require(record["candidate"][slot]["revision"] == txn["portal_revision" if slot == "portal" else "backend_revision"], "E_BINDING")
    for name in ("current_links", "candidate_links"):
        _keys(record[name], SLOTS)
        for slot in SLOTS:
            _validate_link_image(record[name][slot])
    if legacy:
        _require(record["previous_phase"] is None and record["previous_canary_hashes"] is None and record["phase"]["world_ledger"] == "compat", "E_FLOOR")
    else:
        _validate_phases(record["previous_phase"], record["previous_canary_hashes"])
    _keys(record["rollback_floor"], ("candidate_allowed", "auto_rollback_allowed", "reason"))
    _require(record["rollback_floor"] == {"candidate_allowed": True, "auto_rollback_allowed": not legacy,
             "reason": "legacy-two-line" if legacy else "capable-three-line"}
             and type(record["rollback_floor"]["candidate_allowed"]) is bool
             and type(record["rollback_floor"]["auto_rollback_allowed"]) is bool, "E_FLOOR")
    _require(type(record["previous_apparmor_loaded"]) is bool, "E_RECORD_INVALID")
    _require(_validate_file_image(record["preserve"]) == b"", "E_RECORD_INVALID")
    anchors = {"web_root": WEB_ROOT, "project_root": PROJECT_ROOT, "releases_root": RELEASES_ROOT,
               "staging_root": STAGING_ROOT, "upload_root": upload, "rollback_root": rollback}
    _keys(record["anchors"], anchors)
    for name, path in anchors.items():
        _validate_ref(record["anchors"][name])
        _require(record["anchors"][name]["path"] == path, "E_BINDING")
    _keys(record["control"], CONTROL)
    for value in record["control"].values():
        _keys(value, ("identity", "sha256"))
        _validate_identity(value["identity"], "file")
        _hex(value["sha256"], 64)
    _keys(record["config_backup"], CONFIG)
    for name, value in record["config_backup"].items():
        _keys(value, ("kind", "source_identity", "backup_identity", "sha256", "link_text_b64"))
        _require(value["kind"] in ("absent", "file", "symlink"), "E_RECORD_INVALID")
        if value["kind"] == "absent":
            _require(all(value[key] is None for key in value if key != "kind"), "E_RECORD_INVALID")
            _require(name not in ("world_unit", "gateway_unit", "nginx_primary_available"), "E_RECORD_INVALID")
        else:
            _validate_identity(value["source_identity"], value["kind"])
            _validate_identity(value["backup_identity"], value["kind"])
            _hex(value["sha256"], 64)
            if value["kind"] == "symlink":
                _require(name in ("nginx_primary_enabled", "nginx_secondary_enabled"), "E_PATH")
                raw = _b64(value["link_text_b64"])
                _require(bool(raw) and b"\x00" not in raw and len(raw) <= 4096 and _digest(raw) == value["sha256"], "E_BINDING")
            else:
                _require(value["link_text_b64"] is None, "E_RECORD_INVALID")
    _require(record["previous_apparmor_loaded"] == (record["config_backup"]["apparmor_profile"]["kind"] == "file"), "E_BINDING")


def _validate_proof(proof: Any, record: dict[str, Any], receipt: dict[str, Any]) -> None:
    _keys(proof, ("verifier", "final_links", "backend_revision", "phases", "canary_hashes", "unit_sha256",
                  "nginx_sha256", "apparmor_sha256", "health_sha256", "run_epoch", "traffic", "checks"), "E_RECEIPT_INVALID")
    expected_verifier = {"myweb_revision": record["txn"]["portal_revision"]}
    expected_verifier.update({key + "_sha256": value["sha256"] for key, value in record["control"].items()})
    _require(proof["verifier"] == expected_verifier, "E_BINDING")
    rollback = receipt["operation"] == "rollback"
    bundle = record["previous" if rollback else "candidate"]
    phases = record["previous_phase" if rollback else "phase"]
    hashes = record["previous_canary_hashes" if rollback else "canary_hashes"]
    _validate_phases(proof["phases"], proof["canary_hashes"])
    _require(proof["phases"] == phases and proof["canary_hashes"] == hashes
             and proof["backend_revision"] == bundle["backend"]["revision"], "E_BINDING")
    intended = receipt["restore_plan"]["replacement_links"] if rollback else record["candidate_links"]
    _keys(proof["final_links"], SLOTS, "E_RECEIPT_INVALID")
    for image in proof["final_links"].values():
        _validate_link_image(image)
    _require(_canonical(proof["final_links"]) == _canonical(intended), "E_BINDING")
    _keys(proof["unit_sha256"], ("world", "gateway"), "E_RECEIPT_INVALID")
    for value in proof["unit_sha256"].values():
        _hex(value, 64, "E_RECEIPT_INVALID")
    for key in ("nginx_sha256", "health_sha256"):
        _hex(proof[key], 64, "E_RECEIPT_INVALID")
    if proof["apparmor_sha256"] is not None:
        _hex(proof["apparmor_sha256"], 64, "E_RECEIPT_INVALID")
    _require(type(proof["run_epoch"]) is str and re.fullmatch(r"hb_[0-9a-f]{32}", proof["run_epoch"]) is not None, "E_RECEIPT_INVALID")
    _keys(proof["traffic"], ("blocked_statuses", "open_statuses", "revisions"), "E_RECEIPT_INVALID")
    _require(proof["traffic"] == {"blocked_statuses": [503, 503], "open_statuses": [200, 200, 200],
             "revisions": {slot: bundle[slot]["revision"] for slot in ("portal", "lingxi")}}, "E_BINDING")
    for key in ("blocked_statuses", "open_statuses"):
        _require(all(type(item) is int for item in proof["traffic"][key]), "E_RECEIPT_INVALID")
    _keys(proof["checks"], CHECKS, "E_RECEIPT_INVALID")
    _require(all(value is True for value in proof["checks"].values()), "E_RECEIPT_INVALID")


def _validate_prune(plan: Any, record: dict[str, Any]) -> None:
    _keys(plan, ("releases", "payloads", "temporary_links"), "E_RECEIPT_INVALID")
    for key, limit in (("releases", 4096), ("payloads", 4096), ("temporary_links", 6)):
        _require(type(plan[key]) is list and len(plan[key]) <= limit, "E_RECEIPT_INVALID")
    paths = []
    for item in plan["releases"]:
        _validate_ref(item)
        _require(re.fullmatch(re.escape(RELEASES_ROOT) + r"/release-[A-Za-z0-9._-]+", item["path"]) is not None, "E_PATH")
        paths.append(item["path"])
    _require(paths == sorted(set(paths)), "E_RECEIPT_INVALID")
    protected = {record[bundle][slot]["directory"]["path"].rsplit("/", 1)[0]
                 for bundle in ("candidate", "previous") for slot in SLOTS}
    _require(not protected.intersection(paths), "E_STATE")
    payloads = []
    for item in plan["payloads"]:
        _keys(item, ("relative_path", "identity"), "E_RECEIPT_INVALID")
        name = item["relative_path"]
        _require(type(name) is str and (name in ("portal-dist.tar.gz", "portal-dist.tar.gz.sha256", "DEPLOYED", "rollback")
                 or re.fullmatch(r"\.(?:release-transaction-state-v1\.json|previous-backend-v1\.json)\.[0-9a-f]{32}\.tmp", name)), "E_PATH")
        _validate_identity(item["identity"], "directory" if name == "rollback" else "file")
        payloads.append(name)
    _require(len(payloads) == len(set(payloads)), "E_RECEIPT_INVALID")
    combinations = []
    for item in plan["temporary_links"]:
        _keys(item, ("slot", "role", "identity"), "E_RECEIPT_INVALID")
        _require(item["slot"] in SLOTS and item["role"] in ("candidate", "restore"), "E_RECEIPT_INVALID")
        _validate_identity(item["identity"], "symlink")
        combinations.append((item["slot"], item["role"]))
    _require(len(combinations) == len(set(combinations)), "E_RECEIPT_INVALID")


def _validate_receipt(receipt: Any, record: dict[str, Any], txn_id: str) -> None:
    _keys(receipt, RECEIPT_KEYS, "E_RECEIPT_INVALID")
    _require(receipt["schema_version"] == RECEIPT_SCHEMA and receipt["txn_id"] == txn_id
             and receipt["record_sha256"] == _digest(_canonical(record)), "E_BINDING")
    phase, operation = receipt["phase"], receipt["operation"]
    _require(phase in PHASES and operation in ("deploy", "rollback"), "E_STATE")
    if operation == "rollback":
        _require(record["rollback_floor"]["auto_rollback_allowed"] is True, "E_FLOOR")
        _require(phase not in ("prepared", "deploying"), "E_STATE")
        _keys(receipt["restore_plan"], ("source_links", "replacement_links"), "E_RECEIPT_INVALID")
        for links in receipt["restore_plan"].values():
            _keys(links, SLOTS, "E_RECEIPT_INVALID")
            for link in links.values():
                _validate_link_image(link)
    else:
        _require(phase not in ("rollback-pending", "restored") and receipt["restore_plan"] is None, "E_STATE")
    if phase in ("committing",) + TERMINAL_PHASES:
        _keys(receipt["terminal"], ("outcome", "record", "proof"), "E_RECEIPT_INVALID")
        _validate_record(receipt["terminal"]["record"], txn_id)
        _require(_canonical(receipt["terminal"]["record"]) == _canonical(record)
                 and _digest(_canonical(receipt["terminal"]["record"])) == receipt["record_sha256"]
                 and receipt["terminal"]["outcome"] == ("rolled-back" if operation == "rollback" else "deployed"), "E_BINDING")
        _validate_proof(receipt["terminal"]["proof"], record, receipt)
    else:
        _require(receipt["terminal"] is None, "E_STATE")
    if phase in ("pruning", "pruned", "lease-releasing", "closed"):
        _validate_prune(receipt["prune_plan"], record)
    else:
        _require(receipt["prune_plan"] is None, "E_STATE")


def _lock(fs: _Fs, lock_fd: int) -> None:
    _require(type(lock_fd) is int and lock_fd >= 0, "E_ARGUMENT")
    try:
        actual = _identity(os.fstat(lock_fd))
        _validate_identity(actual, "file")
        _same(actual, fs.info(LOCK_PATH))
        with open(f"/proc/self/fdinfo/{lock_fd}", "r", encoding="ascii") as stream:
            lock_lines = [line for line in stream if line.startswith("lock:")]
        _require(any(re.search(r"\bFLOCK\s+ADVISORY\s+WRITE\b", line) for line in lock_lines), "E_LOCK",
                 "调用者 fd 必须已经持有独占 flock")
        with fs.parent(LOCK_PATH) as (directory_fd, name):
            probe = os.open(name, os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=directory_fd)
            try:
                try:
                    fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    # 只读检查已有锁；不通过升级共享锁制造持锁结论。
                    pass
                else:
                    fcntl.flock(probe, fcntl.LOCK_UN)
                    raise TransactionError("E_LOCK", "调用者尚未持有发布锁")
            finally:
                os.close(probe)
    except (OSError, TransactionError) as error:
        raise TransactionError("E_LOCK", "发布锁 fd 未持有或身份不匹配") from error


def _lease(fs: _Fs, txn_id: str, lease_fd: int | None, *, allow_missing: bool = False, releasing: bool = False) -> None:
    _require(lease_fd is None or (type(lease_fd) is int and lease_fd >= 0), "E_ARGUMENT")
    if lease_fd is None:
        _require(allow_missing and not fs.exists(LEASE_PATH), "E_LEASE", "缺失 lease 不适用于当前调用")
        return
    try:
        info = _identity(os.fstat(lease_fd))
        _validate_identity(info, "directory")
        _require(stat.S_IMODE(info["mode"]) == 0o700, "E_LEASE")
        _same(info, fs.info(LEASE_PATH))
        if releasing and not fs.exists(LEASE_PATH + "/owner"):
            with fs.directory(LEASE_PATH) as directory_fd:
                _require(os.listdir(directory_fd) == [], "E_LEASE")
            return
        raw, identity = fs.read(LEASE_PATH + "/owner")
        _require(stat.S_IMODE(identity["mode"]) == 0o600, "E_LEASE")
        txn = _txn(txn_id)
        _require(raw == (txn["run_id"] + "-" + txn["run_attempt"] + "\n").encode("ascii"), "E_LEASE")
    except (OSError, TransactionError) as error:
        raise TransactionError("E_LEASE", "lease fd、权限或 owner 绑定不匹配") from error


def _link_target(fs: _Fs, path: str, image: dict[str, Any]) -> str:
    raw = _validate_link_image(image)
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeError as error:
        raise TransactionError("E_PATH") from error
    combined = text if text.startswith("/") else path.rsplit("/", 1)[0] + "/" + text
    # 不先规范化 ..；逐组件打开证明路径，禁止用词法折叠跳过 symlink 检查。
    parts = combined.split("/")[1:]
    components: list[str] = []
    for part in parts:
        _require(part != "", "E_PATH")
        if part == ".":
            continue
        if part == "..":
            _require(bool(components), "E_PATH")
            components.pop()
        else:
            components.append(part)
        with fs.directory("/" + "/".join(components) if components else "/"):
            pass
    target = "/" + "/".join(components)
    _path(target)
    return target


def _temporary_link(txn_id: str, slot: str, role: str) -> str:
    parent, name = CURRENT[slot].rsplit("/", 1)
    return f"{parent}/.{name}.{txn_id}.{role}"


def _snapshot_bundle(fs: _Fs, paths: dict[str, str]) -> dict[str, Any]:
    bundle = {}
    for slot, path in paths.items():
        with fs.directory(path) as fd:
            directory = {"path": path, "identity": _identity(os.fstat(fd))}
            raw, identity = fs.read_at(fd, "release.txt")
            _require(re.fullmatch(rb"[0-9a-f]{40}\n", raw) is not None, "E_ARTIFACT")
            release_txt = {"identity": identity, "bytes_b64": base64.b64encode(raw).decode("ascii"), "sha256": _digest(raw)}
            value = {"directory": directory, "revision": raw[:-1].decode("ascii"), "release_txt": release_txt}
            if slot == "backend":
                raw, identity = fs.read_at(fd, ".release.env")
                value["release_env"] = {"identity": identity, "bytes_b64": base64.b64encode(raw).decode("ascii"), "sha256": _digest(raw)}
            _same(_identity(os.fstat(fd)), directory["identity"])
            _same(fs.ref(path)["identity"], directory["identity"])
        bundle[slot] = value
    return bundle


def _verify_bundle(fs: _Fs, bundle: dict[str, Any]) -> None:
    current = _snapshot_bundle(fs, {slot: value["directory"]["path"] for slot, value in bundle.items()})
    _require(current == bundle, "E_DRIFT")


def _control_sources() -> dict[str, bytes]:
    # 执行入口必须来自独立核验的制品；从当前代码所在目录取三文件做交叉绑定。
    # 绝不把记录中自称的 hash 当作加载待恢复代码的授权。
    root = os.path.dirname(os.path.abspath(__file__))
    result = {}
    with _Fs() as fs:
        for key, name in CONTROL.items():
            result[key] = fs.read(root + "/" + name)[0]
    return result


class _Transaction:
    def __init__(self, fs: _Fs, txn_id: str, lock_fd: int) -> None:
        self.fs, self.txn_id, self.lock_fd = fs, txn_id, lock_fd
        self.upload, self.rollback, self.candidate_path = _locations(txn_id)
        self.record_path = self.rollback + "/" + RECORD_NAME
        self.receipt_path = self.upload + "/" + RECEIPT_NAME
        _lock(fs, lock_fd)

    def load(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, int]]:
        try:
            raw, identity = self.fs.read(self.receipt_path)
        except FileNotFoundError as error:
            raise TransactionError("E_RECEIPT_MISSING") from error
        receipt = _decode_json(raw, 4 * 1024 * 1024, "E_RECEIPT_INVALID")
        _require(stat.S_IMODE(identity["mode"]) == 0o600, "E_RECEIPT_INVALID")
        _keys(receipt, RECEIPT_KEYS, "E_RECEIPT_INVALID")
        try:
            raw_record, record_identity = self.fs.read(self.record_path, 1024 * 1024)
            _require(stat.S_IMODE(record_identity["mode"]) == 0o600, "E_RECORD_INVALID")
            record = _decode_json(raw_record, 1024 * 1024, "E_RECORD_INVALID")
        except FileNotFoundError as error:
            _require(receipt["phase"] in TERMINAL_PHASES and type(receipt["terminal"]) is dict
                     and "record" in receipt["terminal"], "E_RECORD_MISSING")
            record = receipt["terminal"]["record"]
        _validate_record(record, self.txn_id)
        _validate_receipt(receipt, record, self.txn_id)
        self.verify_control(record, historical=receipt["phase"] == "closed")
        if receipt["phase"] != "closed":
            self.verify_anchors(record, rollback_optional=receipt["phase"] in ("pruning", "pruned", "lease-releasing"))
        preserve = self.upload + "/PRESERVE"
        if receipt["phase"] not in TERMINAL_PHASES:
            _require(self.fs.file_image(preserve) == record["preserve"], "E_DRIFT", "PRESERVE 身份或字节发生漂移")
        elif self.fs.exists(preserve):
            _require(self.fs.file_image(preserve) == record["preserve"], "E_DRIFT")
        return record, receipt, identity

    def verify_control(self, record: dict[str, Any], *, historical: bool = False) -> None:
        sources = None if historical else _control_sources()
        control_path = self.upload + "/control"
        _require(stat.S_IMODE(self.fs.ref(control_path)["identity"]["mode"]) == 0o700, "E_IDENTITY")
        for key, filename in CONTROL.items():
            raw, identity = self.fs.read(control_path + "/" + filename)
            _same(identity, record["control"][key]["identity"])
            _require(_digest(raw) == record["control"][key]["sha256"] and (sources is None or raw == sources[key]), "E_BINDING", "控制材料与独立受信制品不一致")

    def verify_anchors(self, record: dict[str, Any], *, rollback_optional: bool = False) -> None:
        for name, ref in record["anchors"].items():
            if name == "rollback_root" and rollback_optional and not self.fs.exists(ref["path"]):
                continue
            _same(self.fs.ref(ref["path"])["identity"], ref["identity"], directory_children=True)

    def publish(self, record: dict[str, Any], receipt: dict[str, Any], identity: dict[str, int] | None) -> dict[str, int]:
        _validate_receipt(receipt, record, self.txn_id)
        raw = _canonical(receipt)
        _require(len(raw) <= 4 * 1024 * 1024, "E_RECEIPT_INVALID")
        self.fs.write(self.receipt_path, raw, expected=identity)
        return self.fs.info(self.receipt_path)

    def advance(self, record: dict[str, Any], old: dict[str, Any], identity: dict[str, int], phase: str,
                *, restore_plan: Any = None, terminal: Any = None, prune_plan: Any = None) -> tuple[dict[str, Any], dict[str, int]]:
        transitions = {"prepared": ("deploying", "rollback-pending"), "deploying": ("rollback-pending", "exposing"),
                       "rollback-pending": ("restored",), "restored": ("exposing",), "exposing": ("committing",),
                       "committing": ("terminal",), **dict(zip(TERMINAL_PHASES[:-1], ((value,) for value in TERMINAL_PHASES[1:])))}
        _require(phase in transitions.get(old["phase"], ()), "E_STATE")
        updated = copy.deepcopy(old)
        updated["phase"] = phase
        if phase == "rollback-pending":
            updated["operation"], updated["restore_plan"] = "rollback", restore_plan
        if phase == "committing":
            updated["terminal"] = terminal
        if phase == "pruning":
            updated["prune_plan"] = prune_plan
        return updated, self.publish(record, updated, identity)

    def barrier(self, receipt: dict[str, Any]) -> None:
        self.fs.sync_file(self.receipt_path)
        if self.fs.exists(self.record_path):
            self.fs.sync_file(self.record_path)
        self.fs.sync(self.upload)

    def result(self, record: dict[str, Any], receipt: dict[str, Any]) -> dict[str, Any]:
        return {"txn_id": self.txn_id, "record_sha256": _digest(_canonical(record)), "receipt_sha256": _digest(_canonical(receipt))}


def _command(arguments: list[str], *, timeout: int = 30, env: dict[str, str] | None = None) -> bytes:
    try:
        if env is None:
            env = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8", "HOME": "/root"}
        result = subprocess.run(arguments, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=timeout, env=env)
        return result.stdout
    except (OSError, subprocess.SubprocessError) as error:
        raise TransactionError("E_SERVICES", "受控命令执行未通过") from error


def _http(url: str, *, method: str = "GET", data: bytes | None = None,
          headers: dict[str, str] | None = None) -> tuple[int, bytes, dict[str, str]]:
    request = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        response = urllib.request.urlopen(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    except (OSError, urllib.error.URLError) as error:
        raise TransactionError("E_GATES", "网络健康门未通过") from error
    with response:
        raw = response.read(4 * 1024 * 1024 + 1)
        _require(len(raw) <= 4 * 1024 * 1024, "E_GATES")
        return response.status, raw, {key.lower(): value for key, value in response.headers.items()}


def _load_health_validator() -> Any:
    import importlib.util

    path = os.path.dirname(os.path.abspath(__file__)) + "/validate_release_health.py"
    spec = importlib.util.spec_from_file_location("_myweb_trusted_health", path)
    _require(spec is not None and spec.loader is not None, "E_BINDING")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _health_object(raw: bytes) -> dict[str, Any]:
    try:
        value = json.loads(raw, object_pairs_hook=_pairs)
        _require(type(value) is dict, "E_GATES")
        return value
    except (ValueError, TypeError, RecursionError, TransactionError) as error:
        raise TransactionError("E_GATES", "健康响应 JSON 不是合法对象") from error


def _health(revision: str, phases: dict[str, str] | None, hashes: list[str] | None) -> tuple[dict[str, Any], str | None]:
    status, raw, _ = _http("http://127.0.0.1:8000/api/health")
    _require(status == 200, "E_GATES")
    try:
        data = _health_object(raw)
        validator = _load_health_validator()
        if phases is None:
            validator.validate_payload(data, "rollback", revision)
            epoch = None
        else:
            epoch = validator.validate_transaction_payload(data, revision, phases, hashes)
        return data, epoch
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        raise TransactionError("E_GATES", "健康响应未通过完整契约") from error


def _unit_phases(fs: _Fs) -> tuple[dict[str, str], list[str]]:
    names = {"LINGXI_PERSONA_SCHEMA_PHASE": "persona_schema", "LINGXI_PERSONA_GROWTH_PHASE": "persona_growth",
             "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": "world_ledger"}
    configurations = []
    for unit in ("myagent-world.service", "myagent-gateway.service"):
        _require(_command(["systemctl", "show", unit, "-p", "DropInPaths", "--value"]).strip() == b"", "E_PHASE")
        files = shlex.split(_command(["systemctl", "show", unit, "-p", "EnvironmentFiles", "--value"]).decode("utf-8"))
        _require(len(files) % 2 == 0, "E_PHASE")
        environment_files = [(PROJECT_ROOT + "/.env", True)]
        for index in range(0, len(files), 2):
            _require(files[index + 1] in ("(ignore_errors=yes)", "(ignore_errors=no)"), "E_PHASE")
            environment_files.append((files[index], files[index + 1] == "(ignore_errors=yes)"))
        reserved = (*names, "LINGXI_PERSONA_GROWTH_CANARY_HASHES", "BRAIN_RELEASE_SHA",
                    "LINGXI_PERSONA_SCHEMA_CAPABILITY", "LINGXI_WORLD_LEDGER_SCHEMA_CAPABILITY")
        for path, optional in environment_files:
            _path(path)
            if path == PROJECT_ROOT + "/backend-current/.release.env":
                target = _link_target(fs, CURRENT["backend"], fs.link(CURRENT["backend"]))
                raw_release, _ = fs.read(target + "/.release.env")
                _require(raw_release == _release_env(fs.read(target + "/release.txt")[0][:-1].decode("ascii")), "E_PHASE")
                continue
            if optional and not fs.exists(path):
                continue
            environment_raw, _ = fs.read(path)
            for line in environment_raw.decode("utf-8").splitlines():
                match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
                _require(match is None or match[1] not in reserved, "E_PHASE", "后加载环境文件定义了发布保留键")
        raw, _ = fs.read("/etc/systemd/system/" + unit)
        entries = shlex.split(_command(["systemctl", "show", unit, "-p", "Environment", "--value"]).decode("utf-8"))
        environment: dict[str, str] = {}
        for entry in entries:
            key, separator, value = entry.partition("=")
            _require(bool(separator) and key not in environment, "E_PHASE")
            environment[key] = value
        phases = {value: environment.get(key) for key, value in names.items()}
        hashes_text = environment.get("LINGXI_PERSONA_GROWTH_CANARY_HASHES")
        _require(type(hashes_text) is str, "E_PHASE")
        hashes = hashes_text.split(",") if hashes_text else []
        _validate_phases(phases, hashes)
        for key in (*names, "LINGXI_PERSONA_GROWTH_CANARY_HASHES"):
            line = ("Environment=" + key + "=" + environment[key]).encode("utf-8")
            _require(raw.splitlines().count(line) == 1, "E_PHASE", "实际 unit 与加载环境不一致")
        configurations.append((phases, hashes))
    _require(configurations[0] == configurations[1], "E_PHASE", "两个 unit 的 phase 不一致")
    return configurations[0]


def _apparmor_loaded() -> bool:
    # 内核虚拟文件只作为服务边界读取，不作为受信发布制品。
    with open("/sys/kernel/security/apparmor/profiles", "rb") as stream:
        lines = stream.read().splitlines()
    matches = [line for line in lines if line.startswith(b"myagent-persona-parser (")]
    _require(not matches or matches == [b"myagent-persona-parser (enforce)"], "E_GATES")
    return bool(matches)


def _snapshot_config(transaction: _Transaction) -> dict[str, Any]:
    fs = transaction.fs
    for directory in ("systemd", "nginx-available", "nginx-enabled", "apparmor"):
        fs.mkdir(transaction.rollback + "/" + directory)
    result = {}
    for key, (source, relative) in CONFIG.items():
        backup = transaction.rollback + "/" + relative
        value = {"kind": "absent", "source_identity": None, "backup_identity": None, "sha256": None, "link_text_b64": None}
        if fs.exists(source):
            identity = fs.info(source)
            if stat.S_ISLNK(identity["mode"]):
                _require(key in ("nginx_primary_enabled", "nginx_secondary_enabled"), "E_PATH")
                link = fs.link(source)
                raw = _validate_link_image(link)
                # enabled 链接仅能指向同一组受管 available 普通文件。
                target = raw.decode("utf-8", errors="strict")
                allowed = [entry[0] for name, entry in CONFIG.items() if name.endswith("_available")]
                combined = target if target.startswith("/") else source.rsplit("/", 1)[0] + "/" + target
                parent_text, final_name = combined.rsplit("/", 1)
                # 前缀逐组件解析，末项再按普通文件 no-follow 打开。
                prefix_image = {"identity": link["identity"], "link_text_b64": base64.b64encode(parent_text.encode("utf-8")).decode("ascii")}
                resolved_parent = _link_target(fs, source, prefix_image)
                _require(final_name not in ("", ".", ".."), "E_PATH")
                resolved = resolved_parent + "/" + final_name
                _require(resolved in allowed, "E_PATH")
                fs.read(resolved)
                image = fs.symlink(backup, raw)
                value.update(kind="symlink", source_identity=identity, backup_identity=image["identity"],
                             sha256=_digest(raw), link_text_b64=link["link_text_b64"])
            else:
                raw, identity = fs.read(source)
                fs.write(backup, raw)
                copied, copied_identity = fs.read(backup)
                _require(copied == raw and fs.read(source) == (raw, identity), "E_DRIFT")
                value.update(kind="file", source_identity=identity, backup_identity=copied_identity, sha256=_digest(raw))
        result[key] = value
    return result


def _verify_backups(transaction: _Transaction, record: dict[str, Any], *, sources: bool = False) -> None:
    for key, value in record["config_backup"].items():
        source, relative = CONFIG[key]
        path = transaction.rollback + "/" + relative
        if value["kind"] == "absent":
            _require(not transaction.fs.exists(path), "E_DRIFT")
            if sources:
                _require(not transaction.fs.exists(source), "E_DRIFT")
            continue
        if value["kind"] == "file":
            raw, identity = transaction.fs.read(path)
        else:
            image = transaction.fs.link(path)
            raw, identity = _validate_link_image(image), image["identity"]
        _same(identity, value["backup_identity"])
        _require(_digest(raw) == value["sha256"], "E_DRIFT")
        if sources:
            _same(transaction.fs.info(source), value["source_identity"])
            current = transaction.fs.read(source)[0] if value["kind"] == "file" else _validate_link_image(transaction.fs.link(source))
            _require(_digest(current) == value["sha256"], "E_DRIFT")


def capture_previous(*, txn_id: str, candidate_revision: str, package_sha256: str, phases: dict[str, str],
                     canary_hashes: list[str], lock_fd: int, lease_fd: int) -> dict[str, Any]:
    _txn(txn_id)
    _hex(candidate_revision, 40, "E_ARGUMENT")
    _hex(package_sha256, 64, "E_ARGUMENT")
    _validate_phases(phases, canary_hashes)
    try:
        with _Fs() as fs:
            transaction = _Transaction(fs, txn_id, lock_fd)
            _lease(fs, txn_id, lease_fd)
            _require(not fs.exists(transaction.record_path) and not fs.exists(transaction.receipt_path), "E_STATE", "事务不允许重复捕获")
            _require(not fs.exists(MAINTENANCE_PATH) and not fs.exists(PRESERVE_PATH), "E_STATE")
            fs.sync(STAGING_ROOT)
            preserve = fs.file_image(transaction.upload + "/PRESERVE")
            _require(_validate_file_image(preserve) == b"", "E_IDENTITY")
            fs.sync_file(transaction.upload + "/PRESERVE")
            fs.sync(transaction.upload)
            current_links = {slot: fs.link(path) for slot, path in CURRENT.items()}
            previous = _snapshot_bundle(fs, {slot: _link_target(fs, CURRENT[slot], current_links[slot]) for slot in SLOTS})
            candidate = _snapshot_bundle(fs, {slot: transaction.candidate_path + "/" + slot for slot in SLOTS})
            _validate_bundle(candidate, candidate=True)
            legacy = _validate_bundle(previous, candidate=False)
            _require(candidate["backend"]["revision"] == candidate_revision, "E_BINDING")
            _require(not legacy or phases["world_ledger"] == "compat", "E_FLOOR")
            previous_phases, previous_hashes = (None, None) if legacy else _unit_phases(fs)
            _health(previous["backend"]["revision"], previous_phases, previous_hashes)
            loaded = _apparmor_loaded()
            fs.mkdir(transaction.rollback)
            backup = _snapshot_config(transaction)
            control_path = transaction.upload + "/control"
            fs.mkdir(control_path)
            control = {}
            for key, raw in _control_sources().items():
                path = control_path + "/" + CONTROL[key]
                fs.write(path, raw)
                control[key] = {"identity": fs.info(path), "sha256": _digest(raw)}
            links = {slot: fs.symlink(_temporary_link(txn_id, slot, "candidate"),
                                     candidate[slot]["directory"]["path"].encode("ascii")) for slot in SLOTS}
            anchors = {"web_root": WEB_ROOT, "project_root": PROJECT_ROOT, "releases_root": RELEASES_ROOT,
                       "staging_root": STAGING_ROOT, "upload_root": transaction.upload, "rollback_root": transaction.rollback}
            txn = _txn(txn_id)
            txn.update(backend_revision=candidate_revision, package_sha256=package_sha256)
            record = {"schema_version": RECORD_SCHEMA, "txn": txn, "phase": phases, "canary_hashes": canary_hashes,
                      "previous_phase": previous_phases, "previous_canary_hashes": previous_hashes,
                      "candidate": candidate, "previous": previous, "current_links": current_links, "candidate_links": links,
                      "config_backup": backup, "previous_apparmor_loaded": loaded, "preserve": preserve,
                      "anchors": {key: fs.ref(path) for key, path in anchors.items()}, "control": control,
                      "rollback_floor": {"candidate_allowed": True, "auto_rollback_allowed": not legacy,
                                         "reason": "legacy-two-line" if legacy else "capable-three-line"}}
            _validate_record(record, txn_id)
            _verify_bundle(fs, previous)
            _verify_bundle(fs, candidate)
            _verify_backups(transaction, record, sources=True)
            _require(all(fs.link(CURRENT[slot]) == current_links[slot] for slot in SLOTS), "E_DRIFT")
            raw_record = _canonical(record)
            _require(len(raw_record) <= 1024 * 1024, "E_RECORD_INVALID")
            fs.write(transaction.record_path, raw_record)
            fs.sync(transaction.rollback)
            fs.sync(transaction.upload)
            receipt = {"schema_version": RECEIPT_SCHEMA, "txn_id": txn_id, "record_sha256": _digest(raw_record),
                       "phase": "prepared", "operation": "deploy", "restore_plan": None, "prune_plan": None, "terminal": None}
            transaction.publish(record, receipt, None)
            return {**transaction.result(record, receipt), "auto_rollback_allowed": not legacy}
    except OSError as error:
        raise TransactionError("E_DURABILITY", "捕获或持久化未完成，保留现场") from error


def _verify_intended_links(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any], *, complete: bool = False) -> None:
    rollback = receipt["operation"] == "rollback"
    for slot in SLOTS:
        actual = transaction.fs.link(CURRENT[slot])
        if rollback:
            choices = [receipt["restore_plan"]["replacement_links"][slot]]
            if not complete:
                choices.append(receipt["restore_plan"]["source_links"][slot])
        else:
            choices = [record["candidate_links"][slot]]
            if not complete:
                choices.append(record["current_links"][slot])
        _require(actual in choices, "E_DRIFT")
        target = _link_target(transaction.fs, CURRENT[slot], actual)
        allowed = {record[bundle][slot]["directory"]["path"] for bundle in ("candidate", "previous")}
        _require(target in allowed, "E_BINDING")


def _pre_exposing_consistent(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any]) -> bool:
    phase = receipt["phase"]
    _require(phase in PRE_EXPOSING, "E_STATE")
    fs = transaction.fs
    current = {slot: fs.link(path) for slot, path in CURRENT.items()}
    if phase == "prepared":
        if current != record["current_links"]:
            return False
        _verify_backups(transaction, record, sources=True)
    elif phase != "deploying" or current != record["current_links"]:
        if not fs.exists(MAINTENANCE_PATH) or fs.read(MAINTENANCE_PATH)[0] != b"":
            return False
    # 发布 intent 之前留下的固定 restore 链接只能在真实目标与前像相符时重新绑定。
    if phase in ("prepared", "deploying"):
        for slot in SLOTS:
            path = _temporary_link(transaction.txn_id, slot, "restore")
            if fs.exists(path) and _link_target(fs, path, fs.link(path)) != record["previous"][slot]["directory"]["path"]:
                return False
    return True


def verify_previous(*, txn_id: str, purpose: str, lock_fd: int, lease_fd: int | None) -> dict[str, Any]:
    _txn(txn_id)
    _require(purpose in ("before-mutation", "rollback", "recovery"), "E_ARGUMENT")
    _require(lease_fd is None or (type(lease_fd) is int and lease_fd >= 0), "E_ARGUMENT")
    try:
        with _Fs() as fs:
            transaction = _Transaction(fs, txn_id, lock_fd)
            record, receipt, identity = transaction.load()
            phase = receipt["phase"]
            # closed 不碰新 lease/current；只验证它自身保留的终态材料。
            if phase != "closed":
                _lease(fs, txn_id, lease_fd, allow_missing=purpose == "recovery", releasing=phase == "lease-releasing")
            auto = record["rollback_floor"]["auto_rollback_allowed"]
            outcome = receipt["terminal"]["outcome"] if phase in TERMINAL_PHASES else None
            if purpose == "before-mutation":
                _require(phase == "prepared", "E_STATE")
                _verify_bundle(fs, record["previous"])
                _verify_bundle(fs, record["candidate"])
                _verify_backups(transaction, record, sources=True)
                _require(all(fs.link(CURRENT[slot]) == record["current_links"][slot] for slot in SLOTS), "E_DRIFT")
                receipt, _ = transaction.advance(record, receipt, identity, "deploying")
                action = "begin-deploy"
            elif purpose == "rollback":
                _require(auto, "E_FLOOR")
                _require(phase in PRE_EXPOSING, "E_STATE")
                _verify_bundle(fs, record["previous"])
                _verify_backups(transaction, record)
                _verify_intended_links(transaction, record, receipt)
                _require(_pre_exposing_consistent(transaction, record, receipt), "E_STATE")
                action = "resume-rollback"
            elif phase == "closed":
                action = "none"
            elif phase == "lease-releasing":
                action = "finish-lease"
            elif phase in TERMINAL_PHASES:
                action = "resume-cleanup"
            elif not auto:
                action = "manual-recovery"
            elif phase in ("exposing", "committing"):
                _verify_bundle(fs, record["previous" if receipt["operation"] == "rollback" else "candidate"])
                _verify_intended_links(transaction, record, receipt, complete=True)
                action = "revalidate-commit"
            else:
                _verify_bundle(fs, record["previous"])
                _verify_backups(transaction, record)
                _verify_intended_links(transaction, record, receipt)
                action = "resume-rollback" if _pre_exposing_consistent(transaction, record, receipt) else "manual-recovery"
            return {**transaction.result(record, receipt), "phase": receipt["phase"], "action": action,
                    "auto_rollback_allowed": auto, "outcome": outcome}
    except OSError as error:
        raise TransactionError("E_IO", "只读复验无法完成") from error


def _services_stopped() -> None:
    for unit in ("myagent-world.service", "myagent-gateway.service"):
        state = _command(["systemctl", "show", unit, "-p", "ActiveState", "--value"]).strip()
        _require(state in (b"inactive", b"failed"), "E_SERVICES", "不能确认两个服务均已停止")


def _replace_link(transaction: _Transaction, path: str, source: str, current: dict[str, Any], replacement: dict[str, Any]) -> None:
    fs = transaction.fs
    if fs.link(path) == replacement:
        return
    _require(fs.link(path) == current and fs.link(source) == replacement, "E_DRIFT")
    with fs.parent(path) as (destination_fd, destination_name), fs.parent(source) as (source_fd, source_name):
        _same(_identity(os.stat(destination_name, dir_fd=destination_fd, follow_symlinks=False)), current["identity"])
        _same(_identity(os.stat(source_name, dir_fd=source_fd, follow_symlinks=False)), replacement["identity"])
        os.rename(source_name, destination_name, src_dir_fd=source_fd, dst_dir_fd=destination_fd)
        os.fsync(destination_fd)
    _require(fs.link(path) == replacement, "E_DRIFT")


def _restore_config(transaction: _Transaction, record: dict[str, Any]) -> None:
    fs = transaction.fs
    _verify_backups(transaction, record)
    for key, value in record["config_backup"].items():
        destination, relative = CONFIG[key]
        exists = fs.exists(destination)
        expected = fs.info(destination) if exists else None
        if exists:
            _validate_identity(expected, "symlink" if stat.S_ISLNK(expected["mode"]) else "file")
        if value["kind"] == "file":
            raw, _ = fs.read(transaction.rollback + "/" + relative)
            _require(_digest(raw) == value["sha256"], "E_DRIFT")
            fs.write(destination, raw, expected=expected, mode=stat.S_IMODE(value["source_identity"]["mode"]))
        else:
            if exists:
                fs.remove(destination, expected)
            if value["kind"] == "symlink":
                fs.symlink(destination, _b64(value["link_text_b64"]))
    if record["previous_apparmor_loaded"]:
        _command(["apparmor_parser", "--replace", "--skip-cache", "--base", "/etc/apparmor.d", CONFIG["apparmor_profile"][0]])
    elif _apparmor_loaded():
        source = record["candidate"]["backend"]["directory"]["path"] + "/ops/apparmor/myagent-persona-parser"
        _command(["apparmor_parser", "--remove", "--skip-cache", "--base", "/etc/apparmor.d", source])
    _require(_apparmor_loaded() == record["previous_apparmor_loaded"], "E_GATES")
    _command(["systemctl", "daemon-reload"])


def restore_previous(*, txn_id: str, lock_fd: int, lease_fd: int) -> dict[str, Any]:
    _txn(txn_id)
    try:
        with _Fs() as fs:
            transaction = _Transaction(fs, txn_id, lock_fd)
            record, receipt, identity = transaction.load()
            _lease(fs, txn_id, lease_fd)
            _require(record["rollback_floor"]["auto_rollback_allowed"], "E_FLOOR")
            _require(receipt["phase"] in PRE_EXPOSING, "E_STATE")
            _services_stopped()
            transaction.barrier(receipt)
            _verify_bundle(fs, record["previous"])
            _verify_backups(transaction, record)
            _verify_intended_links(transaction, record, receipt)
            _require(_pre_exposing_consistent(transaction, record, receipt), "E_STATE")
            if receipt["phase"] in ("prepared", "deploying"):
                source_links = {slot: fs.link(CURRENT[slot]) for slot in SLOTS}
                replacements = {}
                for slot in SLOTS:
                    path = _temporary_link(txn_id, slot, "restore")
                    target = record["previous"][slot]["directory"]["path"]
                    if fs.exists(path):
                        image = fs.link(path)
                        _require(_link_target(fs, path, image) == target, "E_DRIFT")
                        fs.sync(path.rsplit("/", 1)[0])
                    else:
                        image = fs.symlink(path, target.encode("ascii"))
                    replacements[slot] = image
                receipt, identity = transaction.advance(record, receipt, identity, "rollback-pending",
                                                        restore_plan={"source_links": source_links, "replacement_links": replacements})
            for slot in SLOTS:
                _replace_link(transaction, CURRENT[slot], _temporary_link(txn_id, slot, "restore"),
                              receipt["restore_plan"]["source_links"][slot], receipt["restore_plan"]["replacement_links"][slot])
            _verify_bundle(fs, record["previous"])
            _verify_intended_links(transaction, record, receipt, complete=True)
            _restore_config(transaction, record)
            if receipt["phase"] == "rollback-pending":
                receipt, _ = transaction.advance(record, receipt, identity, "restored")
            return {**transaction.result(record, receipt), "phase": "restored", "restored_links": receipt["restore_plan"]["replacement_links"]}
    except OSError as error:
        raise TransactionError("E_IO", "恢复未完成，保留现场") from error


def _isolate(fs: _Fs, *, stop: bool = True) -> None:
    try:
        if fs.exists(MAINTENANCE_PATH):
            raw, _ = fs.read(MAINTENANCE_PATH)
            _require(raw == b"", "E_IDENTITY")
            fs.sync_file(MAINTENANCE_PATH)
        else:
            fs.write(MAINTENANCE_PATH, b"", mode=0o644)
    finally:
        # 标记不可写时仍须尝试停服务，不能让一个隔离故障阻止另一条隔离路径。
        if stop:
            _command(["systemctl", "stop", "myagent-gateway.service", "myagent-world.service"])
            _services_stopped()


def _isolate_if_uncommitted(transaction: _Transaction) -> None:
    try:
        _, persisted, _ = transaction.load()
        if persisted["phase"] in TERMINAL_PHASES:
            # terminal rename 可能已经成功；只读复验后保留业务结果，后续仅续清理。
            return
    except (OSError, TransactionError):
        pass
    _isolate(transaction.fs)


def _watch_heartbeat(transaction: _Transaction, backend: dict[str, Any], epoch: str) -> str:
    hours, interval, timeout = _observation_policy()
    _require(all(type(value) in (int, float) and math.isfinite(value) and value > 0
                 for value in (hours, interval, timeout)), "E_ARGUMENT")
    output = transaction.rollback + "/.p6-heartbeat-watch." + secrets.token_hex(16) + ".jsonl"
    backend_path = backend["directory"]["path"]
    watcher = backend_path + "/scripts/p6_heartbeat_watch.py"
    transaction.fs.read(watcher)
    raw = _command([backend_path + "/.venv/bin/python", "-I", "-B", watcher,
                    "--gateway", "http://127.0.0.1:8000", "--hours", str(hours), "--interval", str(interval),
                    "--timeout", str(timeout), "--expected-revision", backend["revision"], "--output", output],
                   timeout=math.ceil(hours * 3600 + timeout + 30))
    try:
        summary = json.loads(raw, object_pairs_hook=_pairs)
        _keys(summary, ("schema_version", "requested_duration_s", "interval_s", "duration_s", "minimum_samples", "total",
                        "failures", "pass", "output", "expected_revision", "run_epoch", "first_completed_fires",
                        "last_completed_fires", "freshness_failure", "output_synced"), "E_GATES")
        _require(summary["schema_version"] == "p6-heartbeat-watch-summary-v2" and summary["pass"] is True
                 and summary["output_synced"] is True and summary["output"] == output
                 and summary["expected_revision"] == backend["revision"] and summary["run_epoch"] == epoch
                 and summary["freshness_failure"] is None, "E_GATES")
        for key in ("minimum_samples", "total", "failures", "first_completed_fires", "last_completed_fires"):
            _uint(summary[key], "E_GATES")
        for key in ("requested_duration_s", "interval_s", "duration_s"):
            _require(type(summary[key]) in (int, float) and math.isfinite(summary[key]) and summary[key] > 0, "E_GATES")
        minimum = max(2, math.ceil(hours * 3600 / interval) + 1)
        _require(summary["requested_duration_s"] == hours * 3600 and summary["interval_s"] == interval
                 and summary["duration_s"] >= hours * 3600 and summary["minimum_samples"] == minimum
                 and summary["total"] >= minimum and summary["failures"] == 0
                 and summary["last_completed_fires"] > summary["first_completed_fires"], "E_GATES")
        samples, _ = transaction.fs.read(output, 64 * 1024 * 1024)
        _require(len(samples.splitlines()) == summary["total"], "E_GATES")
        transaction.fs.sync_file(output)
        return epoch
    except (ValueError, TypeError, KeyError) as error:
        raise TransactionError("E_GATES", "P6 watcher 汇总未通过精确绑定") from error


BACKEND_READ_GATES = r'''
import os
import sqlite3
import sys
from contextlib import closing
sys.path.insert(0, sys.argv[1])
from brain.persona.schema_phase import (
    GROWTH_PHASE_ACTIVE, GROWTH_PHASE_CANARY, growth_canary_hashes,
    growth_canary_subject, persona_growth_applies_for, persona_growth_phase,
)
phase = persona_growth_phase()
hashes = growth_canary_hashes()
if phase == GROWTH_PHASE_CANARY:
    assert hashes == {growth_canary_subject("p6_e2e_cn")}
    assert persona_growth_applies_for("p6_e2e_cn")
    assert not persona_growth_applies_for("p6_e2e_control")
elif phase == GROWTH_PHASE_ACTIVE:
    assert not hashes
    assert persona_growth_applies_for("p6_e2e_cn")
    assert persona_growth_applies_for("p6_e2e_control")
path = "/opt/myagent/data/users/p6_e2e_cn/conversation.sqlite3"
with closing(sqlite3.connect("file:" + path + "?mode=ro", uri=True)) as connection:
    version = connection.execute("PRAGMA user_version").fetchone()[0]
    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    columns = {row[1] for row in connection.execute("PRAGMA table_info(conversation_events)")}
assert version == 3 if os.environ["LINGXI_PERSONA_SCHEMA_PHASE"] == "active" else version in {2, 3}
assert {"persona_evidence", "persona_growth_state"} <= tables
assert "persona_hash" in columns
'''


def _backend_read_gates(backend: dict[str, Any], phases: dict[str, str], hashes: list[str]) -> None:
    # 只运行现有合成账号的结构与路由断言，不读取或输出会话内容。
    path = backend["directory"]["path"]
    environment = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "HOME": "/root",
                   "LINGXI_PERSONA_SCHEMA_PHASE": phases["persona_schema"], "LINGXI_PERSONA_GROWTH_PHASE": phases["persona_growth"],
                   "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": phases["world_ledger"], "LINGXI_PERSONA_GROWTH_CANARY_HASHES": ",".join(hashes)}
    _command([path + "/.venv/bin/python", "-I", "-B", "-c", BACKEND_READ_GATES, path], env=environment)


def _maintained_gates(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any], *, observe: bool = True) -> dict[str, Any]:
    fs = transaction.fs
    rollback = receipt["operation"] == "rollback"
    bundle = record["previous" if rollback else "candidate"]
    phases = record["previous_phase" if rollback else "phase"]
    hashes = record["previous_canary_hashes" if rollback else "canary_hashes"]
    _require(fs.read(MAINTENANCE_PATH)[0] == b"", "E_GATES")
    _verify_bundle(fs, bundle)
    _verify_intended_links(transaction, record, receipt, complete=True)
    for unit in ("myagent-world.service", "myagent-gateway.service"):
        _command(["systemctl", "is-active", "--quiet", unit])
        _command(["systemctl", "is-enabled", "--quiet", unit])
    _require(_unit_phases(fs) == (phases, hashes), "E_PHASE")
    _command(["nginx", "-t"])
    nginx = _command(["nginx", "-T"])
    guard = b"if (-f /run/myagent-release-maintenance) { return 503; }"
    _require(nginx.count(guard) >= 3, "E_GATES", "Nginx 维护守卫缺失")
    for expected in (b"root /opt/hi-veblen/portal-current;", b"root /opt/hi-veblen/lingxi-current;",
                     b"proxy_pass http://127.0.0.1:3001;", b"proxy_pass http://127.0.0.1:8000;"):
        _require(expected in nginx, "E_GATES")
    _require(nginx.count(b"location ^~ /assets/") >= 2 and nginx.count(b"location = /release.txt") >= 2, "E_GATES")
    blocked = []
    for token in ("release-preflight-invalid", "local-dev-token"):
        status, _, _ = _http("https://lingxi.hi-veblen.com/api/session", method="POST",
                              data=json.dumps({"token": token}).encode("ascii"), headers={"Content-Type": "application/json"})
        _require(status == 503, "E_GATES")
        if not blocked:
            blocked.append(status)
    status, _, _ = _http("https://lingxi.hi-veblen.com/ws/release-maintenance-probe")
    _require(status == 503, "E_GATES")
    blocked.append(status)
    for token in ("release-preflight-invalid", "local-dev-token"):
        status, _, _ = _http("http://127.0.0.1:8000/api/session", method="POST",
                              data=json.dumps({"token": token}).encode("ascii"), headers={"Content-Type": "application/json"})
        _require(status == 401, "E_GATES")
    profile = CONFIG["apparmor_profile"][0]
    source = bundle["backend"]["directory"]["path"] + "/ops/apparmor/myagent-persona-parser"
    profile_hash = None
    if fs.exists(source):
        expected_raw, _ = fs.read(source)
        raw, identity = fs.read(profile)
        _require(raw == expected_raw and stat.S_IMODE(identity["mode"]) == 0o644 and _apparmor_loaded(), "E_GATES")
        profile_hash = _digest(raw)
    else:
        _require(bundle["backend"]["revision"] == "55255df61ae6aef89ce5d8e4d46ba637ca3cd632"
                 and not fs.exists(profile) and not _apparmor_loaded(), "E_GATES")
    with open("/proc/sys/kernel/apparmor_restrict_unprivileged_userns", "rb") as stream:
        _require(stream.read() == b"1\n", "E_GATES")
    data, epoch = _health(bundle["backend"]["revision"], phases, hashes)
    if observe:
        _backend_read_gates(bundle["backend"], phases, hashes)
    # 完整观察由受信 watcher 实际执行；此处不接受调用者提供的 summary/pass。
    result = {"nginx_sha256": _digest(nginx), "apparmor_sha256": profile_hash, "health_sha256": _digest(_canonical(data)),
              "run_epoch": epoch, "blocked_statuses": blocked,
              "unit_sha256": {key: _digest(fs.read(CONFIG[key + "_unit"][0])[0]) for key in ("world", "gateway")}}
    if observe:
        observed_epoch = _watch_heartbeat(transaction, bundle["backend"], epoch)
        _require(observed_epoch == epoch, "E_GATES")
        repeated = _maintained_gates(transaction, record, receipt, observe=False)
        _require(all(repeated[key] == result[key] for key in ("nginx_sha256", "apparmor_sha256", "unit_sha256", "run_epoch")), "E_DRIFT")
        return repeated
    return result


def _verify_configuration_proof(transaction: _Transaction, maintained: dict[str, Any]) -> None:
    _command(["nginx", "-t"])
    _require(_digest(_command(["nginx", "-T"])) == maintained["nginx_sha256"], "E_DRIFT")
    profile = CONFIG["apparmor_profile"][0]
    if maintained["apparmor_sha256"] is None:
        _require(not transaction.fs.exists(profile) and not _apparmor_loaded(), "E_DRIFT")
    else:
        raw, identity = transaction.fs.read(profile)
        _require(_digest(raw) == maintained["apparmor_sha256"] and stat.S_IMODE(identity["mode"]) == 0o644
                 and _apparmor_loaded(), "E_DRIFT")
    with open("/proc/sys/kernel/apparmor_restrict_unprivileged_userns", "rb") as stream:
        _require(stream.read() == b"1\n", "E_GATES")


def _public_gates(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any], epoch: str) -> dict[str, Any]:
    bundle = record["previous" if receipt["operation"] == "rollback" else "candidate"]
    phases = record["previous_phase" if receipt["operation"] == "rollback" else "phase"]
    hashes = record["previous_canary_hashes" if receipt["operation"] == "rollback" else "canary_hashes"]
    statuses, revisions = [], {}
    for slot, base in (("portal", "https://hi-veblen.com"), ("lingxi", "https://lingxi.hi-veblen.com")):
        status, raw, headers = _http(base + "/")
        _require(status == 200 and (b'id="app"' if slot == "portal" else b'id="root"') in raw, "E_GATES")
        statuses.append(status)
        _require(headers.get("x-frame-options", "").lower() == "deny", "E_GATES")
        _require(re.search(r"[0-9]+(?:\.[0-9]+)+", headers.get("server", "")) is None, "E_GATES")
        if slot == "lingxi":
            csp = headers.get("content-security-policy", "").lower()
            _require(re.search(r"(?:^|;)\s*frame-ancestors\s+'none'(?:\s*;|\s*$)", csp) is not None
                     and re.search(r"(?:^|;)\s*script-src\s+'self'(?:\s|;|$)", csp) is not None, "E_GATES")
        assets = sorted(set(re.findall(rb'/assets/[^"\s<>]+\.(?:js|css)', raw)))
        _require(bool(assets), "E_GATES")
        for asset_bytes in assets:
            asset = asset_bytes.decode("ascii")
            _path(asset)
            transaction.fs.read(bundle[slot]["directory"]["path"] + asset, 32 * 1024 * 1024)
            asset_status, _, asset_headers = _http(base + asset, method="HEAD")
            mime = asset_headers.get("content-type", "").lower()
            _require(asset_status == 200 and (mime.startswith("text/css") if asset.endswith(".css") else
                     re.match(r"(?:application|text)/(?:javascript|x-javascript)", mime) is not None), "E_GATES")
        _require(_http(base + "/assets/release-missing-" + record["txn"]["portal_revision"] + ".js")[0] == 404, "E_GATES")
        status, raw, _ = _http(base + "/release.txt")
        _require(status == 200 and raw == (bundle[slot]["revision"] + "\n").encode("ascii"), "E_GATES")
        revisions[slot] = raw[:-1].decode("ascii")
    status, raw, _ = _http("https://hi-veblen.com/api/health")
    portal_health = _health_object(raw)
    _require(status == 200 and type(portal_health) is dict and portal_health.get("status") == "ok", "E_GATES")
    status, raw, _ = _http("https://hi-veblen.com/api/auth/profile", headers={"Authorization": "Bearer nginx-forwarding-probe"})
    auth = _health_object(raw)
    _require(status == 401 and type(auth) is dict and type(auth.get("code")) is int and auth["code"] == 401
             and type(auth.get("details")) is dict and auth["details"].get("reason") == "token_malformed", "E_GATES")
    status, raw, _ = _http("https://lingxi.hi-veblen.com/api/health")
    _require(status == 200, "E_GATES")
    data = _health_object(raw)
    actual_epoch = _load_health_validator().validate_transaction_payload(data, bundle["backend"]["revision"], phases, hashes)
    _require(actual_epoch == epoch, "E_GATES", "撤维护后 heartbeat epoch 变化")
    statuses.append(status)
    return {"open_statuses": statuses, "revisions": revisions, "health_sha256": _digest(_canonical(data))}


def _prune_plan(transaction: _Transaction, record: dict[str, Any]) -> dict[str, Any]:
    fs = transaction.fs
    protected = {record[bundle][slot]["directory"]["path"].rsplit("/", 1)[0]
                 for bundle in ("candidate", "previous") for slot in SLOTS}
    for slot, path in CURRENT.items():
        target = _link_target(fs, path, fs.link(path))
        _require(re.fullmatch(re.escape(RELEASES_ROOT) + r"/[A-Za-z0-9._-]+/" + slot, target) is not None, "E_PATH")
        protected.add(target.rsplit("/", 1)[0])
    candidates = []
    with fs.directory(RELEASES_ROOT) as fd:
        for name in os.listdir(fd):
            if not name.startswith("release-"):
                continue
            _require(re.fullmatch(r"release-[A-Za-z0-9._-]+", name) is not None, "E_PATH")
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            _validate_identity(_identity(info), "directory")
            path = RELEASES_ROOT + "/" + name
            _require(not fs.exists(path + "/PRESERVE"), "E_STATE")
            candidates.append((info.st_mtime_ns, path, _identity(info)))
    candidates.sort(reverse=True)
    protected.update(path for _, path, _ in candidates[:5])
    releases = sorted(({"path": path, "identity": identity} for _, path, identity in candidates if path not in protected), key=lambda value: value["path"])
    payloads = []
    with fs.directory(transaction.upload) as fd:
        for name in sorted(os.listdir(fd)):
            if name in ("portal-dist.tar.gz", "portal-dist.tar.gz.sha256", "DEPLOYED", "rollback") or re.fullmatch(
                    r"\.release-transaction-state-v1\.json\.[0-9a-f]{32}\.tmp", name):
                identity = fs.info(transaction.upload + "/" + name)
                _validate_identity(identity, "directory" if name == "rollback" else "file")
                payloads.append({"relative_path": name, "identity": identity})
            else:
                _require(name in ("control", RECEIPT_NAME), "E_STATE", "run 目录出现未知材料，拒绝猜测清理")
    links = []
    for slot in SLOTS:
        for role in ("candidate", "restore"):
            path = _temporary_link(transaction.txn_id, slot, role)
            if fs.exists(path):
                links.append({"slot": slot, "role": role, "identity": fs.link(path)["identity"]})
    plan = {"releases": releases, "payloads": payloads, "temporary_links": links}
    _validate_prune(plan, record)
    return plan


def _remove_tree(fs: _Fs, path: str, identity: dict[str, int]) -> None:
    _same(fs.ref(path)["identity"], identity, directory_children=True)
    with fs.directory(path) as fd:
        device = os.fstat(fd).st_dev
        for name in os.listdir(fd):
            child = _identity(os.stat(name, dir_fd=fd, follow_symlinks=False))
            _require(child["device"] == device, "E_PATH", "拒绝跨文件系统递归删除")
            kind = "directory" if stat.S_ISDIR(child["mode"]) else "symlink" if stat.S_ISLNK(child["mode"]) else "file"
            _validate_identity(child, kind)
            child_path = path + "/" + name
            if kind == "directory":
                _remove_tree(fs, child_path, child)
            else:
                _same(_identity(os.stat(name, dir_fd=fd, follow_symlinks=False)), child)
                os.unlink(name, dir_fd=fd)
                os.fsync(fd)
        os.fsync(fd)
    fs.remove(path, identity, directory=True)


def _execute_prune(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any]) -> None:
    fs = transaction.fs
    plan = receipt["prune_plan"]
    _validate_prune(plan, record)
    _require(not fs.exists(MAINTENANCE_PATH) and not fs.exists(PRESERVE_PATH), "E_STATE", "全局保护现场禁止清理")
    protected = {_link_target(fs, path, fs.link(path)).rsplit("/", 1)[0] for path in CURRENT.values()}
    _require(not any(ref["path"] in protected for ref in plan["releases"]), "E_STATE", "计划与实际 current 保护冲突")
    for ref in plan["releases"]:
        if fs.exists(ref["path"]):
            _require(not fs.exists(ref["path"] + "/PRESERVE"), "E_STATE")
            _remove_tree(fs, ref["path"], ref["identity"])
    for item in plan["payloads"]:
        path = transaction.upload + "/" + item["relative_path"]
        if fs.exists(path):
            if item["relative_path"] == "rollback":
                _remove_tree(fs, path, item["identity"])
            else:
                fs.remove(path, item["identity"])
    for item in plan["temporary_links"]:
        path = _temporary_link(transaction.txn_id, item["slot"], item["role"])
        if fs.exists(path):
            fs.remove(path, item["identity"])
    fs.sync(RELEASES_ROOT)
    fs.sync(transaction.upload)


def _cleanup(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any], identity: dict[str, int],
             lease_fd: int | None) -> dict[str, Any]:
    fs = transaction.fs
    _require(receipt["phase"] in TERMINAL_PHASES, "E_STATE")
    if receipt["phase"] == "closed":
        return receipt
    transaction.barrier(receipt)
    try:
        if receipt["phase"] == "terminal":
            if fs.exists(transaction.record_path):
                raw, record_identity = fs.read(transaction.record_path, 1024 * 1024)
                _require(raw == _canonical(record), "E_BINDING")
                fs.remove(transaction.record_path, record_identity)
            fs.sync(transaction.rollback)
            receipt, identity = transaction.advance(record, receipt, identity, "record-removed")
        if receipt["phase"] == "record-removed":
            preserve = transaction.upload + "/PRESERVE"
            if fs.exists(preserve):
                _require(fs.file_image(preserve) == record["preserve"], "E_DRIFT")
                fs.remove(preserve, record["preserve"]["identity"])
            fs.sync(transaction.upload)
            receipt, identity = transaction.advance(record, receipt, identity, "preserve-removed")
        if receipt["phase"] == "preserve-removed":
            _lease(fs, transaction.txn_id, lease_fd)
            receipt, identity = transaction.advance(record, receipt, identity, "pruning", prune_plan=_prune_plan(transaction, record))
        if receipt["phase"] == "pruning":
            _lease(fs, transaction.txn_id, lease_fd)
            _execute_prune(transaction, record, receipt)
            receipt, identity = transaction.advance(record, receipt, identity, "pruned")
        if receipt["phase"] == "pruned":
            receipt, identity = transaction.advance(record, receipt, identity, "lease-releasing")
    except (OSError, TransactionError) as error:
        raise TransactionError("E_CLEANUP_PENDING", "可信业务终态已保留，清理尚未完成") from error
    try:
        if fs.exists(LEASE_PATH):
            lease_identity = fs.ref(LEASE_PATH)["identity"]
            owner_path = LEASE_PATH + "/owner"
            if fs.exists(owner_path):
                _lease(fs, transaction.txn_id, lease_fd)
                _, owner_identity = fs.read(owner_path)
                fs.remove(owner_path, owner_identity)
            with fs.directory(LEASE_PATH) as fd:
                _require(os.listdir(fd) == [], "E_LEASE")
                os.fsync(fd)
            fs.remove(LEASE_PATH, lease_identity, directory=True)
        fs.sync("/run")
        receipt, identity = transaction.advance(record, receipt, identity, "closed")
        return receipt
    except (OSError, TransactionError) as error:
        raise TransactionError("E_LEASE_PENDING", "清理完成，lease 释放结果待确认") from error


def finalize_transaction(*, txn_id: str, lock_fd: int, lease_fd: int | None) -> dict[str, Any]:
    _txn(txn_id)
    _require(lease_fd is None or (type(lease_fd) is int and lease_fd >= 0), "E_ARGUMENT")
    with _Fs() as fs:
        transaction = _Transaction(fs, txn_id, lock_fd)
        record, receipt, identity = transaction.load()
        phase = receipt["phase"]
        if phase != "closed":
            _lease(fs, txn_id, lease_fd, allow_missing=phase == "lease-releasing", releasing=phase == "lease-releasing")
        if phase in TERMINAL_PHASES:
            receipt = _cleanup(transaction, record, receipt, identity, lease_fd)
        else:
            _require(phase in ("deploying", "restored", "exposing", "committing"), "E_STATE")
            # 旧两行仅原首次 finalize 可正常推进；中断后的回调不得拿它自动恢复。
            _require(phase in ("deploying", "restored") or record["rollback_floor"]["auto_rollback_allowed"], "E_FLOOR")
            try:
                transaction.barrier(receipt)
                if phase in ("exposing", "committing"):
                    _isolate(fs, stop=False)
                maintained = _maintained_gates(transaction, record, receipt)
            except (OSError, TransactionError, ValueError) as error:
                if phase in ("exposing", "committing"):
                    _isolate_if_uncommitted(transaction)
                raise TransactionError("E_GATES", "维护态门失败，保留恢复材料") from error
            try:
                if phase in ("deploying", "restored"):
                    receipt, identity = transaction.advance(record, receipt, identity, "exposing")
                # 原子发布和目录 fsync 全部返回之后才允许第一个正常流量副作用。
                fs.remove(MAINTENANCE_PATH, fs.info(MAINTENANCE_PATH))
                opened = _public_gates(transaction, record, receipt, maintained["run_epoch"])
                _verify_bundle(fs, record["previous" if receipt["operation"] == "rollback" else "candidate"])
                _verify_intended_links(transaction, record, receipt, complete=True)
                _require(_unit_phases(fs) == (record["previous_phase" if receipt["operation"] == "rollback" else "phase"],
                                             record["previous_canary_hashes" if receipt["operation"] == "rollback" else "canary_hashes"]), "E_PHASE")
                _require(all(_digest(fs.read(CONFIG[key + "_unit"][0])[0]) == maintained["unit_sha256"][key]
                             for key in ("world", "gateway")), "E_DRIFT")
                transaction.verify_control(record)
                _verify_configuration_proof(transaction, maintained)
                bundle = record["previous" if receipt["operation"] == "rollback" else "candidate"]
                proof = {"verifier": {"myweb_revision": record["txn"]["portal_revision"], **{
                             key + "_sha256": value["sha256"] for key, value in record["control"].items()}},
                         "final_links": {slot: fs.link(path) for slot, path in CURRENT.items()},
                         "backend_revision": bundle["backend"]["revision"],
                         "phases": record["previous_phase" if receipt["operation"] == "rollback" else "phase"],
                         "canary_hashes": record["previous_canary_hashes" if receipt["operation"] == "rollback" else "canary_hashes"],
                         "unit_sha256": maintained["unit_sha256"], "nginx_sha256": maintained["nginx_sha256"],
                         "apparmor_sha256": maintained["apparmor_sha256"], "health_sha256": opened["health_sha256"],
                         "run_epoch": maintained["run_epoch"], "traffic": {"blocked_statuses": maintained["blocked_statuses"],
                             "open_statuses": opened["open_statuses"], "revisions": opened["revisions"]},
                         "checks": {key: True for key in CHECKS}}
                terminal = {"outcome": "rolled-back" if receipt["operation"] == "rollback" else "deployed", "record": record, "proof": proof}
                if receipt["phase"] == "exposing":
                    receipt, identity = transaction.advance(record, receipt, identity, "committing", terminal=terminal)
                else:
                    # 待确认 proof 可重采，但必须保留同 txn/record/operation/outcome。
                    updated = copy.deepcopy(receipt)
                    updated["terminal"] = terminal
                    identity = transaction.publish(record, updated, identity)
                    receipt = updated
                receipt, identity = transaction.advance(record, receipt, identity, "terminal")
            except (OSError, TransactionError, ValueError) as error:
                # 不凭内存 phase 推断刚才 rename 的结果；驱动下一步必须持锁复读正式回执。
                try:
                    _isolate_if_uncommitted(transaction)
                except (OSError, TransactionError):
                    pass
                raise TransactionError("E_COMMIT_UNCERTAIN", "exposing 或后继提交结果待确认，禁止通用 EXIT 回滚") from error
            receipt = _cleanup(transaction, record, receipt, identity, lease_fd)
        return {**transaction.result(record, receipt), "outcome": receipt["terminal"]["outcome"], "phase": "closed"}


def _check_history(fs: _Fs, lock_fd: int, *, exclude: str | None = None) -> None:
    if not fs.exists(STAGING_ROOT):
        return
    excluded = _locations(exclude)[0] if exclude is not None else None
    with fs.directory(STAGING_ROOT) as fd:
        for name in sorted(os.listdir(fd)):
            _require(re.fullmatch(r"run-[1-9][0-9]*-[1-9][0-9]*", name) is not None, "E_STATE", "未知 staging 现场需要人工处理")
            path = STAGING_ROOT + "/" + name
            if path == excluded:
                continue
            _validate_identity(fs.ref(path)["identity"], "directory")
            try:
                raw, _ = fs.read(path + "/" + RECEIPT_NAME)
            except FileNotFoundError as error:
                raise TransactionError("E_RECEIPT_MISSING", "历史 run 缺失回执，阻止新发布") from error
            receipt = _decode_json(raw, 4 * 1024 * 1024, "E_RECEIPT_INVALID")
            _keys(receipt, RECEIPT_KEYS, "E_RECEIPT_INVALID")
            _require(_locations(receipt["txn_id"])[0] == path, "E_BINDING")
            transaction = _Transaction(fs, receipt["txn_id"], lock_fd)
            _, verified, _ = transaction.load()
            _require(verified["phase"] == "closed", "E_STATE", "旧发布尚未完整关闭，阻止新事务")


def _candidate_mutation(txn_id: str, lock_fd: int, lease_fd: int) -> None:
    with _Fs() as fs:
        transaction = _Transaction(fs, txn_id, lock_fd)
        record, receipt, _ = transaction.load()
        _lease(fs, txn_id, lease_fd)
        _require(receipt["phase"] == "deploying", "E_STATE")
        transaction.barrier(receipt)
        _verify_bundle(fs, record["candidate"])
        _verify_bundle(fs, record["previous"])
        _verify_backups(transaction, record, sources=True)
        primary, _ = CONFIG["nginx_primary_available"]
        raw, _ = fs.read(transaction.candidate_path + "/backend/ops/nginx/hi-veblen.com.http.conf")
        fs.write(primary, raw, expected=fs.info(primary), mode=0o644)
        enabled, _ = CONFIG["nginx_primary_enabled"]
        if fs.exists(enabled):
            fs.remove(enabled, fs.info(enabled))
        fs.symlink(enabled, primary.encode("ascii"))
        secondary, _ = CONFIG["nginx_secondary_enabled"]
        if fs.exists(secondary):
            fs.remove(secondary, fs.info(secondary))
        _command(["nginx", "-t"])
        _require(_command(["nginx", "-T"]).count(b"if (-f /run/myagent-release-maintenance) { return 503; }") >= 3, "E_GATES")
        _command(["systemctl", "reload", "nginx"])
        _isolate(fs, stop=False)
        _require(_http("https://lingxi.hi-veblen.com/api/session", method="POST", data=b'{"token":"release-preflight-invalid"}',
                       headers={"Content-Type": "application/json"})[0] == 503, "E_GATES")
        _require(_http("https://lingxi.hi-veblen.com/ws/release-maintenance-probe")[0] == 503, "E_GATES")
        _command(["systemctl", "stop", "myagent-gateway.service", "myagent-world.service"])
        _services_stopped()
        for slot in SLOTS:
            _replace_link(transaction, CURRENT[slot], _temporary_link(txn_id, slot, "candidate"),
                          record["current_links"][slot], record["candidate_links"][slot])
        _verify_intended_links(transaction, record, receipt, complete=True)
        phases = record["phase"]
        env = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8", "HOME": "/root", "RELEASE_TRANSACTION": "1",
               "REVISION": record["txn"]["backend_revision"], "PROJECT_DIR": PROJECT_ROOT, "BACKEND_DIR": transaction.candidate_path + "/backend",
               "LINGXI_PERSONA_SCHEMA_PHASE": phases["persona_schema"], "LINGXI_PERSONA_GROWTH_PHASE": phases["persona_growth"],
               "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": phases["world_ledger"], "LINGXI_PERSONA_GROWTH_CANARY_HASHES": ",".join(record["canary_hashes"])}
        _command(["bash", transaction.candidate_path + "/backend/scripts/install_linux_services.sh"], timeout=2100, env=env)


@contextmanager
def _entry_lock() -> Iterator[tuple[_Fs, int]]:
    with _Fs() as fs:
        with fs.parent(LOCK_PATH) as (directory_fd, name):
            try:
                lock_fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC,
                                  0o600, dir_fd=directory_fd)
            except FileExistsError:
                lock_fd = os.open(name, os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=directory_fd)
        try:
            _validate_identity(_identity(os.fstat(lock_fd)), "file")
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise TransactionError("E_LOCK", "已有发布事务持锁") from error
            _lock(fs, lock_fd)
            os.fsync(lock_fd)
            fs.sync("/run")
            yield fs, lock_fd
        finally:
            os.close(lock_fd)


def _open_lease(fs: _Fs) -> int | None:
    if not fs.exists(LEASE_PATH):
        return None
    with fs.directory(LEASE_PATH) as fd:
        return os.dup(fd)


def _resume(txn_id: str, fs: _Fs, lock_fd: int, *, cleanup_only: bool = False) -> dict[str, Any]:
    lease_fd = _open_lease(fs)
    business_unfinished = False
    try:
        if lease_fd is not None:
            # 先单独确认同事务 owner；随后材料损坏也必须阻断本事务的 writer。
            try:
                _lease(fs, txn_id, lease_fd)
                business_unfinished = True
            except TransactionError:
                pass
        transaction = _Transaction(fs, txn_id, lock_fd)
        _, persisted, _ = transaction.load()
        if persisted["phase"] != "closed":
            _lease(fs, txn_id, lease_fd, allow_missing=True, releasing=persisted["phase"] == "lease-releasing")
        business_unfinished = persisted["phase"] not in TERMINAL_PHASES
        state = verify_previous(txn_id=txn_id, purpose="recovery", lock_fd=lock_fd, lease_fd=lease_fd)
        action = state["action"]
        if action == "none":
            return state
        if cleanup_only:
            _require(action in ("resume-cleanup", "finish-lease"), "E_STATE", "清理入口不得执行业务恢复")
        if action == "manual-recovery":
            _isolate(fs)
            raise TransactionError("E_STATE", "HOLD：需要人工恢复，已保留现场")
        if action in ("resume-rollback", "revalidate-commit"):
            # 已冻结门缺失时先隔离并停止，不能带着默认观察预算继续切换。
            _isolate(fs, stop=action == "resume-rollback")
            _observation_policy()
        if lease_fd is None and action != "finish-lease":
            # /run 重建只续接经过完整只读分类的同一事务，绝不按 PID/时间抢占。
            fs.mkdir(LEASE_PATH)
            txn = _txn(txn_id)
            fs.write(LEASE_PATH + "/owner", (txn["run_id"] + "-" + txn["run_attempt"] + "\n").encode("ascii"))
            fs.sync(LEASE_PATH)
            fs.sync("/run")
            lease_fd = _open_lease(fs)
        if action == "resume-rollback":
            restore_previous(txn_id=txn_id, lock_fd=lock_fd, lease_fd=lease_fd)
            _command(["nginx", "-t"])
            _command(["systemctl", "reload", "nginx"])
            _command(["systemctl", "restart", "myagent-world.service", "myagent-gateway.service"])
        return finalize_transaction(txn_id=txn_id, lock_fd=lock_fd, lease_fd=lease_fd)
    except (OSError, TransactionError):
        if business_unfinished and not cleanup_only:
            try:
                _isolate_if_uncommitted(_Transaction(fs, txn_id, lock_fd))
            except (OSError, TransactionError):
                pass
        raise
    finally:
        if lease_fd is not None:
            os.close(lease_fd)


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="MyWeb 受信发布事务；路径固定派生")
    subparsers = parser.add_subparsers(dest="operation", required=True)
    subparsers.add_parser("policy")
    subparsers.add_parser("history")
    for operation in ("recover", "cleanup"):
        subparsers.add_parser(operation).add_argument("txn_id")
    deploy = subparsers.add_parser("deploy")
    for name in ("txn_id", "candidate_revision", "package_sha256", "persona_schema", "persona_growth", "world_ledger", "canary_hashes"):
        deploy.add_argument(name)
    args = parser.parse_args(argv)
    try:
        if args.operation in ("policy", "deploy"):
            _observation_policy()
        if args.operation == "policy":
            return 0
        with _entry_lock() as (fs, lock_fd):
            if args.operation == "history":
                _check_history(fs, lock_fd)
                return 0
            _txn(args.txn_id)
            if args.operation in ("recover", "cleanup"):
                result = _resume(args.txn_id, fs, lock_fd, cleanup_only=args.operation == "cleanup")
            else:
                phases = {name: getattr(args, name) for name in ("persona_schema", "persona_growth", "world_ledger")}
                hashes = [] if args.canary_hashes == "-" else args.canary_hashes.split(",")
                _validate_phases(phases, hashes)
                _check_history(fs, lock_fd, exclude=args.txn_id)
                lease_fd = _open_lease(fs)
                _require(lease_fd is not None, "E_LEASE")
                try:
                    capture_previous(txn_id=args.txn_id, candidate_revision=args.candidate_revision, package_sha256=args.package_sha256,
                                     phases=phases, canary_hashes=hashes, lock_fd=lock_fd, lease_fd=lease_fd)
                    try:
                        verify_previous(txn_id=args.txn_id, purpose="before-mutation", lock_fd=lock_fd, lease_fd=lease_fd)
                        _candidate_mutation(args.txn_id, lock_fd, lease_fd)
                        result = finalize_transaction(txn_id=args.txn_id, lock_fd=lock_fd, lease_fd=lease_fd)
                    except (OSError, TransactionError):
                        _resume(args.txn_id, fs, lock_fd)
                        raise
                finally:
                    os.close(lease_fd)
            print(_canonical(result).decode("ascii"), end="")
        return 0
    except TransactionError as error:
        print(str(error), file=sys.stderr)
        return 1
    except (OSError, ValueError, TypeError, KeyError) as error:
        print("E_IO: 事务未完成，必须持锁复读；保留现场", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
