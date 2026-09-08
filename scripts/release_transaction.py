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
import signal
import stat
import subprocess
import sys
import threading
import time
import types
import urllib.error
import urllib.request
from contextlib import contextmanager
from typing import Any, Callable, Iterator

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


# 此状态只属于当前控制器；watcher 动态模块重新加载也不能复活旧观察。
_P1_GENERATION = object()
# 调用范围捕获此身份；取消/HOLD事件不能被close异常覆盖成普通业务失败。
_P1_CLEANUP_EVENT = object()
_P1_EPOCHS: dict[str, str] = {}
_P1_STARTS: dict[str, str | None] = {}
_P1_INSTANCES: dict[str, dict[str, Any]] = {}


def _observation_policy() -> tuple[float, float, float]:
    # D084/P1 的确定性实现不等于 pin、作业容量及真实发布门已完成。
    raise TransactionError("E_GATES", "HOLD：P1 真实环境及完整发布集成门尚未通过")


class TransactionError(RuntimeError):
    """仅暴露固定错误码，不把配置、响应或凭据写入诊断。"""

    def __init__(self, code: str, message: str = "发布事务校验失败") -> None:
        self.code = code
        super().__init__(f"{code}: {message}")


# BEGIN D087 RESOURCE COMPONENT
# workflow 从本维护源按固定依赖生成前导；CI 校验真实生成结果。
import posixpath
import tarfile
import zlib
from typing import BinaryIO, Mapping, NamedTuple, Sequence


_BC_LIMITS = types.MappingProxyType({
    "metadata": 65536, "compressed": 2147483648, "tar": 8589934592,
    "venv": 8589934592, "members": 100000, "file": 1073741824,
    "path": 4096, "depth": 64, "scan": 536870912,
})
_BC_CHUNK = 65536
# 固定工作区覆盖 zlib 窗口、输入/输出及尾部复制、TarInfo、短读拼接和有界扩展解析。
_BC_ARCHIVE_WORK = 2 * 1024 * 1024
_BC_TREE_WORK = 131072


class _BCResourceError(TransactionError):
    def __init__(self, resource: str, limit: int, observed: int) -> None:
        if resource not in _BC_LIMITS or type(limit) is not int or type(observed) is not int:
            raise TransactionError("E_RESOURCE")
        self._resource, self._limit, self._observed = resource, limit, observed
        super().__init__("E_RESOURCE", "资源限额校验失败，保留现场")

    resource = property(lambda self: self._resource)
    limit = property(lambda self: self._limit)
    observed = property(lambda self: self._observed)


class _BCBudget:
    """先记账再构造；每个字典槽预付 1024 字节，涵盖键和值及扩容旧副本。"""
    def __init__(self, *, limits: Mapping[str, int] | None = None) -> None:
        _require(sys.implementation.name == "cpython" and sys.maxsize == (1 << 63) - 1,
                 "E_PLATFORM", "扫描表计费需要 64 位 CPython")
        values = dict(_BC_LIMITS)
        if limits is not None:
            for key, value in limits.items():
                _require(key in values and type(value) is int and 0 < value <= values[key], "E_RESOURCE")
                values[key] = value
        self.limits = types.MappingProxyType(values)
        self._counts: dict[tuple[str, str | None], int] = {}
        self._reservations: dict[int, int] = {}
        self._failed = False
        self._serial = 0
        self.live = 0
        self.peak = 0
        self.reserve_scan(4096)  # 预算对象、固定域表、计数表初始容量及固定标量。

    def _check(self, resource: str, value: int) -> None:
        if self._failed:
            raise TransactionError("E_RESOURCE", "资源预算已失败")
        if resource not in self.limits or type(value) is not int or value < 0:
            self._failed = True
            raise TransactionError("E_RESOURCE")
        if value > min(self.limits[resource], MAX_UINT):
            self._failed = True
            raise _BCResourceError(resource, self.limits[resource], value)

    def _reject(self) -> None:
        self._failed = True
        raise TransactionError("E_RESOURCE", "资源输入或预算状态不合法")

    def _scope(self) -> str:
        self._check("scan", self.live)
        self._serial += 1
        return str(self._serial)

    def add(self, resource: str, amount: int, *, scope: str | None = None) -> None:
        if resource == "scan" and scope is None:
            self.reserve_scan(amount)
            return
        self._check(resource, 0)
        if type(amount) is not int or amount < 0 or (scope is not None and
                (type(scope) is not str or len(scope) > 64)):
            self._failed = True
            raise TransactionError("E_RESOURCE")
        key = (resource, scope)
        value = self._counts.get(key, 0) + amount
        self._check(resource, value)
        if key not in self._counts:
            self.reserve_scan(1024)
        self._counts[key] = value

    def reserve_scan(self, amount: int) -> None:
        if type(amount) is not int or amount < 0:
            self._failed = True
            raise TransactionError("E_RESOURCE")
        # 预留账本的每种槽位也先收费；保留空槽，释放不会隐去字典历史扩容容量。
        bookkeeping = 1024 if amount not in self._reservations else 0
        self._check("scan", self.live + amount + bookkeeping)
        self.live += amount + bookkeeping
        self._reservations[amount] = self._reservations.get(amount, 0) + 1
        self.peak = max(self.peak, self.live)

    def release_scan(self, amount: int) -> None:
        if type(amount) is not int or amount < 0 or self._reservations.get(amount, 0) <= 0:
            self._failed = True
            raise TransactionError("E_RESOURCE")
        self.live -= amount
        self._reservations[amount] -= 1

    def _transient(self, action: Callable[[], None]) -> None:
        """只回收不返回对象的资格验证工作区，保留既有对象和全部永久账本。"""
        self._check("scan", self.live)
        scratch = 4096 + 128 * (len(self._reservations) + 1)
        self.reserve_scan(scratch)
        saved = dict(self._reservations)
        initial_live, initial_slots, initial_counts = self.live, len(saved), len(self._counts)
        failure = None
        try:
            result = action()
            if result is not None:
                # 未承接的返回值可能仍被外部持有，禁止按临时结果回收。
                self._failed = True
                raise RuntimeError("资格验证不得返回保留对象")
        except TransactionError as error:
            # 只保留标量，不保留异常及其 traceback 中的归档/索引对象。
            failure = (error.code, error.resource, error.limit, error.observed) if isinstance(error, _BCResourceError) else (error.code,)
        except BaseException:
            self._failed = True
            raise
        # except 绑定及其 traceback 已离开作用域；临时函数栈与结果此时均已释放。
        new_counts = len(self._counts) - initial_counts
        new_slots = len(self._reservations) - initial_slots
        for amount in self._reservations:
            self._reservations[amount] = saved.get(amount, 0)
        if new_counts:
            self._reservations[1024] += new_counts
        self.live = initial_live + 1024 * (new_counts + new_slots)
        saved.clear()
        self.release_scan(scratch)
        if failure is not None:
            if len(failure) == 4:
                raise _BCResourceError(failure[1], failure[2], failure[3]) from None
            raise TransactionError(failure[0], "资格或资源校验失败，保留现场") from None


def _bc_path(raw: str, *, budget: _BCBudget) -> tuple[str, int, int]:
    _require(type(raw) is str, "E_PATH")
    # 原输入上界独立于规范名；编码、split 前先防止任意大输入分配。
    if len(raw) > 16384:
        budget._check("path", len(raw))
    _require(raw and not raw.startswith("/"), "E_PATH")
    begin = 2 if raw.startswith("./") else 0
    _require(begin < len(raw), "E_PATH")
    root = len(raw) - begin == 1 and raw[begin] == "."
    size, depth, component_start = 0, 0 if root else 1, begin
    # 编码、复制规范名及 split 之前先逐字符计数；即使原名含数千组件也无列表。
    for index in range(begin, len(raw)):
        value = ord(raw[index])
        _require(value not in (0, 92) and not 0xD800 <= value <= 0xDFFF, "E_PATH")
        size += 1 if value < 0x80 else 2 if value < 0x800 else 3 if value < 0x10000 else 4
        budget._check("path", size)
        if value == 47:
            length = index - component_start
            _require(length > 0 and not (length <= 2 and raw[component_start:index] in (".", "..")), "E_PATH")
            depth += 1
            budget._check("depth", depth)
            component_start = index + 1
    length = len(raw) - component_start
    _require(length > 0 and (root or not (length <= 2 and raw[component_start:] in (".", ".."))), "E_PATH")
    budget._check("depth", depth)
    return raw[begin:] if begin else raw, size, depth


def _bc_validate_metadata(raw: bytes, *, budget: _BCBudget | None = None) -> int:
    budget = budget if budget is not None else _BCBudget()
    if type(raw) is not bytes:
        budget._reject()
    budget.add("metadata", len(raw), scope=budget._scope())
    return len(raw)


class _BCArchiveEntry(NamedTuple):
    path: str
    kind: str
    logical_size: int
    sha256: str
    link_text: str


class _BCArchiveResult(NamedTuple):
    compressed_bytes: int
    tar_bytes: int
    members: int
    regular_bytes: int
    compressed_sha256: str
    entries: tuple[_BCArchiveEntry, ...]
    scan_bytes: int


class _BCGzipReader:
    """每次最多产生 64 KiB；只在边界使用一字节超限探针，不接受拼接 gzip。"""
    def __init__(self, stream: BinaryIO, budget: _BCBudget, scope: str) -> None:
        self.stream, self.budget, self.scope = stream, budget, scope
        self.decoder = zlib.decompressobj(31)
        self.pending = b""
        self.compressed = self.tar = 0
        self.digest = hashlib.sha256()
        self.ended = False

    def _input(self) -> bytes:
        remaining = self.budget.limits["compressed"] - self.compressed
        raw = self.stream.read(min(_BC_CHUNK, remaining) if remaining else 1)
        _require(type(raw) is bytes and len(raw) <= (min(_BC_CHUNK, remaining) if remaining else 1), "E_ARCHIVE")
        self.budget.add("compressed", len(raw), scope=self.scope)
        self.compressed += len(raw)
        self.digest.update(raw)
        return raw

    def read(self, size: int) -> bytes:
        _require(type(size) is int and 0 < size <= _BC_CHUNK, "E_ARCHIVE")
        if self.ended:
            return b""
        while True:
            if self.decoder.eof:
                _require(not self.decoder.unused_data and not self.pending, "E_ARCHIVE")
                _require(not self._input(), "E_ARCHIVE")
                self.ended = True
                return b""
            if not self.pending:
                self.pending = self._input()
                _require(bool(self.pending), "E_ARCHIVE", "归档提前结束")
            remaining = self.budget.limits["tar"] - self.tar
            try:
                output = self.decoder.decompress(self.pending, min(size, remaining) if remaining else 1)
            except zlib.error as error:
                raise TransactionError("E_ARCHIVE", "压缩格式校验失败") from error
            self.pending = self.decoder.unconsumed_tail
            self.budget.add("tar", len(output), scope=self.scope)
            self.tar += len(output)
            if output:
                return output

    def exact(self, size: int) -> bytes:
        _require(0 <= size <= _BC_CHUNK, "E_ARCHIVE")
        chunks = bytearray()
        while len(chunks) < size:
            piece = self.read(size - len(chunks))
            _require(bool(piece), "E_ARCHIVE", "归档提前结束")
            chunks.extend(piece)
        return bytes(chunks)


def _bc_entry_charge(path: str, link: str = "") -> int:
    # NamedTuple、Unicode 最坏四字节、摘要和整数；临时索引/列表容量另计。
    # 隐式父目录、扩展状态和最终 tuple 另行计费，不能仅按序列化长度计算。
    return 1024 + 4 * len(path) + 4 * len(link)


def _bc_validate_archive(stream: BinaryIO, *, declared_size: int | None = None,
                         budget: _BCBudget | None = None, purpose: str = "release") -> _BCArchiveResult:
    budget = budget if budget is not None else _BCBudget()
    _require(purpose in ("release", "config_backup"), "E_ARCHIVE")
    if declared_size is not None:
        budget._check("compressed", declared_size)
    budget.reserve_scan(_BC_ARCHIVE_WORK)
    try:
        return _bc_parse_archive(stream, declared_size=declared_size, budget=budget, purpose=purpose)
    finally:
        # 内层解析栈及 zlib 已经收束，不提前释放仍存活的解析状态。
        budget.release_scan(_BC_ARCHIVE_WORK)


def _bc_parse_archive(stream: BinaryIO, *, declared_size: int | None,
                      budget: _BCBudget, purpose: str) -> _BCArchiveResult:
    scope = budget._scope()
    reader = _BCGzipReader(stream, budget, scope)
    entries: list[_BCArchiveEntry] = []
    names: dict[str, str] = {}
    implicit: set[str] = set()
    retained = 512  # 最终结果对象及固定标量；临时容器另计。
    budget.reserve_scan(retained)
    budget.reserve_scan(2048)
    members = regular = 0
    extensions: dict[str, str] = {}
    global_extensions: dict[str, str] = {}
    extension_pending = False

    def payload(size: int, digest: Any = None) -> None:
        processed = 0
        while processed < size:
            raw = reader.exact(min(_BC_CHUNK, size - processed))
            processed += len(raw)
            if digest is not None:
                budget._check("file", processed)
                digest.update(raw)
        padding = (-size) % 512
        if padding:
            _require(not any(reader.exact(padding)), "E_ARCHIVE")

    try:
        while True:
            header = reader.exact(512)
            if not any(header):
                _require(not extension_pending and not any(reader.exact(512)), "E_ARCHIVE")
                while True:
                    tail = reader.read(_BC_CHUNK)
                    if not tail:
                        break
                    _require(not any(tail), "E_ARCHIVE")
                _require(reader.tar % 512 == 0, "E_ARCHIVE")
                break
            budget.add("members", 1, scope=scope)
            members += 1
            try:
                # GNU/PAX 的完整字段可能覆盖基础头截断在多字节字符中的前缀。
                # 这里只保留不可解码字节，最终有效路径与链接仍严格拒绝 surrogate。
                member = tarfile.TarInfo.frombuf(header, "utf-8", "surrogateescape")
            except (tarfile.TarError, UnicodeError, ValueError) as error:
                raise TransactionError("E_ARCHIVE", "归档成员头校验失败") from error
            _require(type(member.size) is int and 0 <= member.size <= MAX_UINT, "E_ARCHIVE")
            if member.type in (tarfile.GNUTYPE_LONGNAME, tarfile.GNUTYPE_LONGLINK,
                               tarfile.XHDTYPE, tarfile.XGLTYPE):
                # 扩展只允许有限字段/单记录；原始扩展头单独计成员，正文仍计完整 tar。
                _require(0 < member.size <= 65536, "E_ARCHIVE", "未支持的扩展大小")
                raw = reader.exact(member.size)
                if (-member.size) % 512:
                    _require(not any(reader.exact((-member.size) % 512)), "E_ARCHIVE")
                if member.type in (tarfile.GNUTYPE_LONGNAME, tarfile.GNUTYPE_LONGLINK):
                    key = "path" if member.type == tarfile.GNUTYPE_LONGNAME else "linkpath"
                    _require(raw.endswith(b"\0") and b"\0" not in raw[:-1] and key not in extensions, "E_ARCHIVE")
                    extensions[key] = raw[:-1].decode("utf-8", "strict")
                    extension_pending = True
                else:
                    target = global_extensions if member.type == tarfile.XGLTYPE else extensions
                    offset = 0
                    seen: set[str] = set()
                    while offset < len(raw):
                        space = raw.find(b" ", offset, min(len(raw), offset + 22))
                        _require(space > offset and raw[offset:space].isdigit(), "E_ARCHIVE")
                        length = int(raw[offset:space])
                        _require(0 < length <= 16384 and space + 1 < offset + length <= len(raw), "E_ARCHIVE")
                        record = raw[space + 1:offset + length]
                        _require(record.endswith(b"\n") and b"=" in record, "E_ARCHIVE")
                        key_raw, value_raw = record[:-1].split(b"=", 1)
                        key = key_raw.decode("ascii", "strict")
                        _require(key in ("path", "linkpath", "size", "mtime", "atime", "ctime", "uid", "gid", "uname", "gname")
                                 and key not in seen and len(seen) < 10, "E_ARCHIVE", "未支持或重复的扩展字段")
                        seen.add(key)
                        value = value_raw.decode("utf-8", "strict")
                        _require("\0" not in value, "E_ARCHIVE")
                        if key in ("path", "linkpath", "size"):
                            _require(key not in target, "E_ARCHIVE")
                            target[key] = value
                        offset += length
                    extension_pending = member.type == tarfile.XHDTYPE or extension_pending
                continue
            _require(member.type in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE, tarfile.SYMTYPE), "E_ARCHIVE")
            effective = dict(global_extensions)
            effective.update(extensions)
            raw_path = effective.get("path", member.name)
            is_directory = member.type == tarfile.DIRTYPE
            if is_directory and raw_path.endswith("/"):
                raw_path = raw_path[:-1]
            path, _, _ = _bc_path(raw_path, budget=budget)
            _require(path != "." or is_directory, "E_ARCHIVE")
            _require(path not in names, "E_ARCHIVE", "归档成员重复")
            kind = "directory" if is_directory else "symlink" if member.type == tarfile.SYMTYPE else "file"
            size = member.size
            if "size" in effective:
                value = effective["size"]
                _require(value.isascii() and value.isdecimal() and len(value) <= 20, "E_ARCHIVE")
                size = int(value)
            link = effective.get("linkpath", member.linkname) if kind == "symlink" else ""
            if kind == "symlink":
                _require(purpose == "config_backup" and path.startswith("etc/nginx/sites-enabled/")
                         and len(path.split("/")) == 4, "E_ARCHIVE")
                _require(link and "\0" not in link and "\\" not in link and len(link.encode("utf-8")) <= 4096, "E_ARCHIVE")
            if kind != "file":
                _require(size == 0, "E_ARCHIVE")
            else:
                budget._check("file", size)
                _require(path not in implicit, "E_ARCHIVE")
            # 在构造记录和索引之前支付槽位、路径和父索引的最坏容量。
            charge = _bc_entry_charge(path, link)
            budget.reserve_scan(charge)
            retained += charge
            budget.reserve_scan(1024)  # list/dict 的槽、扩容时新旧容量。
            for index, char in enumerate(path):
                if char == "/":
                    # 前缀复制前检查；短暂前缀也在固定工作区内。
                    parent = path[:index]
                    _require(names.get(parent, "directory") == "directory", "E_ARCHIVE")
                    if parent not in implicit:
                        cost = 1024 + 4 * len(parent)
                        budget.reserve_scan(cost)
                        implicit.add(parent)
            digest = hashlib.sha256() if kind == "file" else None
            payload(size, digest)
            regular += size
            names[path] = kind
            entries.append(_BCArchiveEntry(path, kind, size, digest.hexdigest() if digest is not None else "", link))
            extensions.clear()
            extension_pending = False
        if declared_size is not None:
            _require(reader.compressed == declared_size, "E_ARCHIVE", "归档声明与实际长度不一致")
        for entry in entries:
            if entry.kind == "symlink":
                target = posixpath.normpath(posixpath.join("/" + posixpath.dirname(entry.path), entry.link_text))
                _require(target.startswith("/etc/nginx/sites-available/") and len(target.split("/")) == 5
                         and names.get(target[1:]) == "file", "E_ARCHIVE")
        tuple_charge = 256 + 8 * len(entries)
        budget.reserve_scan(tuple_charge)
        result_entries = tuple(entries)
        result = _BCArchiveResult(reader.compressed, reader.tar, members, regular,
                                  reader.digest.hexdigest(), result_entries, retained + tuple_charge)
        return result
    except (UnicodeError, ValueError, OverflowError) as error:
        raise TransactionError("E_ARCHIVE", "归档编码或数值不合法") from error
    finally:
        # 先回收临时容器/解码器，再释放对应预留；结果引用的 entries 记录继续收费。
        count = len(entries)
        while entries:
            entries.pop()
        entries.clear()
        names.clear()
        for _ in range(count):
            budget.release_scan(1024)
        while implicit:
            parent = implicit.pop()
            cost = 1024 + 4 * len(parent)
            del parent
            budget.release_scan(cost)
        implicit.clear()
        extensions.clear()
        global_extensions.clear()
        reader.pending = b""
        reader.decoder = None
        budget.release_scan(2048)
# END D087 RESOURCE COMPONENT


class _P1ObservationFailure(TransactionError):
    """普通观察失败；不会授权顶层对同一目标自动重观。"""

    def __init__(self) -> None:
        super().__init__("E_GATES", "P1 本轮观察或完成证据失败，保留现场")


class _P1HoldReleased(TransactionError):
    """已知 worker 曾收束不确定；证明关闭后也只允许失败退出。"""

    def __init__(self) -> None:
        super().__init__("E_GATES", "HOLD：本次观察已要求停止，禁止继续业务")


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

    def write(self, path: str, raw: bytes, *, expected: dict[str, int] | None = None, mode: int = 0o600,
              before_replace: Callable[[], None] | None = None) -> None:
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
            if before_replace is not None:
                before_replace()
            os.rename(temporary, name, src_dir_fd=fd, dst_dir_fd=fd)
            os.fsync(fd)

    def remove(self, path: str, expected: dict[str, int], *, directory: bool = False,
               before_remove: Callable[[], None] | None = None) -> None:
        with self.parent(path) as (fd, name):
            actual = _identity(os.stat(name, dir_fd=fd, follow_symlinks=False))
            _same(actual, expected, directory_children=directory)
            if before_remove is not None:
                before_remove()
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
        self.p1_freshness: Callable[[], None] | None = None
        self.p1_exposed = False
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
        if receipt["phase"] == "terminal":
            _require(callable(self.p1_freshness), "E_GATES", "业务终态缺少本次观察闭包")
        self.fs.write(self.receipt_path, raw, expected=identity,
                      before_replace=self.p1_freshness if receipt["phase"] == "terminal" else None)
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


def _dotenv_assignment_keys(raw: bytes) -> list[str]:
    """按 python-dotenv 的物理记录语法扫描赋值键，不展开或输出环境值。"""
    text = raw.decode("utf-8")
    position = 0
    keys = []

    def consume(pattern: str) -> re.Match[str]:
        nonlocal position
        match = re.compile(pattern, re.MULTILINE).match(text, position)
        if match is None:
            raise ValueError("dotenv 记录语法无效")
        position = match.end()
        return match

    while position < len(text):
        try:
            consume(r"\s*")
            if position == len(text):
                break
            consume(r"(?:export[^\S\r\n]+)?")
            first = text[position:position + 1]
            key = None if first == "#" else consume(r"'([^']+)'" if first == "'" else r"([^=\#\s]+)")[1]
            consume(r"[^\S\r\n]*")
            assigned = text[position:position + 1] == "="
            if assigned:
                consume(r"=[^\S\r\n]*")
                quote = text[position:position + 1]
                if quote == "'":
                    consume(r"'((?:\\'|[^'])*)'")
                elif quote == '"':
                    consume(r'"((?:\\"|[^"])*)"')
                else:
                    consume(r"[^\r\n]*")
            consume(r"(?:[^\S\r\n]*#[^\r\n]*)?")
            consume(r"[^\S\r\n]*(?:\r\n|\n|\r|$)")
            if assigned and key is not None:
                keys.append(key)
        except ValueError:
            # 与 parse_stream 一致：错误后从当前游标恢复至物理行尾。
            # VT/NEL/U+2028/U+2029 不是换行，合法引号值可跨 CR/LF。
            consume(r"[^\r\n]*(?:\r|\n|\r\n)?")
    return keys


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
            _require(not set(_dotenv_assignment_keys(environment_raw)).intersection(reserved),
                     "E_PHASE", "后加载环境文件定义了发布保留键")
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
            _bc_scan_trees(fs, (transaction.candidate_path + "/backend/.venv",), mode="venv")
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
            _, previous_epoch = _health(previous["backend"]["revision"], previous_phases, previous_hashes)
            if previous_epoch is not None:
                _P1_EPOCHS[txn_id] = previous_epoch
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


def _isolate_if_uncommitted(transaction: _Transaction, lease_fd: int | None) -> None:
    try:
        _, persisted, _ = transaction.load()
        if persisted["phase"] in TERMINAL_PHASES:
            # terminal rename 可能已经成功；只读复验后保留业务结果，后续仅续清理。
            return
        _revalidate_target_services(transaction, lease_fd, require_active=False)
    except (OSError, TransactionError):
        # 缺失或漂移的材料不能证明 writer 归属；失败兜底也不能修改未知现场。
        return
    _isolate(transaction.fs)


def _p1_starting(txn_id: str) -> None:
    """合法启动批次也先废弃当前控制器的旧窗口；不产生新启动权限。"""
    global _P1_GENERATION
    _P1_GENERATION = object()
    _P1_STARTS[txn_id] = _P1_EPOCHS.get(txn_id)


def _p1_configuration(fs: _Fs) -> dict[str, Any]:
    result = {}
    for key, (path, _) in CONFIG.items():
        if not fs.exists(path):
            result[key] = None
        elif stat.S_ISLNK(fs.info(path)["mode"]):
            result[key] = fs.link(path)
        else:
            result[key] = fs.file_image(path)
    return result


def _p1_sample(raw: bytes) -> None:
    """父级只收严格现有v2样本；P1专用失败不自造公开形状。"""
    sample = _decode_json(raw, 6 * 1024 * 1024 + 4096, "E_GATES")
    common = {"schema_version", "at_unix", "elapsed_s", "gateway", "ok", "latency_s", "run_epoch", "freshness_failure"}
    _require(sample.get("schema_version") == "p6-heartbeat-watch-v2"
             and sample.get("gateway") == "http://127.0.0.1:8000" and type(sample.get("ok")) is bool, "E_GATES")
    for key in ("at_unix", "elapsed_s", "latency_s"):
        value = sample.get(key)
        _require(type(value) in (float, int) and math.isfinite(value) and value >= 0, "E_GATES")
    epoch = sample.get("run_epoch")
    _require(epoch is None or (type(epoch) is str and re.fullmatch(r"hb_[0-9a-f]{32}", epoch) is not None), "E_GATES")
    failures = {"request_timeout", "request_failed", "http_status_invalid", "json_invalid", "health_shape_invalid",
                "heartbeat_epoch_invalid", "backend_revision_mismatch", "heartbeat_not_ready", "heartbeat_counter_regressed",
                "heartbeat_counter_stalled", "heartbeat_run_changed"}
    failure = sample.get("freshness_failure")
    _require(failure is None or (type(failure) is str and failure in failures), "E_GATES")
    if "data" in sample:
        _keys(sample, common | {"status", "data"}, "E_GATES")
        _require(type(sample["status"]) is int and sample["status"] == 200 and type(sample["data"]) is dict, "E_GATES")
        _require(not sample["ok"] or (failure is None and epoch is not None), "E_GATES")
    elif "status" in sample:
        _keys(sample, common | {"status", "error"}, "E_GATES")
        _require(type(sample["status"]) is int and 100 <= sample["status"] <= 599, "E_GATES")
        expected = {"json_invalid", "health_shape_invalid"} if sample["status"] == 200 else {"http_status_invalid"}
        _require(sample["error"] in expected, "E_GATES")
    else:
        _keys(sample, common | {"error"}, "E_GATES")
        _require(sample["error"] in {"request_timeout", "request_failed"}, "E_GATES")
    if "error" in sample:
        _require(sample["ok"] is False and epoch is None and failure == sample["error"], "E_GATES")


class _P1SampleSink:
    """唯一fd追加并验证完整字节；关闭后只用冻结身份和摘要复验。"""

    def __init__(self, fs: _Fs, path: str):
        self.fs, self.path = fs, path
        self.fd: int | None = None
        self.parent: int | None = None
        self.identity: dict[str, int] | None = None
        self.length = 0
        self.digest = hashlib.sha256()
        self.failed = False

    def __enter__(self) -> _P1SampleSink:
        with self.fs.parent(self.path) as (parent, name):
            self.parent = os.dup(parent)
            try:
                self.fd = os.open(name, os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC,
                                  0o600, dir_fd=self.parent)
                os.fchmod(self.fd, 0o600)
                self.identity = _identity(os.fstat(self.fd))
                _validate_identity(self.identity, "file")
                os.fsync(self.fd)
                os.fsync(self.parent)
                self.verify()
            except BaseException:
                self.__exit__()
                raise
        return self

    def __exit__(self, *_: Any) -> None:
        fd, self.fd = self.fd, None
        parent, self.parent = self.parent, None
        try:
            if fd is not None:
                os.close(fd)
        finally:
            if parent is not None:
                os.close(parent)

    def verify(self) -> None:
        _require(not self.failed and self.identity is not None, "E_GATES")
        if self.fd is not None:
            _same(_identity(os.fstat(self.fd)), self.identity)
            _require(os.fstat(self.fd).st_size == self.length, "E_DRIFT")
        # 按已确认追加长度分块复验，不把未获批准的全局B/C容量当作P1样本上限。
        with self.fs.parent(self.path) as (parent, name):
            _same(_identity(os.stat(name, dir_fd=parent, follow_symlinks=False)), self.identity)
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK, dir_fd=parent)
            try:
                _same(_identity(os.fstat(fd)), self.identity)
                _require(os.fstat(fd).st_size == self.length, "E_DRIFT")
                digest, remaining = hashlib.sha256(), self.length
                while remaining:
                    chunk = os.read(fd, min(65536, remaining))
                    _require(bool(chunk), "E_DRIFT")
                    digest.update(chunk)
                    remaining -= len(chunk)
                _require(os.read(fd, 1) == b"" and digest.hexdigest() == self.digest.hexdigest(), "E_DRIFT")
                _same(_identity(os.fstat(fd)), self.identity)
                _require(os.fstat(fd).st_size == self.length, "E_DRIFT")
                _same(_identity(os.stat(name, dir_fd=parent, follow_symlinks=False)), self.identity)
            finally:
                os.close(fd)

    def append(self, raw: bytes) -> None:
        try:
            _require(type(raw) is bytes and self.fd is not None, "E_GATES")
            _p1_sample(raw)
            self.verify()
            _require(os.write(self.fd, raw) == len(raw), "E_IO", "P1样本短写，保留失败材料")
            self.length += len(raw)
            self.digest.update(raw)
            os.fsync(self.fd)
            self.verify()
        except BaseException:
            self.failed = True
            raise


def _p1_hold_worker(error: BaseException) -> None:
    """在任何外层finally之前保留owner和控制资源，只回收已知子步骤。"""
    global _P1_CLEANUP_EVENT
    _P1_CLEANUP_EVENT = object()
    # P1入口先确认主线程/Linux；HOLD期间常规中断不能使锁先于worker释放。
    blocked = {signal.SIGINT, signal.SIGTERM, signal.SIGHUP}
    try:
        previous = signal.pthread_sigmask(signal.SIG_BLOCK, blocked)
    except BaseException:
        # 调用前已安装只锁存取消的处理器；屏蔽失败也不能离开资源作用域。
        previous = None
    try:
        owner = getattr(error, "owner", None)
    except BaseException:
        owner = None
    try:
        print("E_GATES: HOLD：已知观察执行单元收束未确认，保持控制资源", file=sys.stderr, flush=True)
    except BaseException:
        pass
    while True:
        try:
            closed = owner is not None and owner.try_cleanup() is True
        except BaseException:
            closed = False
        if closed:
            # 此时worker/pipe已经证明关闭；只失败退出，不触发恢复或重观。
            if previous is not None:
                signal.pthread_sigmask(signal.SIG_SETMASK, previous)
            raise _P1HoldReleased() from None
        try:
            time.sleep(1.0)
        except BaseException:
            # 包括KeyboardInterrupt/SystemExit；未证明收束不能穿透控制资源作用域。
            continue


def _p1_preserve_hold(event: object) -> None:
    if event is not _P1_CLEANUP_EVENT:
        raise _P1HoldReleased() from None


@contextmanager
def _p1_signals(cancel: Callable[[], None]) -> Iterator[None]:
    """在P6可能创建worker前完成安装；仅在已确认收束后离开调用范围。"""
    previous = {}
    try:
        for number in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
            try:
                previous[number] = signal.getsignal(number)
                signal.signal(number, lambda _number, _frame: cancel())
            except BaseException as error:
                cancel()
                raise TransactionError("E_GATES", "P1取消处理器安装失败") from error
        yield
    finally:
        failure = None
        for number, handler in previous.items():
            try:
                signal.signal(number, handler)
            except BaseException as error:
                failure = error
        if failure is not None:
            cancel()
            raise TransactionError("E_GATES", "P1取消处理器恢复失败") from failure


def _load_p1_observer(raw: bytes, path: str) -> types.ModuleType:
    module = types.ModuleType("_myweb_p1_" + secrets.token_hex(16))
    module.__file__ = path
    sys.modules[module.__name__] = module
    try:
        exec(compile(raw, path, "exec"), module.__dict__)
        ordinary = module._P1ObservationError
        cleanup = module._P1WorkerCleanupError
        _require(isinstance(ordinary, type) and isinstance(cleanup, type)
                 and issubclass(ordinary, RuntimeError) and issubclass(cleanup, RuntimeError)
                 and not issubclass(ordinary, cleanup) and not issubclass(cleanup, ordinary)
                 and callable(module._observe_myweb_p1), "E_BINDING")
        return module
    except (OSError, ValueError, TypeError, AttributeError, SyntaxError) as error:
        sys.modules.pop(module.__name__, None)
        raise TransactionError("E_BINDING", "受信P1观察入口不兼容") from error


def _watch_heartbeat(transaction: _Transaction, backend: dict[str, Any], epoch: str,
                     *, lease_fd: int | None) -> Callable[[], None]:
    global _P1_GENERATION
    _P1_GENERATION = object()
    generation, creator = _P1_GENERATION, os.getpid()
    _require(threading.current_thread() is threading.main_thread() and hasattr(signal, "pthread_sigmask"), "E_GATES")
    fs = transaction.fs
    record, receipt, _ = transaction.load()
    operation = receipt["operation"]
    selected = "previous" if operation == "rollback" else "candidate"
    _require(record[selected]["backend"] == backend, "E_BINDING")
    phases = record["previous_phase" if operation == "rollback" else "phase"]
    hashes = record["previous_canary_hashes" if operation == "rollback" else "canary_hashes"]
    _validate_phases(phases, hashes)
    watcher = backend["directory"]["path"] + "/scripts/p6_heartbeat_watch.py"
    watcher_image = fs.read(watcher)
    transaction.barrier(receipt)
    transaction.verify_control(record)
    health_path = transaction.upload + "/control/" + CONTROL["health_validator"]
    health_image = fs.read(health_path)
    _same(health_image[1], record["control"]["health_validator"]["identity"])
    _require(_digest(health_image[0]) == record["control"]["health_validator"]["sha256"], "E_BINDING")
    _require(fs.read(watcher) == watcher_image, "E_DRIFT")
    boot = fs.read("/proc/sys/kernel/random/boot_id", 128)[0]
    _require(re.fullmatch(rb"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\n", boot) is not None, "E_BINDING")
    baseline: dict[str, Any] = {}
    _revalidate_target_services(transaction, lease_fd, evidence=baseline)
    configuration = _p1_configuration(fs)
    maintenance = fs.file_image(MAINTENANCE_PATH)
    _require(maintenance["bytes_b64"] == "", "E_GATES")
    previous = _P1_EPOCHS.get(transaction.txn_id)
    if transaction.txn_id in _P1_STARTS:
        _require(_P1_STARTS[transaction.txn_id] is None or epoch != _P1_STARTS[transaction.txn_id], "E_GATES",
                 "启动后必须取得新world epoch，禁止沿用旧观察")
    if transaction.txn_id in _P1_INSTANCES and _P1_INSTANCES[transaction.txn_id] != baseline:
        _require(epoch != previous, "E_GATES", "服务实例已变而world epoch未变")
    _P1_EPOCHS[transaction.txn_id] = epoch
    _P1_INSTANCES[transaction.txn_id] = copy.deepcopy(baseline)
    module = _load_p1_observer(watcher_image[0], watcher)
    observation_error, cleanup_error = module._P1ObservationError, module._P1WorkerCleanupError
    output = transaction.rollback + "/.p6-heartbeat-watch." + secrets.token_hex(16) + ".jsonl"
    invalid = False
    cancelled = False
    def cancel() -> None:
        nonlocal invalid, cancelled
        global _P1_CLEANUP_EVENT
        if not cancelled:
            _P1_CLEANUP_EVENT = object()
            cancelled = True
        invalid = True
    with _P1SampleSink(fs, output) as sink:
        def revalidate_instance() -> None:
            nonlocal invalid
            try:
                _require(not invalid and os.getpid() == creator and generation is _P1_GENERATION, "E_GATES")
                current_record, current_receipt, _ = transaction.load()
                _require(current_record == record and current_receipt["operation"] == operation, "E_DRIFT")
                repeated: dict[str, Any] = {}
                _revalidate_target_services(transaction, lease_fd, evidence=repeated)
                _require(repeated == baseline and _p1_configuration(fs) == configuration, "E_DRIFT")
                _require(fs.read(watcher) == watcher_image and fs.read(health_path) == health_image
                         and fs.read("/proc/sys/kernel/random/boot_id", 128)[0] == boot, "E_DRIFT")
                if transaction.p1_exposed:
                    _require(not fs.exists(MAINTENANCE_PATH), "E_DRIFT")
                else:
                    _require(fs.file_image(MAINTENANCE_PATH) == maintenance, "E_DRIFT")
                sink.verify()
                _require(os.getpid() == creator and generation is _P1_GENERATION, "E_GATES")
            except BaseException:
                invalid = True
                raise

        def invoke(function: Callable[[], Any]) -> Any:
            nonlocal invalid
            with _p1_signals(cancel):
                try:
                    result = function()
                except cleanup_error as error:
                    invalid = True
                    _p1_hold_worker(error)
                except observation_error:
                    invalid = True
                    raise _P1ObservationFailure() from None
                except BaseException as error:
                    # 非契约异常不证明worker已关闭；缺失owner时仍持有资源等待人工处理。
                    invalid = True
                    _p1_hold_worker(error)
            _require(not cancelled, "E_GATES", "P1观察已取消")
            return result

        guarded = invoke(lambda: module._observe_myweb_p1(
            gateway="http://127.0.0.1:8000", expected_revision=backend["revision"], expected_epoch=epoch,
            health_validator_source=health_image[0], expected_phases=copy.deepcopy(phases), expected_canary_hashes=tuple(hashes),
            revalidate_instance=revalidate_instance, sync_sample=sink.append))
        _require(callable(guarded) and sink.length > 0, "E_GATES")
        revalidate_instance()
        _P1_STARTS.pop(transaction.txn_id, None)

    def freshness() -> None:
        nonlocal invalid
        try:
            _require(not invalid, "E_GATES")
            result = invoke(guarded)
            _require(result is None and not invalid, "E_GATES")
        except BaseException:
            invalid = True
            raise
    return freshness


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


def _maintained_gates(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any], *, observe: bool = True,
                      lease_fd: int | None = None) -> dict[str, Any]:
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
        freshness = _watch_heartbeat(transaction, bundle["backend"], epoch, lease_fd=lease_fd)
        repeated = _maintained_gates(transaction, record, receipt, observe=False, lease_fd=lease_fd)
        _require(all(repeated[key] == result[key] for key in ("nginx_sha256", "apparmor_sha256", "unit_sha256", "run_epoch")), "E_DRIFT")
        repeated["p1_freshness"] = freshness
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


def _bc_validate_config_backup(directory: str, name: str, *, budget: _BCBudget | None = None) -> None:
    """资源检查与原 metadata/精确成员校验同时满足；不生成新持久字段。"""
    resource_budget = budget if budget is not None else _BCBudget()

    def validate() -> None:
        with _Fs() as fs:
            original = _bc_config_backup_identity(fs, directory, budget=resource_budget)
            _require(original is not None, "E_ARCHIVE", "备份权限或固定成员资格不符")
            _bc_check_config_backup(directory, name, budget=resource_budget)
            _require(_bc_config_backup_identity(fs, directory, budget=resource_budget) == original, "E_DRIFT")

    resource_budget._transient(validate)


def _bc_check_config_backup(directory: str, name: str, *, budget: _BCBudget) -> None:
    """内容资格内核；完整私有入口另绑定 Linux 权限与固定三文件身份。"""
    from pathlib import Path

    def require(condition: bool, message: str) -> None:
        if not condition:
            raise ValueError(message)


    def read_backup_control(path: Path, encoding: str) -> str:
        with _bc_open_archive(str(path)) as handle:
            raw = handle.read(4 * 1024 * 1024 + 1)
        require(len(raw) <= 4 * 1024 * 1024 and raw.count(b"\n") <= 64, "配置控制文件过大")
        text = raw.decode(encoding)
        # splitlines 还识别 CR、VT、FF 及 Unicode 分隔符，必须在分行/建表前统一计数。
        boundaries = 0
        previous_cr = False
        for char in text:
            if char in "\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029":
                if char != "\n" or not previous_cr:
                    boundaries += 1
                    require(boundaries <= 64, "配置控制文件行数过大")
            previous_cr = char == "\r"
        return text


    def file_sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with _bc_open_archive(str(path)) as handle:
            remaining = 4 * 1024 * 1024
            while True:
                chunk = handle.read(min(65536, remaining) if remaining else 1)
                require(len(chunk) <= remaining, "配置控制文件过大")
                if not chunk:
                    break
                remaining -= len(chunk)
                digest.update(chunk)
        return digest.hexdigest()


    try:
        backup_path = Path(directory)
        backup_name = name
        name_match = re.fullmatch(
            r"run-([0-9]+)-([0-9]+)-([0-9a-f]{40})", backup_name
        )
        require(name_match is not None, "目录名格式无效")
        run_id, run_attempt, revision = name_match.groups()

        archive_path = backup_path / "config.tar.gz"
        resource_budget = budget
        with _bc_open_archive(str(archive_path)) as resource_stream:
            resource_result = _bc_validate_archive(resource_stream, declared_size=os.fstat(resource_stream.fileno()).st_size, budget=resource_budget, purpose="config_backup")
        resource_budget.reserve_scan(67108864 + 1024 * len(resource_result.entries))
        metadata_path = backup_path / "metadata.txt"
        manifest_path = backup_path / "SHA256SUMS"
        manifest_entries: dict[str, str] = {}
        for line in read_backup_control(manifest_path, "ascii").splitlines():
            match = re.fullmatch(
                r"([0-9a-f]{64})  (config\.tar\.gz|metadata\.txt)", line
            )
            require(match is not None, "摘要清单格式无效")
            digest, filename = match.groups()
            require(filename not in manifest_entries, "摘要清单包含重复项")
            manifest_entries[filename] = digest
        require(
            set(manifest_entries) == {"config.tar.gz", "metadata.txt"},
            "摘要清单成员不完整",
        )
        require(
            resource_result.compressed_sha256 == manifest_entries["config.tar.gz"]
            and file_sha256(metadata_path) == manifest_entries["metadata.txt"],
            "归档摘要不匹配",
        )

        metadata: dict[str, list[str]] = {}
        for line in read_backup_control(metadata_path, "utf-8").splitlines():
            require("=" in line, "metadata 行格式无效")
            key, value = line.split("=", 1)
            metadata.setdefault(key, []).append(value)
        allowed_keys = {
            "schema",
            "created_at_utc",
            "github_run_id",
            "github_run_attempt",
            "portal_revision",
            "apparmor_profile",
            "ops_env",
            "path",
        }
        require(set(metadata) == allowed_keys, "metadata 字段集合无效")

        def single(key: str) -> str:
            values = metadata[key]
            require(len(values) == 1, f"metadata {key} 重复")
            return values[0]

        require(
            single("schema") == "myagent-production-config-backup-v1",
            "schema 无效",
        )
        require(
            re.fullmatch(
                r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z",
                single("created_at_utc"),
            )
            is not None,
            "创建时间格式无效",
        )
        require(single("github_run_id") == run_id, "run id 与目录名不一致")
        require(
            single("github_run_attempt") == run_attempt,
            "run attempt 与目录名不一致",
        )
        require(
            single("portal_revision") == revision,
            "revision 与目录名不一致",
        )
        apparmor_state = single("apparmor_profile")
        ops_env_state = single("ops_env")
        require(apparmor_state in {"present", "absent"}, "AppArmor 状态无效")
        require(ops_env_state in {"present", "absent"}, "ops.env 状态无效")

        required_files = {
            "opt/myagent/.env",
            "etc/systemd/system/myagent-world.service",
            "etc/systemd/system/myagent-gateway.service",
        }
        required_directories = {
            "etc/nginx/sites-available",
            "etc/nginx/sites-enabled",
        }
        optional_paths = {
            "etc/apparmor.d/myagent-persona-parser": apparmor_state,
            "etc/lingxi-ops/ops.env": ops_env_state,
        }
        expected_paths = required_files | required_directories | {
            path for path, state in optional_paths.items() if state == "present"
        }
        require(
            len(metadata["path"]) == len(set(metadata["path"]))
            and set(metadata["path"]) == expected_paths,
            "metadata 路径集合无效",
        )

        normalized_members = {member.path: member for member in resource_result.entries}

        for path in required_files:
            require(
                path in normalized_members and normalized_members[path].kind == "file",
                "归档缺少必需普通文件",
            )
        for path in required_directories:
            require(
                path in normalized_members and normalized_members[path].kind == "directory",
                "归档缺少必需目录",
            )
        for path, state in optional_paths.items():
            present = path in normalized_members
            require(present == (state == "present"), "可选成员状态不一致")
            if present:
                require(normalized_members[path].kind == "file", "可选成员不是普通文件")

        fixed_members = required_files | required_directories | set(optional_paths)
        available_prefix = "etc/nginx/sites-available/"
        enabled_prefix = "etc/nginx/sites-enabled/"
        for name, member in normalized_members.items():
            if name in fixed_members:
                continue
            if name.startswith(available_prefix):
                relative = name[len(available_prefix) :]
                require("/" not in relative and member.kind == "file", "sites-available 成员无效")
                continue
            if name.startswith(enabled_prefix):
                relative = name[len(enabled_prefix) :]
                require(
                    "/" not in relative and (member.kind == "file" or member.kind == "symlink"),
                    "sites-enabled 成员无效",
                )
                if member.kind == "symlink":
                    live_name = f"/etc/nginx/sites-enabled/{relative}"
                    target = member.link_text
                    if not target.startswith("/"):
                        target = posixpath.join(posixpath.dirname(live_name), target)
                    resolved = posixpath.normpath(target)
                    require(
                        posixpath.dirname(resolved) == "/etc/nginx/sites-available",
                        "sites-enabled 链接越界",
                    )
                    available_name = resolved.removeprefix("/")
                    require(
                        available_name in normalized_members
                        and normalized_members[available_name].kind == "file",
                        "sites-enabled 链接目标无效",
                    )
                continue
            raise ValueError("归档包含未声明成员")
    except TransactionError:
        raise
    except (OSError, UnicodeError, ValueError, tarfile.TarError) as error:
        raise TransactionError("E_ARCHIVE", "配置归档字段或成员校验失败") from error


class _BCBackupIdentity(NamedTuple):
    root: tuple[int, ...]
    files: tuple[tuple[str, tuple[int, ...], int, int, int], ...]


def _bc_config_backup_identity(fs: _Fs, directory: str, *, budget: _BCBudget) -> _BCBackupIdentity | None:
    """资格异常返回 None；读取中断或已捕获对象改变一律中止。"""
    _require(type(directory) is str and directory.startswith("/"), "E_PATH")
    if len(directory) > 16385:
        budget._check("path", len(directory) - 1)
    budget.reserve_scan(16384 + 4 * len(directory))
    _bc_path(directory[1:], budget=budget)
    with fs.parent(directory) as (parent, name):
        info = os.stat(name, dir_fd=parent, follow_symlinks=False)
    root_identity = _bc_frozen_identity(info)
    if not (stat.S_ISDIR(info.st_mode) and info.st_uid == info.st_gid == 0
            and stat.S_IMODE(info.st_mode) == 0o700):
        return None
    expected = ("SHA256SUMS", "config.tar.gz", "metadata.txt")
    files = []
    eligible = True
    count = 0
    with fs.directory(directory) as fd:
        _require(_bc_frozen_identity(os.fstat(fd)) == root_identity, "E_DRIFT")
        for name in _bc_directory_names(fd, budget=budget):
            count += 1
            if name not in expected:
                eligible = False
                continue
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            if not (stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == info.st_gid == 0
                    and stat.S_IMODE(info.st_mode) == 0o600):
                eligible = False
                continue
            budget._check("file", info.st_size)
            files.append((name, _bc_frozen_identity(info), info.st_size, info.st_mtime_ns, info.st_ctime_ns))
        _require(_bc_frozen_identity(os.fstat(fd)) == root_identity, "E_DRIFT")
    if not eligible or count != 3 or len(files) != 3:
        return None
    files.sort()
    return _BCBackupIdentity(root_identity, tuple(files))


def _bc_prune_config_backups(root: str, current_name: str, *, budget: _BCBudget) -> None:
    """原保留语义、最初身份、全部预扫描与逐项删除共用一次预算。"""
    _require(type(root) is str and root.startswith("/") and type(current_name) is str, "E_ARGUMENT")
    if len(root) > 16385:
        budget._check("path", len(root) - 1)
    budget.reserve_scan(_BC_TREE_WORK)
    _bc_path(root[1:], budget=budget)
    _bc_path(current_name, budget=budget)
    pattern = r"run-[0-9]+-[0-9]+-[0-9a-f]{40}"
    _require(re.fullmatch(pattern, current_name) is not None, "E_ARGUMENT")
    rows: list[tuple[int, str, tuple[int, ...]]] = []
    selected: list[tuple[str, _BCBackupIdentity]] = []
    with _Fs() as fs:
        with fs.directory(root) as fd:
            parent_identity = _bc_frozen_identity(os.fstat(fd))
            for name in _bc_directory_names(fd, budget=budget):
                info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if name.startswith("run-") and stat.S_ISDIR(info.st_mode):
                    # 原清单、选择表、名字拼接、身份与排序暂存一并先预付。
                    budget.reserve_scan(8192 + 8 * len(name) + 4 * len(root))
                    rows.append((info.st_mtime_ns, name, _bc_frozen_identity(info)))
            _require(_bc_frozen_identity(os.fstat(fd)) == parent_identity, "E_DRIFT")
        rows.sort(reverse=True)
        latest = None
        valid_rank = 0
        for _, name, original_root in rows:
            if re.fullmatch(pattern, name) is None:
                continue
            if latest is None:
                latest = name
            path = root + "/" + name
            with fs.parent(path) as (fd, leaf):
                _require(_bc_frozen_identity(os.stat(leaf, dir_fd=fd, follow_symlinks=False)) == original_root, "E_DRIFT")
            original = _bc_config_backup_identity(fs, path, budget=budget)
            if original is None:
                continue
            _require(original.root == original_root, "E_DRIFT")
            try:
                _bc_validate_config_backup(path, name, budget=budget)
            except TransactionError as error:
                if error.code in ("E_RESOURCE", "E_DRIFT"):
                    raise
                _require(_bc_config_backup_identity(fs, path, budget=budget) == original, "E_DRIFT")
                continue
            _require(_bc_config_backup_identity(fs, path, budget=budget) == original, "E_DRIFT")
            valid_rank += 1
            if name in (current_name, latest) or valid_rank <= 30:
                continue
            if len(selected) >= 4097:
                budget._reject()
            selected.append((path, original))
        # 所有资格与资源读取完成之后，才能构造并验证同预算全集计划。
        budget.reserve_scan(4096 + 2048 * len(selected))
        roots = tuple(path for path, _ in selected)
        originals = tuple(_BCTreeRoot(path, identity.root) for path, identity in selected)
        plan = _bc_scan_trees(fs, roots, mode="delete", budget=budget)
        expected_files = {(path, name): (identity, size) for path, backup in selected
                          for name, identity, size, _, _ in backup.files}
        _require(len(plan.entries) == len(expected_files), "E_DRIFT")
        for entry in plan.entries:
            _require(entry.kind == "file" and expected_files.get((entry.root, entry.relative_path)) ==
                     (entry.identity, entry.logical_size), "E_DRIFT")
        for path, original in selected:
            _require(_bc_config_backup_identity(fs, path, budget=budget) == original, "E_DRIFT")

        def protected() -> None:
            with fs.directory(root) as fd:
                # 已开始删除会减少目录 nlink，其余最初五值继续绑定。
                _require(_bc_frozen_identity(os.fstat(fd))[:5] == parent_identity[:5], "E_DRIFT")

        with fs.directory(root) as fd:
            _require(_bc_frozen_identity(os.fstat(fd)) == parent_identity, "E_DRIFT")
        _bc_execute_tree_plan(fs, plan, budget=budget, before_delete=protected, expected_roots=originals)


@contextmanager
def _bc_open_archive(path: str) -> Iterator[BinaryIO]:
    before = os.stat(path, follow_symlinks=False)
    _require(stat.S_ISREG(before.st_mode), "E_ARCHIVE")
    flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    fd = os.open(path, flags)
    try:
        opened = os.fstat(fd)
        _require(stat.S_ISREG(opened.st_mode) and _bc_frozen_identity(opened) == _bc_frozen_identity(before), "E_ARCHIVE")
        with os.fdopen(fd, "rb", closefd=False) as stream:
            yield stream
    finally:
        os.close(fd)


def _bc_resource_action(args: Sequence[str]) -> None:
    """仅供 workflow 生成的 stdin 前导调用；不加入 main 的公开命令。"""
    budget = _BCBudget()
    # argv 的切片、路径暂存与固定分派对象在构造前记账。
    budget.reserve_scan(_BC_TREE_WORK)
    if len(args) > 4098:
        budget._reject()
    _require(args and args[0] in ("archive", "config_backup", "cleanup", "inventory", "venv"), "E_ARGUMENT")
    action = args[0]
    if action == "archive":
        _require(len(args) == 3 and re.fullmatch(r"[0-9a-f]{64}", args[2]) is not None, "E_ARGUMENT")
        with _bc_open_archive(args[1]) as stream:
            result = _bc_validate_archive(stream, declared_size=os.fstat(stream.fileno()).st_size, budget=budget)
        _require(result.compressed_sha256 == args[2], "E_ARCHIVE")
    elif action == "config_backup":
        _require(len(args) == 3, "E_ARGUMENT")
        _bc_validate_config_backup(args[1], args[2], budget=budget)
    elif action == "cleanup" and len(args) >= 2 and args[1] == "--retention":
        _require(len(args) == 4, "E_ARGUMENT")
        _bc_prune_config_backups(args[2], args[3], budget=budget)
    elif action == "cleanup" and len(args) >= 2 and args[1] == "--snapshot":
        _require(len(args) == 3 and args[2].startswith("/"), "E_ARGUMENT")
        if len(args[2]) > 16385:
            budget._check("path", len(args[2]) - 1)
        _bc_path(args[2][1:], budget=budget)
        budget.reserve_scan(4096 + 4 * len(args[2]))
        with _Fs() as fs:
            with fs.directory(args[2]) as fd:
                info = os.fstat(fd)
                _require(info.st_uid == info.st_gid == 0 and stat.S_IMODE(info.st_mode) == 0o700, "E_IDENTITY")
                original = (_BCTreeRoot(args[2], _bc_frozen_identity(info)),)
            plan = _bc_scan_trees(fs, (args[2],), mode="snapshot", budget=budget)
            _require(plan.roots == original, "E_DRIFT", "暂存根必须保持原完整身份")
            _bc_execute_tree_plan(fs, plan, budget=budget, before_delete=lambda: None, expected_roots=original)
    elif action in ("cleanup", "venv"):
        _require(action == "cleanup" or len(args) == 2, "E_ARGUMENT")
        with _Fs() as fs:
            plan = _bc_scan_trees(fs, tuple(args[1:]), mode="delete" if action == "cleanup" else "venv", budget=budget)
            if action == "cleanup":
                _bc_execute_tree_plan(fs, plan, budget=budget, before_delete=lambda: None)
    else:
        _require(len(args) == 2 and args[1].startswith("/"), "E_ARGUMENT")
        if len(args[1]) > 16385:
            budget._check("path", len(args[1]) - 1)
        _bc_path(args[1][1:], budget=budget)
        budget.reserve_scan(_BC_TREE_WORK)
        rows: list[tuple[int, str]] = []
        with _Fs() as fs, fs.directory(args[1]) as fd:
            identity = _bc_frozen_identity(os.fstat(fd))
            for name in _bc_directory_names(fd, budget=budget):
                info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if name.startswith("run-") and stat.S_ISDIR(info.st_mode):
                    budget.reserve_scan(2048 + 4 * len(name))
                    rows.append((info.st_mtime_ns, name))
            _require(_bc_frozen_identity(os.fstat(fd)) == identity, "E_DRIFT")
        rows.sort(reverse=True)
        for timestamp, name in rows:
            sys.stdout.write(str(timestamp) + " " + name + "\0")


def _bc_workflow_prelude() -> str:
    """从唯一维护源生成同次 SSH stdin 的私有函数，避开 workflow run 长度限制。"""
    import ast
    import builtins
    import symtable
    with open(__file__, "rb") as handle:
        raw = handle.read(4 * 1024 * 1024 + 1)
    _require(len(raw) <= 4 * 1024 * 1024, "E_GATES", "控制源码过大")
    text = raw.decode("utf-8", errors="strict")
    source_lines = text.splitlines(keepends=True)
    tree = ast.parse(text)
    constants = {"MAX_UINT", "IDENTITY_KEYS", "DIR_FD_SUPPORTED", "_BC_LIMITS", "_BC_CHUNK", "_BC_ARCHIVE_WORK", "_BC_TREE_WORK"}
    helpers = {"TransactionError", "_require", "_keys", "_uint", "_identity", "_validate_identity", "_same", "_path",
               "_platform", "_open_root_fd", "_BCResourceError", "_BCBudget", "_bc_path", "_bc_validate_metadata",
               "_BCArchiveEntry", "_BCArchiveResult", "_BCGzipReader", "_bc_entry_charge", "_bc_validate_archive", "_bc_parse_archive",
               "_bc_directory_names", "_BCTreeRoot", "_BCTreeEntry", "_BCTreePlan", "_bc_frozen_identity", "_bc_scan_trees",
               "_bc_execute_tree_plan", "_bc_validate_config_backup", "_bc_check_config_backup", "_BCBackupIdentity",
               "_bc_config_backup_identity", "_bc_prune_config_backups", "_bc_open_archive", "_bc_resource_action"}
    methods = {"__init__", "__enter__", "__exit__", "directory", "parent", "ref", "remove"}
    found: set[str] = set()
    chunks = ["from __future__ import annotations\nimport errno, hashlib, os, posixpath, re, stat, sys, tarfile, types, zlib\n"
              "try:\n    import fcntl\nexcept ImportError:\n    fcntl = None\n"
              "from contextlib import contextmanager\nfrom typing import Any, BinaryIO, Callable, Iterator, Mapping, NamedTuple, Sequence\n"]

    def source(node: Any) -> str:
        begin = min([node.lineno] + [decorator.lineno for decorator in getattr(node, "decorator_list", [])])
        return "".join(source_lines[begin - 1:node.end_lineno]).replace("\r\n", "\n").rstrip() + "\n"

    for node in tree.body:
        if isinstance(node, ast.Assign):
            names = {target.id for target in node.targets if isinstance(target, ast.Name)}
            if names & constants:
                _require(len(names) == 1 and names <= constants and not names & found, "E_GATES", "资源常量依赖重复或未知")
                found.update(names & constants)
                chunks.append(source(node))
        elif isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in helpers:
            _require(node.name not in found, "E_GATES", "资源函数依赖重复")
            found.add(node.name)
            chunks.append(source(node))
        elif isinstance(node, ast.ClassDef) and node.name == "_Fs":
            _require("_Fs" not in found, "E_GATES", "文件系统依赖重复")
            selected = [method for method in node.body if getattr(method, "name", None) in methods]
            _require(len(selected) == len(methods) and {method.name for method in selected} == methods, "E_GATES")
            chunks.append("class _Fs:\n" + "\n".join(source(method) for method in selected))
            found.add("_Fs")
    _require(found == constants | helpers | {"_Fs"}, "E_GATES", "资源前导源码依赖不完整")
    chunks.append('try:\n    _bc_resource_action(sys.argv[1:])\n'
                  'except TransactionError as error:\n'
                  '    print("资源或资格校验失败，停止并保留现场", file=sys.stderr)\n'
                  '    raise SystemExit(3 if error.code == "E_RESOURCE" else 1)\n'
                  'except (OSError, UnicodeError, ValueError) as error:\n'
                  '    print("资源输入或对象状态校验失败，停止并保留现场", file=sys.stderr)\n'
                  '    raise SystemExit(1)\n')
    python = "\n".join(chunks)
    compile(python, "<myweb-resource-prelude>", "exec")
    symbols = symtable.symtable(python, "<myweb-resource-prelude>", "exec")
    available = {symbol.get_name() for symbol in symbols.get_symbols() if symbol.is_assigned() or symbol.is_imported()} | set(vars(builtins))
    pending = [symbols]
    while pending:
        scope = pending.pop()
        _require(all(not symbol.is_global() or not symbol.is_referenced() or symbol.get_name() in available
                     for symbol in scope.get_symbols()), "E_GATES", "资源前导引用了未承接依赖")
        pending.extend(scope.get_children())
    _require("PY_BC_RESOURCE" not in python.splitlines(), "E_GATES", "资源前导定界冲突")
    result = "bc_resource_python() {\n  python3 -I -B - \"$@\" <<'PY_BC_RESOURCE'\n" + python + "PY_BC_RESOURCE\n}\n"
    _require(len(result.encode("utf-8")) <= 4 * 1024 * 1024, "E_GATES", "生成控制源码过大")
    return result


def _prune_plan(transaction: _Transaction, record: dict[str, Any]) -> dict[str, Any]:
    fs = transaction.fs
    protected = {record[bundle][slot]["directory"]["path"].rsplit("/", 1)[0]
                 for bundle in ("candidate", "previous") for slot in SLOTS}
    for slot, path in CURRENT.items():
        target = _link_target(fs, path, fs.link(path))
        _require(re.fullmatch(re.escape(RELEASES_ROOT) + r"/[A-Za-z0-9._-]+/" + slot, target) is not None, "E_PATH")
        protected.add(target.rsplit("/", 1)[0])
    budget = _BCBudget()
    budget.reserve_scan(16384)
    candidates = []
    with fs.directory(RELEASES_ROOT) as fd:
        for name in _bc_directory_names(fd, budget=budget):
            if not name.startswith("release-"):
                continue
            _require(re.fullmatch(r"release-[A-Za-z0-9._-]+", name) is not None, "E_PATH")
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            _validate_identity(_identity(info), "directory")
            path = RELEASES_ROOT + "/" + name
            _require(not fs.exists(path + "/PRESERVE"), "E_STATE")
            budget.reserve_scan(4096 + 8 * len(path))
            candidates.append((info.st_mtime_ns, path, _identity(info)))
    candidates.sort(reverse=True)
    protected.update(path for _, path, _ in candidates[:5])
    releases = sorted(({"path": path, "identity": identity} for _, path, identity in candidates if path not in protected), key=lambda value: value["path"])
    payloads = []
    with fs.directory(transaction.upload) as fd:
        for name in _bc_directory_names(fd, budget=budget):
            if name in ("portal-dist.tar.gz", "portal-dist.tar.gz.sha256", "DEPLOYED", "rollback") or re.fullmatch(
                    r"\.release-transaction-state-v1\.json\.[0-9a-f]{32}\.tmp", name):
                identity = fs.info(transaction.upload + "/" + name)
                _validate_identity(identity, "directory" if name == "rollback" else "file")
                budget.reserve_scan(4096 + 8 * len(name))
                payloads.append({"relative_path": name, "identity": identity})
            else:
                _require(name in ("control", RECEIPT_NAME), "E_STATE", "run 目录出现未知材料，拒绝猜测清理")
    payloads.sort(key=lambda item: item["relative_path"])
    links = []
    for slot in SLOTS:
        for role in ("candidate", "restore"):
            path = _temporary_link(transaction.txn_id, slot, role)
            if fs.exists(path):
                links.append({"slot": slot, "role": role, "identity": fs.link(path)["identity"]})
    plan = {"releases": releases, "payloads": payloads, "temporary_links": links}
    _validate_prune(plan, record)
    return plan


def _bc_directory_names(fd: int, *, budget: _BCBudget) -> Iterator[str]:
    """单目录 inventory 的有界读取；调用者对保留记录另行预付容量。"""
    budget.reserve_scan(_BC_TREE_WORK)
    scope = budget._scope()
    try:
        with os.scandir(fd) as items:
            for item in items:
                budget.add("members", 1, scope=scope)
                name, _, _ = _bc_path(item.name, budget=budget)
                _require(name == item.name and "/" not in name and name != ".", "E_PATH")
                yield name
    finally:
        budget.release_scan(_BC_TREE_WORK)


class _BCTreeRoot(NamedTuple):
    path: str
    identity: tuple[int, ...]


class _BCTreeEntry(NamedTuple):
    root: str
    relative_path: str
    kind: str
    logical_size: int
    identity: tuple[int, ...]
    link_text: bytes


class _BCTreePlan(NamedTuple):
    roots: tuple[_BCTreeRoot, ...]
    entries: tuple[_BCTreeEntry, ...]
    members_by_root: tuple[tuple[str, int], ...]
    regular_bytes_by_root: tuple[tuple[str, int], ...]
    scan_bytes: int


def _bc_frozen_identity(info: os.stat_result) -> tuple[int, ...]:
    return (info.st_dev, info.st_ino, info.st_uid, info.st_gid, info.st_mode, info.st_nlink)


def _bc_scan_trees(fs: _Fs, roots: Sequence[str], *, mode: str,
                    budget: _BCBudget | None = None) -> _BCTreePlan:
    budget = budget if budget is not None else _BCBudget()
    if mode not in ("venv", "delete", "snapshot") or type(roots) not in (list, tuple):
        budget._reject()
    # 既有正式 prune plan 本来最多 4096 releases 加一个 rollback；拒绝无界 iterable。
    if len(roots) > 4097:
        budget._reject()
    budget.reserve_scan(_BC_TREE_WORK)
    retained = 2048
    budget.reserve_scan(retained)
    root_refs: list[_BCTreeRoot] = []
    entries: list[_BCTreeEntry] = []
    members: list[tuple[str, int]] = []
    regulars: list[tuple[str, int]] = []
    root_ids: set[tuple[int, int]] = set()

    def visit(fd: int, root: str, relative: str, device: int, scope: str,
              totals: list[int]) -> None:
        nonlocal retained
        # 每层的迭代器、dirent、stat、路径暂存及 Python frame 在进入之前预留。
        budget.reserve_scan(_BC_TREE_WORK)
        before = _bc_frozen_identity(os.fstat(fd))
        try:
            with os.scandir(fd) as children:
                for child in children:
                    budget.add("members", 1, scope=scope)
                    totals[0] += 1
                    name = child.name
                    _require(type(name) is str and name not in ("", ".", "..") and "/" not in name, "E_PATH")
                    path = relative + "/" + name if relative else name
                    path, _, _ = _bc_path(path, budget=budget)
                    info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                    identity = _bc_frozen_identity(info)
                    _require(info.st_dev == device, "E_PATH", "拒绝跨文件系统扫描")
                    kind = "directory" if stat.S_ISDIR(info.st_mode) else "symlink" if stat.S_ISLNK(info.st_mode) else "file"
                    if mode == "snapshot":
                        # 私有配置副本保留原属主/权限；原根与所有后代身份仍逐项绑定。
                        predicate = {"directory": stat.S_ISDIR, "symlink": stat.S_ISLNK, "file": stat.S_ISREG}[kind]
                        _require(predicate(info.st_mode) and info.st_ino > 0 and info.st_nlink > 0, "E_IDENTITY")
                        _require(kind == "directory" or info.st_nlink == 1, "E_IDENTITY")
                    else:
                        _validate_identity(dict(zip(IDENTITY_KEYS, identity)), kind)
                    size = info.st_size if kind == "file" else 0
                    _require(type(size) is int and size >= 0, "E_IDENTITY")
                    if kind == "file":
                        budget._check("file", size)
                        totals[1] += size
                        if mode == "venv":
                            budget.add("venv", size, scope=scope)
                    # Linux readlink 的上限以 st_size 预检，返回值复检；不打开目标。
                    link = b""
                    if kind == "symlink":
                        _require(0 <= info.st_size <= 4096, "E_PATH")
                        link = os.readlink(os.fsencode(name), dir_fd=fd)
                        _require(type(link) is bytes and len(link) <= 4096, "E_PATH")
                    cost = 2048 + 4 * len(root) + 4 * len(path) + len(link)
                    budget.reserve_scan(cost)
                    retained += cost
                    if kind == "directory":
                        child_fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=fd)
                        try:
                            _require(_bc_frozen_identity(os.fstat(child_fd)) == identity, "E_DRIFT")
                            visit(child_fd, root, path, device, scope, totals)
                        finally:
                            os.close(child_fd)
                    after = os.stat(name, dir_fd=fd, follow_symlinks=False)
                    _require(_bc_frozen_identity(after) == identity and
                             (kind != "file" or after.st_size == size), "E_DRIFT")
                    if kind == "symlink":
                        _require(os.readlink(os.fsencode(name), dir_fd=fd) == link, "E_DRIFT")
                    entries.append(_BCTreeEntry(root, path, kind, size, identity, link))
            _require(_bc_frozen_identity(os.fstat(fd)) == before, "E_DRIFT")
        finally:
            budget.release_scan(_BC_TREE_WORK)

    try:
        for raw_root in roots:
            _require(type(raw_root) is str and raw_root.startswith("/"), "E_PATH")
            if len(raw_root) > 16385:
                budget._check("path", len(raw_root) - 1)
            normalized, _, _ = _bc_path(raw_root[1:], budget=budget)
            root = "/" + normalized
            _require(root == raw_root and all(root != ref.path and not root.startswith(ref.path + "/")
                     and not ref.path.startswith(root + "/") for ref in root_refs), "E_PATH")
            cost = 4096 + 8 * len(root)
            budget.reserve_scan(cost)
            retained += cost
            with fs.directory(root) as fd:
                root_info = os.fstat(fd)
                if mode == "snapshot":
                    _require(root_info.st_uid == root_info.st_gid == 0 and stat.S_IMODE(root_info.st_mode) == 0o700, "E_IDENTITY")
                identity = _bc_frozen_identity(root_info)
                _require(identity[:2] not in root_ids, "E_PATH", "根别名不能重领额度")
                root_ids.add(identity[:2])
                root_refs.append(_BCTreeRoot(root, identity))
                totals = [0, 0]
                visit(fd, root, "", identity[0], budget._scope(), totals)
                members.append((root, totals[0]))
                regulars.append((root, totals[1]))
                _require(_bc_frozen_identity(os.fstat(fd)) == identity, "E_DRIFT")
        # 先完成所有树，再复读全部根的完整六值身份。
        for ref in root_refs:
            with fs.directory(ref.path) as fd:
                _require(_bc_frozen_identity(os.fstat(fd)) == ref.identity, "E_DRIFT")
        tuple_charge = 1024 + 8 * (len(entries) + 3 * len(root_refs))
        budget.reserve_scan(tuple_charge)
        return _BCTreePlan(tuple(root_refs), tuple(entries), tuple(members), tuple(regulars), retained + tuple_charge)
    finally:
        budget.release_scan(_BC_TREE_WORK)


def _bc_execute_tree_plan(fs: _Fs, plan: _BCTreePlan, *, budget: _BCBudget,
                           before_delete: Callable[[], None],
                           expected_roots: tuple[_BCTreeRoot, ...] | None = None) -> None:
    """消费已扫描的后序清单；索引与复验仍计同一预算，不回退递归删除。"""
    index_charge = 4096 + 1024 * (len(plan.entries) + len(plan.roots))
    budget.reserve_scan(index_charge)
    index = {(entry.root, entry.relative_path): entry for entry in plan.entries}
    authorized = {ref.path: ref.identity for ref in (expected_roots if expected_roots is not None else plan.roots)}
    budget.reserve_scan(_BC_TREE_WORK)

    def current(fd: int, name: str, entry: _BCTreeEntry, *, changed_children: bool = False) -> None:
        info = os.stat(name, dir_fd=fd, follow_symlinks=False)
        actual = _bc_frozen_identity(info)
        _require((actual[:5] == entry.identity[:5] if changed_children else actual == entry.identity), "E_DRIFT")
        if entry.kind == "file":
            _require(info.st_size == entry.logical_size, "E_DRIFT")
        if entry.kind == "symlink":
            _require(os.readlink(os.fsencode(name), dir_fd=fd) == entry.link_text, "E_DRIFT")

    @contextmanager
    def bound_parent(entry: _BCTreeEntry) -> Iterator[tuple[int, str]]:
        # 按原根身份和已扫祖先逐级取得 fd，不能经替换后的同名根删除旧清单对象。
        with fs.directory(entry.root) as root_fd:
            _require(_bc_frozen_identity(os.fstat(root_fd))[:5] == authorized[entry.root][:5], "E_DRIFT")
            fd = os.dup(root_fd)
            prefix = ""
            parts = entry.relative_path.split("/")
            try:
                for part in parts[:-1]:
                    prefix = prefix + "/" + part if prefix else part
                    expected = index.get((entry.root, prefix))
                    _require(expected is not None and expected.kind == "directory", "E_DRIFT")
                    nested = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=fd)
                    try:
                        _require(_bc_frozen_identity(os.fstat(nested))[:5] == expected.identity[:5], "E_DRIFT")
                    except BaseException:
                        os.close(nested)
                        raise
                    os.close(fd)
                    fd = nested
                yield fd, parts[-1]
            finally:
                os.close(fd)

    try:
        _require(len(authorized) == len(plan.roots), "E_DRIFT")
        for ref in plan.roots:
            _require(ref.path in authorized and ref.identity[:5] == authorized[ref.path][:5], "E_DRIFT", "扫描根必须绑定原删除资格")
        # 首删前逐目录复验全集，新增项也会失败；不先删除第一棵再检查第二棵。
        for ref in plan.roots:
            scope = budget._scope()
            visited = 0
            with fs.directory(ref.path) as fd:
                _require(_bc_frozen_identity(os.fstat(fd)) == ref.identity, "E_DRIFT")
            directories = (("", ref.path),)
            for relative, full in directories:
                with fs.directory(full) as fd, os.scandir(fd) as children:
                    for child in children:
                        budget.add("members", 1, scope=scope)
                        entry = index.get((ref.path, child.name))
                        _require(entry is not None, "E_DRIFT")
                        current(fd, child.name, entry)
                        visited += 1
            for entry in plan.entries:
                if entry.root != ref.path or entry.kind != "directory":
                    continue
                with bound_parent(entry) as (parent, leaf):
                    fd = os.open(leaf, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=parent)
                    try:
                        _require(_bc_frozen_identity(os.fstat(fd)) == entry.identity, "E_DRIFT")
                        with os.scandir(fd) as children:
                            for child in children:
                                budget.add("members", 1, scope=scope)
                                nested = index.get((ref.path, entry.relative_path + "/" + child.name))
                                _require(nested is not None, "E_DRIFT")
                                current(fd, child.name, nested)
                                visited += 1
                    finally:
                        os.close(fd)
            expected = next(count for root, count in plan.members_by_root if root == ref.path)
            _require(visited == expected, "E_DRIFT")
        before_delete()
        for entry in plan.entries:
            before_delete()
            with bound_parent(entry) as (fd, name):
                current(fd, name, entry, changed_children=entry.kind == "directory")
                if entry.kind == "directory":
                    # rmdir 原子拒绝新增子项；只消费清单，不发现并删除未知对象。
                    os.rmdir(name, dir_fd=fd)
                else:
                    os.unlink(name, dir_fd=fd)
                os.fsync(fd)
        for ref in plan.roots:
            before_delete()
            fs.remove(ref.path, dict(zip(IDENTITY_KEYS, authorized[ref.path])), directory=True)
    finally:
        index.clear()
        authorized.clear()
        budget.release_scan(_BC_TREE_WORK)
        budget.release_scan(index_charge)


def _remove_tree(fs: _Fs, path: str, identity: dict[str, int]) -> None:
    """单棵树的私有调用也必须消费完整有界计划；事务清理使用下方全集入口。"""
    budget = _BCBudget()
    budget.reserve_scan(4096 + 4 * len(path))
    _same(fs.ref(path)["identity"], identity, directory_children=True)
    original = (_BCTreeRoot(path, tuple(identity[key] for key in IDENTITY_KEYS)),)
    plan = _bc_scan_trees(fs, (path,), mode="delete", budget=budget)
    _bc_execute_tree_plan(fs, plan, budget=budget, before_delete=lambda: None, expected_roots=original)


def _execute_prune(transaction: _Transaction, record: dict[str, Any], receipt: dict[str, Any]) -> None:
    fs = transaction.fs
    plan = receipt["prune_plan"]
    _validate_prune(plan, record)
    budget = _BCBudget()
    # 既有正式计划、下列候选/缺席/单文件表及六值身份的保守容量；先预留再构造。
    budget.reserve_scan(16384 + 4096 * sum(len(plan[key]) for key in plan))
    roots: list[str] = []
    original_roots: list[_BCTreeRoot] = []
    absent: list[str] = []
    files: list[tuple[str, dict[str, int], int, bytes | None]] = []

    def protected() -> None:
        _require(not fs.exists(MAINTENANCE_PATH) and not fs.exists(PRESERVE_PATH), "E_STATE", "全局保护现场禁止清理")
        current_roots = {_link_target(fs, path, fs.link(path)).rsplit("/", 1)[0] for path in CURRENT.values()}
        _require(not any(ref["path"] in current_roots for ref in plan["releases"]), "E_STATE", "计划与实际 current 保护冲突")
        _require(not any(fs.exists(path) for path in absent), "E_DRIFT", "原缺席对象重新出现")
        _require(not any(fs.exists(ref["path"] + "/PRESERVE") for ref in plan["releases"]), "E_STATE")

    def add_file(path: str, identity: dict[str, int], *, link: bool = False) -> None:
        if not fs.exists(path):
            absent.append(path)
            return
        _bc_path(path[1:], budget=budget)
        with fs.parent(path) as (fd, name):
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            _same(_identity(info), identity)
            if link:
                _require(0 <= info.st_size <= 4096, "E_PATH")
                text = os.readlink(os.fsencode(name), dir_fd=fd)
                _require(len(text) <= 4096, "E_PATH")
            else:
                budget._check("file", info.st_size)
                text = None
            files.append((path, identity, info.st_size, text))

    protected()
    for ref in plan["releases"]:
        if fs.exists(ref["path"]):
            _same(fs.ref(ref["path"])["identity"], ref["identity"], directory_children=True)
            roots.append(ref["path"])
            original_roots.append(_BCTreeRoot(ref["path"], tuple(ref["identity"][key] for key in IDENTITY_KEYS)))
        else:
            absent.append(ref["path"])
    for item in plan["payloads"]:
        path = transaction.upload + "/" + item["relative_path"]
        if item["relative_path"] == "rollback":
            if fs.exists(path):
                _same(fs.ref(path)["identity"], item["identity"], directory_children=True)
                roots.append(path)
                original_roots.append(_BCTreeRoot(path, tuple(item["identity"][key] for key in IDENTITY_KEYS)))
            else:
                absent.append(path)
        else:
            add_file(path, item["identity"])
    for item in plan["temporary_links"]:
        add_file(_temporary_link(transaction.txn_id, item["slot"], item["role"]), item["identity"], link=True)
    tree_plan = _bc_scan_trees(fs, roots, mode="delete", budget=budget)
    # 所有普通待删项也先完成资源与身份复验，之后才进入第一棵树的删除。
    def verify_file(item: tuple[str, dict[str, int], int, bytes | None]) -> None:
        path, identity, size, link = item
        with fs.parent(path) as (fd, name):
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            _same(_identity(info), identity)
            _require(info.st_size == size, "E_DRIFT")
            if link is not None:
                _require(os.readlink(os.fsencode(name), dir_fd=fd) == link, "E_DRIFT")
    for item in files:
        verify_file(item)
    _bc_execute_tree_plan(fs, tree_plan, budget=budget, before_delete=protected, expected_roots=tuple(original_roots))
    for item in files:
        protected()
        verify_file(item)
        fs.remove(item[0], item[1])
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
    cleanup_event = _P1_CLEANUP_EVENT
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
            # 恢复及首次 finalize 的共同只读门；不凭 current 文本或健康响应认定实际进程。
            _revalidate_target_services(transaction, lease_fd)
            try:
                transaction.barrier(receipt)
                if phase in ("exposing", "committing"):
                    _isolate(fs, stop=False)
                maintained = _maintained_gates(transaction, record, receipt, lease_fd=lease_fd)
                transaction.p1_freshness = maintained["p1_freshness"]
            except _P1HoldReleased:
                raise
            except (OSError, TransactionError, ValueError) as error:
                _p1_preserve_hold(cleanup_event)
                if phase in ("exposing", "committing"):
                    _isolate_if_uncommitted(transaction, lease_fd)
                raise TransactionError("E_GATES", "维护态门失败，保留恢复材料") from error
            try:
                _revalidate_target_services(transaction, lease_fd)
                if phase in ("deploying", "restored"):
                    receipt, identity = transaction.advance(record, receipt, identity, "exposing")
                # 原子发布和目录 fsync 全部返回之后才允许第一个正常流量副作用。
                fs.remove(MAINTENANCE_PATH, fs.info(MAINTENANCE_PATH), before_remove=transaction.p1_freshness)
                transaction.p1_exposed = True
                opened = _public_gates(transaction, record, receipt, maintained["run_epoch"])
                _revalidate_target_services(transaction, lease_fd)
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
            except _P1HoldReleased:
                raise
            except (OSError, TransactionError, ValueError) as error:
                _p1_preserve_hold(cleanup_event)
                # 不凭内存 phase 推断刚才 rename 的结果；驱动下一步必须持锁复读正式回执。
                try:
                    _isolate_if_uncommitted(transaction, lease_fd)
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
        _p1_starting(txn_id)
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


def _cgroup_members(fs: _Fs, path: str) -> list[bytes]:
    members, _ = fs.read(path + "/cgroup.procs")
    with fs.directory(path) as fd:
        _require(not any(stat.S_ISDIR(os.stat(name, dir_fd=fd, follow_symlinks=False).st_mode)
                         for name in os.listdir(fd)), "E_BINDING", "unit 含未证明的子 cgroup")
    return members.split()


def _writer_identity(fs: _Fs, backend: dict[str, Any], role: str, command: str,
                     phases: dict[str, str], hashes: list[str], show: Any) -> tuple[str, bytes, str]:
    """只读绑定 systemd 实例与内核进程；不把 proc 当作 root 所有的发布制品。"""
    pid, invocation, group = show("MainPID"), show("InvocationID"), show("ControlGroup")
    _require(re.fullmatch(r"[1-9][0-9]*", pid) is not None and show("ExecMainPID") == pid, "E_BINDING")
    _require(re.fullmatch(r"[0-9a-f]{32}", invocation) is not None and invocation != "0" * 32, "E_BINDING")
    _require(group == "/system.slice/myagent-" + role + ".service", "E_BINDING")
    with fs.directory("/proc") as proc:
        process = os.open(pid, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=proc)
        try:
            identity = os.fstat(process)

            def read(name: str) -> bytes:
                fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK, dir_fd=process)
                try:
                    _require(stat.S_ISREG(os.fstat(fd).st_mode), "E_BINDING")
                    chunks, length = [], 0
                    while True:
                        chunk = os.read(fd, min(65536, 4 * 1024 * 1024 + 1 - length))
                        if not chunk:
                            return b"".join(chunks)
                        chunks.append(chunk)
                        length += len(chunk)
                        _require(length <= 4 * 1024 * 1024, "E_BINDING")
                finally:
                    os.close(fd)

            def started() -> bytes:
                raw = read("stat")
                fields = raw.rpartition(b") ")[2].split()
                _require(raw.startswith(pid.encode() + b" (") and len(fields) >= 20
                         and fields[19].isdigit() and int(fields[19]) > 0, "E_BINDING")
                return fields[19]

            start = started()
            _require(read("cmdline") == b"\0".join(part.encode("ascii") for part in command.split()) + b"\0", "E_BINDING")
            _require(read("cgroup") == ("0::" + group + "\n").encode("ascii"), "E_BINDING")
            _require(_cgroup_members(fs, "/sys/fs/cgroup" + group) == [pid.encode("ascii")],
                     "E_BINDING", "unit 含未证明归属的额外进程")
            root = backend["directory"]["path"]
            expected_cwd = fs.ref(root + ("/ui/backend" if role == "gateway" else ""))["identity"]
            _same(_identity(os.stat("cwd", dir_fd=process)), expected_cwd, directory_children=True)
            # venv 的解释器可以是链接；它的 inode 只是与 cwd/argv/cgroup 联合使用的证据。
            with fs.parent(root + "/.venv/bin/python") as (parent, name):
                expected_exe = os.stat(name, dir_fd=parent)
            actual_exe = os.stat("exe", dir_fd=process)
            _require(stat.S_ISREG(expected_exe.st_mode) and (actual_exe.st_dev, actual_exe.st_ino) ==
                     (expected_exe.st_dev, expected_exe.st_ino), "E_BINDING")
            expected = {"BRAIN_RELEASE_SHA": backend["revision"], "LINGXI_PERSONA_SCHEMA_PHASE": phases["persona_schema"],
                        "LINGXI_PERSONA_GROWTH_PHASE": phases["persona_growth"], "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": phases["world_ledger"],
                        "LINGXI_PERSONA_GROWTH_CANARY_HASHES": ",".join(hashes)}
            entries = read("environ").split(b"\0")
            for key, value in expected.items():
                prefix = key.encode("ascii") + b"="
                _require([entry for entry in entries if entry.startswith(prefix)] == [prefix + value.encode("ascii")], "E_PHASE")
            _require(started() == start and show("MainPID") == pid and show("ExecMainPID") == pid
                     and show("InvocationID") == invocation and show("ControlGroup") == group, "E_DRIFT")
            current = os.stat(pid, dir_fd=proc, follow_symlinks=False)
            _require((current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino), "E_DRIFT")
            return pid, start, invocation
        finally:
            os.close(process)


def _empty_unit_identity(fs: _Fs, role: str, show: Any) -> tuple[str, bytes, str]:
    """仅用于原回滚或失败隔离；R0 恢复不能以此获得 start 资格。"""
    group = "/system.slice/myagent-" + role + ".service"
    _require(show("MainPID") == "0" and show("ControlGroup") in ("", group), "E_BINDING")
    path = "/sys/fs/cgroup" + group
    # 先证明观察入口存在；缺失整个 cgroup 层级不能当作服务组已空。
    with fs.directory("/sys/fs/cgroup/system.slice"):
        pass
    if fs.exists(path):
        _require(_cgroup_members(fs, path) == [], "E_BINDING")
    return "0", b"", show("InvocationID")


def _revalidate_target_services(transaction: _Transaction, lease_fd: int | None,
                                *, allow_missing_lease: bool = False, require_active: bool = True,
                                rollback_recovery: bool = False, evidence: dict[str, Any] | None = None) -> dict[str, str]:
    """业务副作用前只读证明加载配置与 writer；R0 额外要求双 active。"""
    fs = transaction.fs
    record, receipt, _ = transaction.load()
    _lock(fs, transaction.lock_fd)
    _lease(fs, transaction.txn_id, lease_fd, allow_missing=allow_missing_lease)
    _require(receipt["phase"] in (PRE_EXPOSING if rollback_recovery else ("deploying", "restored", "exposing", "committing")), "E_STATE")
    rollback = receipt["operation"] == "rollback"
    if rollback_recovery:
        _require(record["rollback_floor"]["auto_rollback_allowed"], "E_FLOOR")
        _verify_backups(transaction, record)
        _verify_intended_links(transaction, record, receipt)
        _require(_pre_exposing_consistent(transaction, record, receipt), "E_STATE")
        # 合法切链中断可为 mixed；运行进程仍须绑定此刻 backend 指向的真实目录。
        backend_target = _link_target(fs, CURRENT["backend"], fs.link(CURRENT["backend"]))
        rollback = backend_target == record["previous"]["backend"]["directory"]["path"]
    bundle = record["previous" if rollback else "candidate"]
    phases = record["previous_phase" if rollback else "phase"]
    hashes = record["previous_canary_hashes" if rollback else "canary_hashes"]
    template_bundles = [bundle]
    if rollback_recovery:
        # 切链与配置恢复有合法先后顺序；已加载配置可仍为记录中的任一已知版本。
        phases, hashes = _unit_phases(fs)
        template_bundles = [record[name] for name, phase_key, hashes_key in (
            ("previous", "previous_phase", "previous_canary_hashes"), ("candidate", "phase", "canary_hashes"))
            if (record[phase_key], record[hashes_key]) == (phases, hashes)]
        _require(bool(template_bundles), "E_PHASE")
        for known in template_bundles:
            _verify_bundle(fs, known)
    _verify_bundle(fs, bundle)
    _verify_intended_links(transaction, record, receipt, complete=not rollback_recovery)
    _require(_unit_phases(fs) == (phases, hashes), "E_PHASE")
    if fs.exists(MAINTENANCE_PATH):
        _require(fs.read(MAINTENANCE_PATH)[0] == b"", "E_IDENTITY")
    replacements = {"LINGXI_PERSONA_SCHEMA_PHASE": phases["persona_schema"], "LINGXI_PERSONA_GROWTH_PHASE": phases["persona_growth"],
                    "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": phases["world_ledger"], "LINGXI_PERSONA_GROWTH_CANARY_HASHES": ",".join(hashes)}
    python = CURRENT["backend"] + "/.venv/bin/python"
    commands = {"world": python + " -m brain.workspace.world_server",
                "gateway": python + " -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1 --proxy-headers --no-access-log --ws-max-size 16384"}
    states = {}
    writers = {}
    loaded_properties = {}
    unit_images = {}
    def verify_active_links() -> None:
        expected_links = ((receipt["restore_plan"]["replacement_links"] if receipt["operation"] == "rollback"
                           else record["current_links"]) if rollback_recovery and rollback else None)
        if expected_links is not None:
            _require(all(fs.link(CURRENT[slot]) == expected_links[slot] for slot in SLOTS), "E_DRIFT")
        else:
            _verify_intended_links(transaction, record, receipt, complete=True)
    for role, command in commands.items():
        unit = "myagent-" + role + ".service"
        path = CONFIG[role + "_unit"][0]
        properties = loaded_properties[role] = {}

        def show(property_name: str) -> str:
            value = _command(["systemctl", "show", unit, "-p", property_name, "--value"]).decode("utf-8").strip()
            _require(property_name not in properties or properties[property_name] == value, "E_DRIFT")
            properties[property_name] = value
            return value

        # 使用绑定 release 内的模板及原安装器的四项纯字节替换，不安装或重载 unit。
        templates = []
        for known in template_bundles:
            rendered, _ = fs.read(known["backend"]["directory"]["path"] + "/ops/systemd/" + unit)
            for key, value in replacements.items():
                rendered = rendered.replace(("@" + key + "@").encode("ascii"), value.encode("ascii"))
            templates.append(rendered)
        raw, identity = fs.read(path)
        unit_images[role] = raw, identity
        _require(raw in templates and stat.S_IMODE(identity["mode"]) == 0o644, "E_BINDING")
        if receipt["phase"] == "committing":
            _require(_digest(raw) == receipt["terminal"]["proof"]["unit_sha256"][role], "E_DRIFT")
        working_directory = CURRENT["backend"] + ("/ui/backend" if role == "gateway" else "")
        lines = raw.decode("utf-8").split("\n")
        _require(lines.count("WorkingDirectory=" + working_directory) == 1 and lines.count("ExecStart=" + command) == 1,
                 "E_BINDING")
        for property_name, expected in {"FragmentPath": path, "SourcePath": "", "DropInPaths": "", "LoadState": "loaded",
                                        "NeedDaemonReload": "no", "WorkingDirectory": working_directory,
                                        "ExecCondition": "", "ExecStartPre": "", "ExecStartPost": "", "ExecStop": "", "ExecStopPost": ""}.items():
            _require(show(property_name) == expected, "E_BINDING", "实际 unit 加载信息不属于绑定目标")
        loaded = show("ExecStart")
        prefix = "{ path=" + python + " ; argv[]=" + command + " ; ignore_errors=no ; "
        _require(loaded.startswith(prefix) and re.fullmatch(
            r"start_time=[^;{}]* ; stop_time=[^;{}]* ; pid=[0-9]+ ; code=[^;{}]* ; status=[^;{}]* \}", loaded[len(prefix):]) is not None,
            "E_BINDING", "实际 ExecStart 不属于绑定目标")
        expected_files = []
        for line in lines:
            if line.startswith("EnvironmentFile="):
                value = line[len("EnvironmentFile="):]
                expected_files.extend([value.removeprefix("-"), "(ignore_errors=yes)" if value.startswith("-") else "(ignore_errors=no)"])
        _require(shlex.split(show("EnvironmentFiles")) == expected_files, "E_BINDING")
        states[unit] = show("ActiveState")
        _require(states[unit] in (("active",) if require_active else ("active", "inactive", "failed")),
                 "E_SERVICES", "HOLD：服务状态未满足本次动作资格")
        _command(["systemctl", "is-enabled", "--quiet", unit])
        if states[unit] == "active":
            writers[role] = _writer_identity(fs, bundle["backend"], role, command, phases, hashes, show)
            _require(" ; pid=" + writers[role][0] + " ; " in loaded, "E_BINDING")
            # active writer 不允许仅以 mixed 的 frontend/current 关系放行。
            verify_active_links()
        else:
            writers[role] = _empty_unit_identity(fs, role, show)
    refreshed_record, refreshed, _ = transaction.load()
    _require(refreshed_record == record and refreshed == receipt, "E_DRIFT")
    _verify_intended_links(transaction, record, receipt, complete=not rollback_recovery)
    _require(_unit_phases(fs) == (phases, hashes), "E_PHASE")
    _lock(fs, transaction.lock_fd)
    _lease(fs, transaction.txn_id, lease_fd, allow_missing=allow_missing_lease)
    # 材料及加载配置复读完毕，再确认两者仍是同一次 writer；尾部不再调用 phase 命令。
    for role, command in commands.items():
        unit = "myagent-" + role + ".service"
        def show(property_name: str) -> str:
            return _command(["systemctl", "show", unit, "-p", property_name, "--value"]).decode("utf-8").strip()
        _require(all(show(key) == value for key, value in loaded_properties[role].items()), "E_DRIFT")
        _require(fs.read(CONFIG[role + "_unit"][0]) == unit_images[role], "E_DRIFT")
        _require(show("ActiveState") == states[unit], "E_DRIFT")
        current_writer = (_writer_identity(fs, bundle["backend"], role, command, phases, hashes, show)
                          if states[unit] == "active" else _empty_unit_identity(fs, role, show))
        _require(current_writer == writers[role], "E_DRIFT")
    # 外部只读命令完成后，仅用 fd 文件读取重验材料，避免尾轮取证掩盖现场漂移。
    refreshed_record, refreshed, _ = transaction.load()
    _require(refreshed_record == record and refreshed == receipt, "E_DRIFT")
    _verify_intended_links(transaction, record, receipt, complete=not rollback_recovery)
    if "active" in states.values():
        verify_active_links()
    _verify_bundle(fs, bundle)
    _require(all(fs.read(CONFIG[role + "_unit"][0]) == unit_images[role] for role in commands), "E_DRIFT")
    _lock(fs, transaction.lock_fd)
    _lease(fs, transaction.txn_id, lease_fd, allow_missing=allow_missing_lease)
    if evidence is not None:
        _require(type(evidence) is dict and not evidence, "E_ARGUMENT")
        evidence.update(copy.deepcopy({"writers": writers, "units": unit_images, "loaded": loaded_properties,
                                       "links": {slot: fs.link(path) for slot, path in CURRENT.items()}}))
    return states


def _resume(txn_id: str, fs: _Fs, lock_fd: int, *, cleanup_only: bool = False,
            allow_revalidation: bool = True) -> dict[str, Any]:
    cleanup_event = _P1_CLEANUP_EVENT
    lease_fd = _open_lease(fs)
    isolation_started = False
    try:
        transaction = _Transaction(fs, txn_id, lock_fd)
        _, persisted, _ = transaction.load()
        if persisted["phase"] != "closed":
            _lease(fs, txn_id, lease_fd, allow_missing=True, releasing=persisted["phase"] == "lease-releasing")
        state = verify_previous(txn_id=txn_id, purpose="recovery", lock_fd=lock_fd, lease_fd=lease_fd)
        action = state["action"]
        if action == "none":
            return state
        if cleanup_only:
            _require(action in ("resume-cleanup", "finish-lease"), "E_STATE", "清理入口不得执行业务恢复")
        if action == "manual-recovery":
            raise TransactionError("E_STATE", "HOLD：需要人工恢复，已保留现场")
        if action == "revalidate-commit" and not allow_revalidation:
            raise _P1ObservationFailure()
        if action in ("resume-rollback", "revalidate-commit"):
            # 分类和 lease 不证明 writer；政策与双 unit 全部通过后才允许修改维护态。
            _observation_policy()
            _revalidate_target_services(transaction, lease_fd, allow_missing_lease=True,
                                        require_active=action == "revalidate-commit", rollback_recovery=action == "resume-rollback")
            isolation_started = True
            _isolate(fs, stop=action == "resume-rollback")
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
            _p1_starting(txn_id)
            _command(["systemctl", "restart", "myagent-world.service", "myagent-gateway.service"])
        return finalize_transaction(txn_id=txn_id, lock_fd=lock_fd, lease_fd=lease_fd)
    except _P1HoldReleased:
        raise
    except (OSError, TransactionError):
        _p1_preserve_hold(cleanup_event)
        if isolation_started and not cleanup_only:
            try:
                _isolate_if_uncommitted(_Transaction(fs, txn_id, lock_fd), lease_fd)
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
    cleanup_event = _P1_CLEANUP_EVENT
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
                    except _P1HoldReleased:
                        raise
                    except (OSError, TransactionError):
                        _p1_preserve_hold(cleanup_event)
                        _resume(args.txn_id, fs, lock_fd, allow_revalidation=False)
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
