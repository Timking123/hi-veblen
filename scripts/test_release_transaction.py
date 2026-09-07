#!/usr/bin/env python3
"""在私有 Linux 临时根执行真实事务；仅替换服务、网络和独立制品来源边界。"""

from __future__ import annotations

import copy
import builtins
import io
import importlib
import json
import math
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from contextlib import ExitStack, contextmanager
from unittest.mock import patch

import release_transaction as transaction
import validate_release_health as health_validator


POSIX = sys.platform == "linux" and hasattr(os, "geteuid") and os.geteuid() == 0
PORTAL = "a" * 40
BACKEND = "b" * 40
PREVIOUS = "c" * 40
TXN = f"run-31-2-{PORTAL}"
PHASES = {"persona_schema": "compat", "persona_growth": "compat", "world_ledger": "compat"}
RESERVED_PHASE = "LINGXI_WORLD_LEDGER_SCHEMA_PHASE"
# 明确只替换 P6 内部接口；真正的 1800 秒调度和 worker 由跨仓固定源码另验。
P1_WATCHER_FIXTURE = b'''import builtins
class _P1ObservationError(RuntimeError):
    pass
class _P1WorkerCleanupError(RuntimeError):
    pass
def _observe_myweb_p1(*, gateway, expected_revision, expected_epoch, health_validator_source,
                     expected_phases, expected_canary_hashes, revalidate_instance, sync_sample):
    return builtins._myweb_p1_fixture(_P1ObservationError, _P1WorkerCleanupError,
        gateway=gateway, expected_revision=expected_revision, expected_epoch=expected_epoch,
        health_validator_source=health_validator_source, expected_phases=expected_phases,
        expected_canary_hashes=expected_canary_hashes, revalidate_instance=revalidate_instance,
        sync_sample=sync_sample)
'''
# 与真实 python-dotenv parse_stream 对照；只统计成功且具有赋值的键。
DOTENV_CASES = [
    ("单引号同值", "'" + RESERVED_PHASE + "'=compat\n", [RESERVED_PHASE]),
    ("空值", "export '" + RESERVED_PHASE + "'=\n", [RESERVED_PHASE]),
    ("无赋值", "'" + RESERVED_PHASE + "'\n", []),
    ("双引号键是字面键", '"' + RESERVED_PHASE + '"=active\n', ['"' + RESERVED_PHASE + '"']),
    ("多行单引号值", "NOTE='hello\n" + RESERVED_PHASE + "=active\nend'\n", ["NOTE"]),
    ("多行双引号值", 'NOTE="hello\n' + RESERVED_PHASE + '=active\nend"\n', ["NOTE"]),
    ("键跨物理行", "'NOTE\n" + RESERVED_PHASE + "'=value\n", ["NOTE\n" + RESERVED_PHASE]),
    ("错误行恢复", "BAD='value' trailing\n'" + RESERVED_PHASE + "'=compat\n", [RESERVED_PHASE]),
    *[("物理换行" + repr(end), "NOTE=value" + end + "export\t'" + RESERVED_PHASE + "'=compat" + end,
       ["NOTE", RESERVED_PHASE]) for end in ("\r\n", "\r", "\n")],
    *[("控制空白export" + repr(space), "export" + space + "'" + RESERVED_PHASE + "'" + space + "=compat\n",
       [RESERVED_PHASE]) for space in ("\t", "\v", "\f", "\x85", "\u2028", "\u2029")],
    *[("值内非物理换行" + repr(space), "NOTE=value" + space + RESERVED_PHASE + "=active\n", ["NOTE"])
      for space in ("\v", "\f", "\x85", "\u2028", "\u2029")],
]


class FormatTests(unittest.TestCase):
    def test_policy_holds_before_any_production_access(self) -> None:
        with patch.object(transaction, "_entry_lock", side_effect=AssertionError("不得取得生产锁")):
            self.assertEqual(transaction.main(["policy"]), 1)
            self.assertEqual(transaction.main(["deploy", TXN, BACKEND, "d" * 64, "compat", "compat", "compat", "-"]), 1)

    def test_canonical_rejects_ambiguous_bytes(self) -> None:
        for raw in (b'{"x":1,"x":1}\n', b'{"x":NaN}\n', b'{"x":1}\r\n', b'\xef\xbb\xbf{"x":1}\n', b'{ "x":1}\n'):
            with self.subTest(raw=raw), self.assertRaises(transaction.TransactionError):
                transaction._decode_json(raw, 1024, "E_RECORD_INVALID")

    def test_arguments_and_phase_shapes(self) -> None:
        for value in (True, "run-01-2-" + PORTAL, "run-0-2-" + PORTAL, "run-18446744073709551616-2-" + PORTAL,
                      "run-31-2-" + PORTAL.upper(), "../run-31-2-" + PORTAL):
            with self.subTest(value=value), self.assertRaises(transaction.TransactionError):
                transaction._txn(value)
        for phases, hashes in (({**PHASES, "world_ledger": ""}, []), ({**PHASES, "extra": "compat"}, []),
                               ({**PHASES, "persona_growth": "active"}, []), (PHASES, ["d" * 64]),
                               ({**PHASES, "persona_schema": "active", "persona_growth": "canary"}, ["d" * 64, "c" * 64])):
            with self.subTest(phases=phases, hashes=hashes), self.assertRaises(transaction.TransactionError):
                transaction._validate_phases(phases, hashes)

    def test_exact_release_bytes(self) -> None:
        raw = transaction._release_env(BACKEND)
        self.assertEqual(raw.splitlines(), [("BRAIN_RELEASE_SHA=" + BACKEND).encode(),
                                          b"LINGXI_PERSONA_SCHEMA_CAPABILITY=dual-read-v1",
                                          b"LINGXI_WORLD_LEDGER_SCHEMA_CAPABILITY=dual-read-v2-preserve"])
        self.assertTrue(raw.endswith(b"\n"))
        self.assertEqual(len(transaction._release_env(BACKEND, True).splitlines()), 2)


@unittest.skipUnless(POSIX, "需要 root Linux 的真实 no-follow/dir-fd/flock/fsync；Windows 不冒充通过")
class TransactionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="myweb-release-transaction-")
        self.root = Path(self.temporary.name)
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.addCleanup(self.temporary.cleanup)
        self.upload, self.rollback, self.candidate = transaction._locations(TXN)
        self.old = transaction.RELEASES_ROOT + "/release-previous"
        self.active = True
        self.stopped_units: set[str] = set()
        self.loaded_environment_files = False
        self.counter = 10
        self.epoch = "hb_" + "e" * 32
        self.events: list[str] = []
        self.watcher_failure: str | None = None
        self.p1_now = 100.0
        self.p1_calls = 0
        self.p1_freshness_calls = 0
        self.p1_after_observation = None
        self.p1_invocations = {"world": "a" * 32, "gateway": "a" * 32}
        self.p1_start_count = 0
        for attribute in ("_P1_EPOCHS", "_P1_STARTS", "_P1_INSTANCES"):
            if hasattr(transaction, attribute):
                self.stack.enter_context(patch.dict(getattr(transaction, attribute), clear=True))
        self.policy = (0.001, 1.8, 1.0)
        self.artifacts = {key: (Path(__file__).parent / filename).read_bytes() for key, filename in transaction.CONTROL.items()}
        for directory in (transaction.WEB_ROOT, transaction.PROJECT_ROOT, transaction.RELEASES_ROOT,
                          transaction.STAGING_ROOT, self.upload, "/run", transaction.LEASE_PATH,
                          "/etc/systemd/system", "/etc/nginx/sites-available", "/etc/nginx/sites-enabled", "/etc/apparmor.d"):
            self.directory(directory)
        for base, portal, backend in ((self.old, PREVIOUS, PREVIOUS), (self.candidate, PORTAL, BACKEND)):
            for slot in transaction.SLOTS:
                root = base + "/" + slot
                self.directory(root)
                self.write(root + "/release.txt", ((portal if slot == "portal" else backend) + "\n").encode())
                if slot != "backend":
                    self.write(root + "/index.html", b'<div id="app"></div><div id="root"></div><script src="/assets/main.js"></script>')
                    self.write(root + "/assets/main.js", b"https://lingxi.hi-veblen.com/")
                else:
                    self.directory(root + "/ui/backend")
                    self.write(root + "/.venv/bin/python", b"fixture interpreter\n", 0o755)
                    self.write(root + "/.release.env", transaction._release_env(backend))
                    self.write(root + "/ops/apparmor/myagent-persona-parser", b"# fixture profile\n")
                    self.write(root + "/ops/nginx/hi-veblen.com.http.conf", self.nginx())
                    self.write(root + "/scripts/p6_heartbeat_watch.py", P1_WATCHER_FIXTURE)
                    for role in ("world", "gateway"):
                        self.write(root + "/ops/systemd/myagent-" + role + ".service", self.unit_bytes(role=role))
        for slot, current in transaction.CURRENT.items():
            os.symlink(self.old + "/" + slot, self.path(current))
        for key, (path, _) in transaction.CONFIG.items():
            if key.endswith("_enabled"):
                available = transaction.CONFIG[key.replace("_enabled", "_available")][0]
                os.symlink(available, self.path(path))
            elif key.endswith("_unit"):
                self.write(path, self.unit_bytes(role=key.removesuffix("_unit")))
            elif key == "apparmor_profile":
                self.write(path, b"# fixture profile\n")
            else:
                self.write(path, self.nginx())
        self.write(self.upload + "/PRESERVE", b"", 0o600)
        self.write(transaction.LEASE_PATH + "/owner", b"31-2\n", 0o600)
        self.write(transaction.LOCK_PATH, b"", 0o600)
        self.lock_fd = os.open(self.path(transaction.LOCK_PATH), os.O_RDWR)
        transaction.fcntl.flock(self.lock_fd, transaction.fcntl.LOCK_EX)
        self.lease_fd = os.open(self.path(transaction.LEASE_PATH), os.O_RDONLY | os.O_DIRECTORY)
        self.stack.callback(os.close, self.lock_fd)
        self.stack.callback(os.close, self.lease_fd)
        self.stack.enter_context(patch.object(transaction, "_open_root_fd", side_effect=lambda: os.open(self.root, os.O_RDONLY | os.O_DIRECTORY)))
        self.stack.enter_context(patch.object(transaction, "_control_sources", side_effect=lambda: dict(self.artifacts)))
        self.stack.enter_context(patch.object(transaction, "_command", side_effect=self.command))
        self.stack.enter_context(patch.object(transaction, "_http", side_effect=self.http))
        self.stack.enter_context(patch.object(transaction, "_apparmor_loaded", side_effect=lambda: self.path(transaction.CONFIG["apparmor_profile"][0]).exists()))
        self.stack.enter_context(patch.object(transaction, "_observation_policy", side_effect=lambda: self.policy))
        self.stack.enter_context(patch.object(builtins, "_myweb_p1_fixture", self.p1_observe, create=True))
        original_open = open

        def kernel_open(path, *args, **kwargs):
            if path == "/proc/sys/kernel/apparmor_restrict_unprivileged_userns":
                return io.BytesIO(b"1\n")
            return original_open(path, *args, **kwargs)

        self.stack.enter_context(patch("builtins.open", side_effect=kernel_open))
        self.write("/proc/sys/kernel/random/boot_id", b"11111111-2222-3333-4444-555555555555\n", 0o444)
        self.writer_fixtures()

    def path(self, path: str) -> Path:
        self.assertTrue(path.startswith("/"))
        result = self.root / path[1:]
        self.assertTrue(result.is_relative_to(self.root))
        return result

    def directory(self, path: str) -> None:
        self.path(path).mkdir(parents=True, exist_ok=True, mode=0o700)

    def write(self, path: str, raw: bytes, mode: int = 0o644) -> None:
        self.path(path).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path(path).write_bytes(raw)
        self.path(path).chmod(mode)

    def unit_command(self, role: str) -> str:
        return "/opt/myagent/backend-current/.venv/bin/python -m " + ("brain.workspace.world_server" if role == "world" else
               "uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1 --proxy-headers --no-access-log --ws-max-size 16384")

    def unit_bytes(self, phases: dict[str, str] | None = None, *, role: str = "world") -> bytes:
        phases = phases or PHASES
        return ("[Service]\nWorkingDirectory=/opt/myagent/backend-current" + ("/ui/backend" if role == "gateway" else "") +
                "\nExecStart=" + self.unit_command(role) + "\nEnvironment=LINGXI_PERSONA_SCHEMA_PHASE=" + phases["persona_schema"] +
                "\nEnvironment=LINGXI_PERSONA_GROWTH_PHASE=" + phases["persona_growth"] +
                "\nEnvironment=LINGXI_WORLD_LEDGER_SCHEMA_PHASE=" + phases["world_ledger"] +
                "\nEnvironment=LINGXI_PERSONA_GROWTH_CANARY_HASHES=\n").encode()

    def nginx(self) -> bytes:
        return (b"if (-f /run/myagent-release-maintenance) { return 503; }\n" * 3 +
                b"root /opt/hi-veblen/portal-current;\nroot /opt/hi-veblen/lingxi-current;\n" +
                b"proxy_pass http://127.0.0.1:3001;\nproxy_pass http://127.0.0.1:8000;\n" +
                b"location ^~ /assets/\nlocation = /release.txt\n" * 2)

    def current_root(self, slot: str) -> str:
        return os.readlink(self.path(transaction.CURRENT[slot]))

    def health(self) -> dict:
        revision = self.path(self.current_root("backend") + "/release.txt").read_text().strip()
        self.counter += 1
        return {"ok": True, "production_auth_safe": True, "backend_revision": revision,
                "persona_schema_capability": "dual-read-v1", "persona_schema_phase": "compat",
                "world_ledger_schema_capability": "dual-read-v2-preserve", "world_ledger_schema_phase": "compat",
                "persona_import": {"ready": True}, "persona_growth": {"capability": "autonomous-growth-v1", "phase": "compat",
                                                                        "runtime_ready": True, "ready": True},
                "host": {"ok": True, "ready": True, "continuity_ok": True, "audition_isolation_ok": True,
                         "world_ledger_schema_capability": "dual-read-v2-preserve", "world_ledger_schema_phase": "compat",
                         "backend_revision": revision, "heartbeat": {"running": True, "first_fire_completed": True,
                         "first_fire_ok": True, "in_flight_timed_out": False, "consecutive_failures": 0,
                         "run_epoch": self.epoch, "completed_fires": self.counter}}}

    def http(self, url: str, *, method="GET", data=None, headers=None):
        self.events.append(method + " " + url)
        common = {"x-frame-options": "DENY", "server": "nginx", "content-security-policy": "frame-ancestors 'none'; script-src 'self'"}
        if "/api/session" in url or "/ws/" in url:
            blocked = "https://" in url and self.path(transaction.MAINTENANCE_PATH).exists()
            return (503 if blocked else 401), b"{}", common
        if url == "https://hi-veblen.com/api/auth/profile":
            return 401, b'{"code":401,"details":{"reason":"token_malformed"}}', common
        if url == "https://hi-veblen.com/api/health":
            return 200, b'{"status":"ok"}', common
        if url.endswith("/api/health"):
            return 200, json.dumps(self.health()).encode(), common
        if "/assets/release-missing-" in url:
            return 404, b"", common
        if "/assets/" in url:
            return 200, b"", {**common, "content-type": "application/javascript"}
        slot = "lingxi" if "lingxi.hi-veblen.com" in url else "portal"
        if url.endswith("/release.txt"):
            return 200, self.path(self.current_root(slot) + "/release.txt").read_bytes(), common
        return 200, self.path(self.current_root(slot) + "/index.html").read_bytes(), common

    def command(self, arguments, *, timeout=30, env=None):
        self.events.append("command " + " ".join(arguments))
        if arguments[0] == "systemctl":
            if "DropInPaths" in arguments:
                return b"\n"
            if "EnvironmentFiles" in arguments:
                if self.loaded_environment_files:
                    raw = self.path("/etc/systemd/system/" + arguments[2]).read_text(encoding="utf-8")
                    return " ".join(line[len("EnvironmentFile="):].removeprefix("-") +
                                    (" (ignore_errors=yes)" if line.startswith("EnvironmentFile=-") else " (ignore_errors=no)")
                                    for line in raw.split("\n") if line.startswith("EnvironmentFile=")).encode()
                return b"\n"
            if "Environment" in arguments:
                unit = arguments[2]
                raw = self.path("/etc/systemd/system/" + unit).read_text()
                return " ".join(line[len("Environment="):] for line in raw.splitlines() if line.startswith("Environment=")).encode()
            if "ActiveState" in arguments:
                return b"active\n" if self.active and arguments[2] not in self.stopped_units else b"inactive\n"
            if arguments[1] == "show":
                unit, property_name = arguments[2], arguments[4]
                role = "world" if unit == "myagent-world.service" else "gateway"
                pid = "4101" if role == "world" else "4102"
                main_pid = pid if self.active and unit not in self.stopped_units else "0"
                values = {"FragmentPath": "/etc/systemd/system/" + unit, "LoadState": "loaded", "NeedDaemonReload": "no",
                          "MainPID": main_pid, "ExecMainPID": pid, "ControlGroup": "/system.slice/" + unit,
                          "InvocationID": self.p1_invocations[role],
                          "WorkingDirectory": "/opt/myagent/backend-current" + ("/ui/backend" if role == "gateway" else ""),
                          "ExecStart": "{ path=/opt/myagent/backend-current/.venv/bin/python ; argv[]=" + self.unit_command(role) +
                          " ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a] ; pid=" + pid + " ; code=(null) ; status=0 }"}
                return (values.get(property_name, "") + "\n").encode()
            if arguments[1] == "stop":
                self.active = False
                self.stopped_units.update(arguments[2:])
                for unit in arguments[2:]:
                    self.write("/sys/fs/cgroup/system.slice/" + unit + "/cgroup.procs", b"")
            elif arguments[1] in ("start", "restart"):
                self.p1_start_count += 1
                self.epoch = "hb_" + format(self.p1_start_count + 100, "032x")
                self.active = True
                self.stopped_units.difference_update(arguments[2:])
                self.writer_fixtures()
            elif arguments[1] == "is-active" and (not self.active or arguments[-1] in self.stopped_units):
                raise transaction.TransactionError("E_SERVICES")
            return b""
        if arguments[0] == "nginx":
            return self.nginx() if arguments[1] == "-T" else b""
        if arguments[0] == "apparmor_parser":
            return b""
        if arguments[0] == "bash":
            self.p1_start_count += 1
            self.epoch = "hb_" + format(self.p1_start_count + 100, "032x")
            self.active = True
            self.stopped_units.clear()
            self.recovery_unit_fixtures()
            self.writer_fixtures()
            return b""
        if "-c" in arguments and transaction.BACKEND_READ_GATES in arguments:
            return b""
        if "--expected-revision" in arguments:
            options = dict(zip(arguments[4::2], arguments[5::2]))
            duration = float(options["--hours"]) * 3600
            interval = float(options["--interval"])
            count = max(2, math.ceil(duration / interval) + 1)
            output = options["--output"]
            self.write(output, b"{}\n" * count, 0o600)
            self.counter += 1
            summary = {"schema_version": "p6-heartbeat-watch-summary-v2", "requested_duration_s": duration,
                       "interval_s": interval, "duration_s": duration, "minimum_samples": count, "total": count,
                       "failures": 0, "pass": True, "output": output, "expected_revision": options["--expected-revision"],
                       "run_epoch": self.epoch, "first_completed_fires": self.counter - 1, "last_completed_fires": self.counter,
                       "freshness_failure": None, "output_synced": True}
            if self.watcher_failure == "epoch":
                summary["run_epoch"] = "hb_" + "f" * 32
            elif self.watcher_failure == "v1":
                summary["schema_version"] = "p6-heartbeat-watch-summary-v1"
            elif self.watcher_failure == "fsync":
                summary["output_synced"] = False
            elif self.watcher_failure == "stalled":
                summary["last_completed_fires"] = summary["first_completed_fires"]
            if self.p1_after_observation is not None:
                self.p1_after_observation()
            return json.dumps(summary).encode()
        raise AssertionError("未经定义的服务边界：" + repr(arguments))

    def p1_observe(self, observation_error, cleanup_error, **options):
        try:
            return self.p1_observe_body(observation_error, cleanup_error, **options)
        except (observation_error, cleanup_error):
            raise
        except BaseException as error:
            raise observation_error("P1_OBSERVATION_FAILED") from error

    def p1_observe_body(self, observation_error, cleanup_error, **options):
        # 这是消费者生命周期替身，不能作为 P6 的完整时钟/请求实现证据。
        self.p1_calls += 1
        self.p1_options = options
        self.assertEqual(set(options), {"gateway", "expected_revision", "expected_epoch", "health_validator_source",
                                       "expected_phases", "expected_canary_hashes", "revalidate_instance", "sync_sample"})
        self.assertEqual(options["gateway"], "http://127.0.0.1:8000")
        self.assertEqual(options["health_validator_source"], (Path(__file__).parent / "validate_release_health.py").read_bytes())
        self.assertIs(type(options["expected_canary_hashes"]), tuple)
        if self.watcher_failure is not None:
            raise observation_error("P1_OBSERVATION_FAILED")
        options["revalidate_instance"]()
        for index in range(61):
            data = self.health()
            epoch = health_validator.validate_transaction_payload(data, options["expected_revision"],
                                                                  options["expected_phases"], list(options["expected_canary_hashes"]))
            self.assertEqual(epoch, options["expected_epoch"])
            sample = {"schema_version": "p6-heartbeat-watch-v2", "at_unix": 1000.0 + index * 30,
                      "elapsed_s": float(index * 30), "gateway": options["gateway"], "ok": True,
                      "latency_s": 0.001, "run_epoch": epoch, "freshness_failure": None,
                      "status": 200, "data": data}
            options["sync_sample"](transaction._canonical(sample))
        self.p1_now += 1800.0
        completed = self.p1_now
        options["revalidate_instance"]()
        if self.p1_after_observation is not None:
            self.p1_after_observation()
        invalid = False

        def freshness():
            nonlocal invalid
            self.p1_freshness_calls += 1
            try:
                self.assertFalse(invalid)
                options["revalidate_instance"]()
                if not 0 <= self.p1_now - completed <= 600:
                    raise observation_error("P1_OBSERVATION_FAILED")
            except BaseException:
                invalid = True
                raise observation_error("P1_OBSERVATION_FAILED") from None
        return freshness

    def main_deploy(self):
        @contextmanager
        def held_entry():
            with transaction._Fs() as fs:
                yield fs, self.lock_fd
        with patch.object(transaction, "_entry_lock", held_entry):
            return transaction.main(["deploy", TXN, BACKEND, "d" * 64, "compat", "compat", "compat", "-"])

    def capture(self, *, legacy=False):
        if legacy:
            self.write(self.old + "/backend/.release.env", transaction._release_env(PREVIOUS, True))
        return transaction.capture_previous(txn_id=TXN, candidate_revision=BACKEND, package_sha256="d" * 64,
                                             phases=dict(PHASES), canary_hashes=[], lock_fd=self.lock_fd, lease_fd=self.lease_fd)

    def deploy(self, *, legacy=False):
        self.capture(legacy=legacy)
        transaction.verify_previous(txn_id=TXN, purpose="before-mutation", lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        transaction._candidate_mutation(TXN, self.lock_fd, self.lease_fd)

    def finalize(self):
        return transaction.finalize_transaction(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd)

    def classify(self, lease_fd="original"):
        return transaction.verify_previous(txn_id=TXN, purpose="recovery", lock_fd=self.lock_fd,
                                             lease_fd=self.lease_fd if lease_fd == "original" else lease_fd)

    def receipt(self):
        return json.loads(self.path(self.upload + "/" + transaction.RECEIPT_NAME).read_bytes())

    def expect_code(self, code, function):
        with self.assertRaises(transaction.TransactionError) as caught:
            function()
        self.assertEqual(caught.exception.code, code)

    def material_snapshot(self):
        # 比较材料字节、路径与对象身份；读取引起的 atime 不属于变更。
        result = {}
        for path in (self.root, *sorted(self.root.rglob("*"))):
            info = path.lstat()
            identity = (info.st_dev, info.st_ino, info.st_mode, info.st_uid, info.st_gid, info.st_nlink)
            content = os.readlink(path) if path.is_symlink() else path.read_bytes() if path.is_file() else None
            result[str(path.relative_to(self.root))] = (identity, content)
        return result

    def assert_hold_preserves_scene(self, action=None):
        before = self.material_snapshot()
        state = self.active, set(self.stopped_units)
        self.events.clear()
        with transaction._Fs() as fs, self.assertRaises((transaction.TransactionError, OSError)):
            (action or (lambda: transaction._resume(TXN, fs, self.lock_fd)))()
        self.assertEqual((self.active, self.stopped_units), state)
        self.assertEqual(self.material_snapshot(), before)
        self.assertFalse([event for event in self.events if not event.startswith(("command systemctl show ",
                                                                                "command systemctl is-enabled "))])

    def maintenance_fixture(self, exists):
        path = self.path(transaction.MAINTENANCE_PATH)
        if exists:
            self.write(transaction.MAINTENANCE_PATH, b"")
        elif path.exists():
            path.unlink()

    def writer_fixtures(self):
        # 只在私有根构造 proc/cgroup 边界；不读取真实进程、服务或环境变量。
        backend = self.current_root("backend")
        self.directory(backend + "/ui/backend")
        self.write(backend + "/.venv/bin/python", b"fixture interpreter\n", 0o755)
        for role, pid in (("world", "4101"), ("gateway", "4102")):
            process = "/proc/" + pid
            group = "/system.slice/myagent-" + role + ".service"
            self.write(process + "/stat", (pid + " (python) S " + "0 " * 18 + "12345\n").encode())
            self.write(process + "/cmdline", b"\0".join(part.encode() for part in self.unit_command(role).split()) + b"\0")
            self.write(process + "/cgroup", ("0::" + group + "\n").encode())
            values = {"BRAIN_RELEASE_SHA": self.path(backend + "/release.txt").read_text().strip(),
                      "LINGXI_PERSONA_SCHEMA_PHASE": "compat", "LINGXI_PERSONA_GROWTH_PHASE": "compat",
                      "LINGXI_WORLD_LEDGER_SCHEMA_PHASE": "compat", "LINGXI_PERSONA_GROWTH_CANARY_HASHES": ""}
            self.write(process + "/environ", b"\0".join((key + "=" + value).encode() for key, value in values.items()) + b"\0")
            self.write("/sys/fs/cgroup" + group + "/cgroup.procs", (pid + "\n").encode())
            for name, target in (("cwd", backend + ("/ui/backend" if role == "gateway" else "")),
                                 ("exe", backend + "/.venv/bin/python")):
                path = self.path(process + "/" + name)
                if path.is_symlink():
                    path.unlink()
                # 测试根不做宿主 chroot，proc magic link 用根内绝对路径模拟。
                os.symlink(str(self.path(target)), path)

    def test_capture_and_success_close_real_files(self):
        self.deploy()
        result = self.finalize()
        self.assertEqual(result["phase"], "closed")
        self.assertEqual(result["outcome"], "deployed")
        self.assertEqual(self.classify(None)["action"], "none")
        self.assertFalse(self.path(self.rollback).exists())
        self.assertFalse(self.path(self.upload + "/PRESERVE").exists())
        self.assertFalse(self.path(transaction.LEASE_PATH).exists())
        self.assertTrue(self.path(self.upload + "/control").is_dir())
        self.assertEqual(len(self.receipt()), 8)

    def test_shared_lock_is_rejected_without_upgrade(self):
        transaction.fcntl.flock(self.lock_fd, transaction.fcntl.LOCK_SH)
        self.expect_code("E_LOCK", self.capture)
        probe = os.open(self.path(transaction.LOCK_PATH), os.O_RDWR)
        try:
            transaction.fcntl.flock(probe, transaction.fcntl.LOCK_SH | transaction.fcntl.LOCK_NB)
        finally:
            os.close(probe)

    def test_unlocked_descriptor_is_rejected(self):
        transaction.fcntl.flock(self.lock_fd, transaction.fcntl.LOCK_UN)
        self.expect_code("E_LOCK", self.capture)

    def test_lease_owner_and_type_are_bound(self):
        self.write(transaction.LEASE_PATH + "/owner", b"32-2\n", 0o600)
        self.expect_code("E_LEASE", self.capture)

    def test_capture_is_never_overwritten(self):
        self.capture()
        original = self.path(self.rollback + "/" + transaction.RECORD_NAME).read_bytes()
        self.expect_code("E_STATE", self.capture)
        self.assertEqual(self.path(self.rollback + "/" + transaction.RECORD_NAME).read_bytes(), original)

    def test_legacy_floor_and_success_cleanup(self):
        self.deploy(legacy=True)
        self.assertEqual(self.classify()["action"], "manual-recovery")
        self.expect_code("E_FLOOR", lambda: transaction.restore_previous(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd))
        self.assertEqual(self.finalize()["outcome"], "deployed")

    def test_legacy_active_is_rejected_before_snapshot(self):
        self.write(self.old + "/backend/.release.env", transaction._release_env(PREVIOUS, True))
        self.expect_code("E_FLOOR", lambda: transaction.capture_previous(txn_id=TXN, candidate_revision=BACKEND, package_sha256="d" * 64,
                         phases={**PHASES, "world_ledger": "active"}, canary_hashes=[], lock_fd=self.lock_fd, lease_fd=self.lease_fd))
        self.assertFalse(self.path(self.rollback).exists())

    def test_restore_stops_and_revalidates_in_one_helper(self):
        self.deploy()
        self.expect_code("E_SERVICES", lambda: transaction.restore_previous(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd))
        self.active = False
        result = transaction.restore_previous(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        self.assertEqual(result["phase"], "restored")
        self.assertEqual(self.current_root("backend"), self.old + "/backend")
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.assertEqual(self.finalize()["outcome"], "rolled-back")

    def test_restore_intent_residue_rebinds_real_link(self):
        self.deploy()
        self.active = False
        path = transaction._temporary_link(TXN, "portal", "restore")
        os.symlink(self.old + "/portal", self.path(path))
        identity = os.lstat(self.path(path)).st_ino
        result = transaction.restore_previous(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        self.assertEqual(result["restored_links"]["portal"]["identity"]["inode"], identity)

    def test_missing_preserve_blocks_mutation(self):
        self.capture()
        self.path(self.upload + "/PRESERVE").unlink()
        self.expect_code("E_IO", lambda: transaction.verify_previous(txn_id=TXN, purpose="before-mutation", lock_fd=self.lock_fd, lease_fd=self.lease_fd))
        self.assertEqual(self.receipt()["phase"], "prepared")

    def test_prepared_with_candidate_pointer_cannot_rollback(self):
        self.capture()
        os.replace(self.path(transaction._temporary_link(TXN, "portal", "candidate")), self.path(transaction.CURRENT["portal"]))
        self.assertEqual(self.classify()["action"], "manual-recovery")

    def test_switched_without_maintenance_cannot_rollback(self):
        self.deploy()
        self.path(transaction.MAINTENANCE_PATH).unlink()
        self.assertEqual(self.classify()["action"], "manual-recovery")

    def test_record_and_receipt_require_0600(self):
        self.capture()
        for path, code in ((self.rollback + "/" + transaction.RECORD_NAME, "E_RECORD_INVALID"),
                           (self.upload + "/" + transaction.RECEIPT_NAME, "E_RECEIPT_INVALID")):
            self.path(path).chmod(0o644)
            self.expect_code(code, self.classify)
            self.path(path).chmod(0o600)

    def test_inode_content_and_hardlink_drift(self):
        self.capture()
        path = self.path(self.old + "/backend/.release.env")
        os.link(path, self.path(self.old + "/backend/extra-link"))
        self.expect_code("E_IDENTITY", self.classify)

    def test_component_symlink_is_not_normalized_away(self):
        enabled = self.path(transaction.CONFIG["nginx_primary_enabled"][0])
        enabled.unlink()
        self.directory("/outside/pivot")
        os.symlink("/outside/pivot", self.path("/etc/nginx/sites-available/pivot"))
        os.symlink("/etc/nginx/sites-available/pivot/../hi-veblen.com.conf", enabled)
        self.expect_code("E_PATH", self.capture)

    def test_candidate_special_or_noncanonical_artifact_rejected(self):
        self.write(self.candidate + "/backend/.release.env", transaction._release_env(BACKEND) + b"\n")
        self.expect_code("E_ARTIFACT", self.capture)

    def test_exposing_rename_uncertainty_never_rolls_back(self):
        self.deploy()
        rename = os.rename
        synced = os.fsync
        exposed = False
        raised = False

        def traced_rename(source, destination, **kwargs):
            nonlocal exposed
            rename(source, destination, **kwargs)
            if destination == transaction.RECEIPT_NAME:
                exposed = self.receipt()["phase"] == "exposing"

        def fail_fsync(fd):
            nonlocal raised
            if exposed and not raised and stat.S_ISDIR(os.fstat(fd).st_mode):
                raised = True
                raise OSError("注入 exposing 父目录 fsync 失败")
            return synced(fd)

        with patch.object(os, "rename", side_effect=traced_rename), patch.object(os, "fsync", side_effect=fail_fsync):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.receipt()["phase"], "exposing")
        self.assertEqual(self.classify()["action"], "revalidate-commit")
        self.expect_code("E_STATE", lambda: transaction.restore_previous(txn_id=TXN, lock_fd=self.lock_fd, lease_fd=self.lease_fd))

    def test_sigkill_after_exposing_rename_is_durable_recovery_fence(self):
        self.deploy()
        child = os.fork()
        if child == 0:
            rename = os.rename

            def kill_after_rename(source, destination, **kwargs):
                rename(source, destination, **kwargs)
                if destination == transaction.RECEIPT_NAME and self.receipt()["phase"] == "exposing":
                    os.kill(os.getpid(), signal.SIGKILL)

            try:
                with patch.object(os, "rename", side_effect=kill_after_rename):
                    self.finalize()
            finally:
                # 子进程异常不得返回 unittest，避免重复执行父进程的测试。
                os._exit(97)
        _, status = os.waitpid(child, 0)
        self.assertTrue(os.WIFSIGNALED(status))
        self.assertEqual(os.WTERMSIG(status), signal.SIGKILL)
        self.assertEqual(self.classify()["action"], "revalidate-commit")
        self.assertTrue(self.path(self.upload + "/PRESERVE").exists())

    def test_terminal_fsync_uncertainty_preserves_running_committed_target(self):
        self.deploy()
        rename, sync = os.rename, os.fsync
        terminal_renamed = False
        raised = False

        def traced_rename(source, destination, **kwargs):
            nonlocal terminal_renamed
            rename(source, destination, **kwargs)
            if destination == transaction.RECEIPT_NAME:
                terminal_renamed = self.receipt()["phase"] == "terminal"

        def fail_sync(fd):
            nonlocal raised
            if terminal_renamed and not raised and stat.S_ISDIR(os.fstat(fd).st_mode):
                raised = True
                raise OSError("注入 terminal rename 后目录 fsync 失败")
            return sync(fd)

        with patch.object(os, "rename", side_effect=traced_rename), patch.object(os, "fsync", side_effect=fail_sync):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.receipt()["phase"], "terminal")
        self.assertTrue(self.active)
        self.assertFalse(self.path(transaction.MAINTENANCE_PATH).exists())
        self.assertEqual(self.finalize()["phase"], "closed")
        self.assertTrue(self.active)

    def test_failed_marker_creation_still_stops_both_services(self):
        self.deploy()
        original_http = self.http
        original_write = transaction._Fs.write

        def fail_public(url, **kwargs):
            if url == "https://hi-veblen.com/":
                raise transaction.TransactionError("E_GATES")
            return original_http(url, **kwargs)

        def fail_marker(fs, path, *args, **kwargs):
            if path == transaction.MAINTENANCE_PATH:
                raise OSError("注入维护标记创建失败")
            return original_write(fs, path, *args, **kwargs)

        with patch.object(transaction, "_http", side_effect=fail_public), patch.object(transaction._Fs, "write", new=fail_marker):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertFalse(self.active)
        self.assertTrue(any("stop myagent-gateway.service myagent-world.service" in event for event in self.events))
        self.assertEqual(self.classify()["action"], "revalidate-commit")

    def test_malformed_public_json_reisolates_after_exposing(self):
        self.deploy()
        original = self.http

        def malformed(url, **kwargs):
            if url == "https://hi-veblen.com/api/health":
                return 200, b"[]", {}
            return original(url, **kwargs)

        with patch.object(transaction, "_http", side_effect=malformed):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertFalse(self.active)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())
        self.assertEqual(self.classify()["action"], "revalidate-commit")

    def test_deep_public_json_reisolates_after_exposing(self):
        self.deploy()
        original = self.http

        def deep_json(url, **kwargs):
            if url == "https://hi-veblen.com/api/health":
                return 200, b"[" * 2000 + b"0" + b"]" * 2000, {}
            return original(url, **kwargs)

        with patch.object(transaction, "_http", side_effect=deep_json):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertFalse(self.active)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())
        self.assertEqual(self.classify()["action"], "revalidate-commit")

    def test_recovery_pointer_drift_preserves_unknown_scene(self):
        self.deploy()
        rename = os.rename

        def interrupt_expose(source, destination, **kwargs):
            rename(source, destination, **kwargs)
            if destination == transaction.RECEIPT_NAME and self.receipt()["phase"] == "exposing":
                raise OSError("注入 exposing 发布后中断")

        with patch.object(os, "rename", side_effect=interrupt_expose):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.active = True
        self.path(transaction.MAINTENANCE_PATH).unlink()
        self.stopped_units.clear()
        link = self.path(transaction.CURRENT["portal"])
        link.unlink()
        os.symlink(self.old + "/portal", link)
        for maintained in (False, True):
            with self.subTest(maintained=maintained):
                self.maintenance_fixture(maintained)
                self.assert_hold_preserves_scene()

    def test_exposing_temporary_file_never_becomes_receipt(self):
        self.deploy()
        rename = os.rename

        def fail_before_rename(source, destination, **kwargs):
            if destination == transaction.RECEIPT_NAME:
                fd = os.open(source, os.O_RDONLY, dir_fd=kwargs["src_dir_fd"])
                try:
                    phase = json.loads(os.read(fd, 4 * 1024 * 1024))["phase"]
                finally:
                    os.close(fd)
                if phase == "exposing":
                    raise OSError("注入 rename 前失败")
            return rename(source, destination, **kwargs)

        with patch.object(os, "rename", side_effect=fail_before_rename):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.receipt()["phase"], "deploying")
        self.assertEqual(self.classify()["action"], "resume-rollback")
        self.assertTrue(list(self.path(self.upload).glob(".*.tmp")))

    def test_legacy_exposing_failure_is_manual(self):
        self.deploy(legacy=True)
        original = self.http

        def fail_open(url, **kwargs):
            if url == "https://hi-veblen.com/" and not self.path(transaction.MAINTENANCE_PATH).exists():
                raise transaction.TransactionError("E_GATES")
            return original(url, **kwargs)

        with patch.object(transaction, "_http", side_effect=fail_open):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.classify()["action"], "manual-recovery")
        self.assertEqual(self.current_root("backend"), self.candidate + "/backend")

    def test_legacy_terminal_without_record_resumes_cleanup(self):
        self.deploy(legacy=True)
        unlink = os.unlink

        def fail_preserve(path, **kwargs):
            if path == "PRESERVE":
                raise OSError("注入保护标记删除失败")
            return unlink(path, **kwargs)

        with patch.object(os, "unlink", side_effect=fail_preserve):
            self.expect_code("E_CLEANUP_PENDING", self.finalize)
        self.assertFalse(self.path(self.rollback + "/" + transaction.RECORD_NAME).exists())
        self.assertEqual(self.classify()["action"], "resume-cleanup")
        self.assertEqual(self.finalize()["outcome"], "deployed")

    def test_lease_owner_removed_can_finish_without_business_replay(self):
        self.deploy()
        rmdir = os.rmdir

        def fail_lease(path, **kwargs):
            if path == "hi-veblen-release-lease":
                raise OSError("注入 lease 目录删除失败")
            return rmdir(path, **kwargs)

        with patch.object(os, "rmdir", side_effect=fail_lease):
            self.expect_code("E_LEASE_PENDING", self.finalize)
        self.assertEqual(self.receipt()["phase"], "lease-releasing")
        self.assertEqual(self.classify()["action"], "finish-lease")
        before = len(self.events)
        self.finalize()
        self.assertEqual(len(self.events), before)

    def test_closed_history_ignores_future_current_and_lease(self):
        self.deploy()
        self.finalize()
        for slot in transaction.SLOTS:
            self.path(transaction.CURRENT[slot]).unlink()
        self.directory(transaction.LEASE_PATH)
        self.write(transaction.LEASE_PATH + "/owner", b"900-1\n", 0o600)
        self.assertEqual(self.classify(None)["action"], "none")
        with transaction._Fs() as fs:
            transaction._check_history(fs, self.lock_fd)
        self.assertEqual(self.path(transaction.LEASE_PATH + "/owner").read_bytes(), b"900-1\n")

    def test_fixed_prune_plan_retries_without_expanding(self):
        self.prepare_pending_prune()
        plan = copy.deepcopy(self.receipt()["prune_plan"])
        self.write(transaction.RELEASES_ROOT + "/release-added-after-plan/payload", b"keep")
        self.finalize()
        self.assertEqual(self.receipt()["prune_plan"], plan)
        self.assertTrue(self.path(transaction.RELEASES_ROOT + "/release-added-after-plan/payload").exists())

    def prepare_pending_prune(self):
        for number in range(8):
            path = transaction.RELEASES_ROOT + f"/release-archive-{number}"
            self.write(path + "/payload", b"old")
            os.utime(self.path(path), (number + 1, number + 1))
        self.deploy()
        unlink = os.unlink
        failed = False

        def fail_once(path, **kwargs):
            nonlocal failed
            if path == "payload" and not failed:
                failed = True
                raise OSError("注入 prune 失败")
            return unlink(path, **kwargs)

        with patch.object(os, "unlink", side_effect=fail_once):
            self.expect_code("E_CLEANUP_PENDING", self.finalize)

    def test_pending_prune_respects_new_global_protection(self):
        self.prepare_pending_prune()
        plan = copy.deepcopy(self.receipt()["prune_plan"])
        self.write(transaction.PRESERVE_PATH, b"", 0o600)
        self.expect_code("E_CLEANUP_PENDING", self.finalize)
        self.assertEqual(self.receipt()["prune_plan"], plan)
        self.assertTrue(all(self.path(ref["path"]).exists() for ref in plan["releases"]))
        self.assertTrue(self.active)

    def test_pending_prune_refuses_new_current_conflict(self):
        self.prepare_pending_prune()
        plan = copy.deepcopy(self.receipt()["prune_plan"])
        target = plan["releases"][0]["path"]
        self.directory(target + "/portal")
        link = self.path(transaction.CURRENT["portal"])
        link.unlink()
        os.symlink(target + "/portal", link)
        self.expect_code("E_CLEANUP_PENDING", self.finalize)
        self.assertTrue(self.path(target).exists())
        self.assertEqual(self.receipt()["prune_plan"], plan)

    def test_entry_lock_bootstrap_never_replaces_inode(self):
        self.path(transaction.LOCK_PATH).unlink()
        with patch.object(os, "rename", side_effect=AssertionError("锁文件不得以 rename 发布")):
            with transaction._entry_lock() as (_, held):
                captured = os.fstat(held).st_ino
                child = os.fork()
                if child == 0:
                    code = 95
                    try:
                        with transaction._entry_lock():
                            code = 96
                    except transaction.TransactionError as error:
                        code = 0 if error.code == "E_LOCK" else 97
                    finally:
                        os._exit(code)
                _, status = os.waitpid(child, 0)
                self.assertEqual(os.waitstatus_to_exitcode(status), 0)
                self.assertEqual(self.path(transaction.LOCK_PATH).stat().st_ino, captured)

    def test_remote_eighth_argument_and_empty_canary_are_preserved(self):
        command = 'printf "%s|%s|%s|%s|%s|%s|%s|%s" "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8"'
        values = ["31", "2", PORTAL, "d" * 64, "active", "canary", "e" * 64, "compat"]
        result = subprocess.run(["/bin/bash", "--noprofile", "--norc", "-se", "--", *values],
                                input=command, capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout, "|".join(values))
        values[5:7] = ["compat", "-"]
        command = 'value="$7"; test "$value" != "-" || value=""; printf "%s|%s|%s" "$6" "$value" "$8"'
        result = subprocess.run(["/bin/bash", "--noprofile", "--norc", "-se", "--", *values],
                                input=command, capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout, "compat||compat")

    def test_observation_config_drift_cannot_publish_exposing(self):
        self.deploy()
        self.p1_after_observation = lambda: self.write(transaction.CONFIG["apparmor_profile"][0], b"changed\n")
        with self.assertRaises(transaction.TransactionError) as caught:
            self.finalize()
        self.assertIn(caught.exception.code, ("E_GATES", "E_DRIFT"))
        self.assertEqual(self.receipt()["phase"], "deploying")
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_recovery_missing_preserve_preserves_unknown_scene(self):
        self.deploy()
        self.path(self.upload + "/PRESERVE").unlink()
        self.path(transaction.MAINTENANCE_PATH).unlink()
        self.active = True
        self.stopped_units.clear()
        for maintained in (False, True):
            with self.subTest(maintained=maintained):
                self.maintenance_fixture(maintained)
                self.assert_hold_preserves_scene()

    def test_recovery_bad_or_missing_receipt_preserves_same_lease(self):
        self.deploy()
        path = self.path(self.upload + "/" + transaction.RECEIPT_NAME)
        for raw in (b"invalid\n", None):
            if raw is None:
                path.unlink()
            else:
                path.write_bytes(raw)
            for maintained in (False, True):
                with self.subTest(raw=raw, maintained=maintained):
                    self.maintenance_fixture(maintained)
                    self.assert_hold_preserves_scene()

    def test_terminal_binding_rejects_bool_and_extra_keys(self):
        self.deploy()
        self.finalize()
        original = self.receipt()
        receipt_path = self.upload + "/" + transaction.RECEIPT_NAME
        for kind in ("record_bool", "proof_bool", "ninth_key"):
            receipt = copy.deepcopy(original)
            if kind == "record_bool":
                receipt["terminal"]["record"]["preserve"]["identity"]["uid"] = False
            elif kind == "proof_bool":
                receipt["terminal"]["proof"]["final_links"]["backend"]["identity"]["uid"] = False
            else:
                receipt["extra"] = None
            self.write(receipt_path, transaction._canonical(receipt), 0o600)
            with self.assertRaises(transaction.TransactionError):
                self.classify(None)
        self.write(receipt_path, transaction._canonical(original), 0o600)

    def test_missing_or_bad_receipt_blocks_history(self):
        self.capture()
        self.path(self.upload + "/" + transaction.RECEIPT_NAME).unlink()
        with transaction._Fs() as fs:
            self.expect_code("E_RECEIPT_MISSING", lambda: transaction._check_history(fs, self.lock_fd))

    def test_reserved_environment_key_blocks_capture(self):
        self.write(transaction.PROJECT_ROOT + "/.env", b"LINGXI_WORLD_LEDGER_SCHEMA_PHASE=active\n", 0o600)
        self.expect_code("E_PHASE", self.capture)

    def test_dotenv_assignment_grammar(self):
        for label, source, keys in DOTENV_CASES:
            with self.subTest(label=label):
                self.write(transaction.PROJECT_ROOT + "/.env", source.encode("utf-8"), 0o600)
                with transaction._Fs() as fs:
                    if RESERVED_PHASE in keys:
                        self.expect_code("E_PHASE", lambda: transaction._unit_phases(fs))
                    else:
                        self.assertEqual(transaction._unit_phases(fs), (PHASES, []))

    def test_host_world_ledger_is_required_and_consistent(self):
        for field in ("world_ledger_schema_capability", "world_ledger_schema_phase"):
            for value in (None, False, 0, [], "", "active", "dual-read-v1", "missing"):
                with self.subTest(field=field, value=value):
                    payload = self.health()
                    if value == "missing":
                        del payload["host"][field]
                    else:
                        payload["host"][field] = value
                    with self.assertRaises(ValueError):
                        health_validator.validate_transaction_payload(payload, PREVIOUS, PHASES, [])

    def test_workflow_canary_before_ssh_remote_shell_reparse(self):
        workflow = (Path(__file__).parents[1] / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
        step = workflow.split("- name: 维护窗口内协调切换并验证", 1)[1].split("run: |\n", 1)[1]
        prefix = textwrap.dedent(step.split("<<'REMOTE'", 1)[0]) + "<<'REMOTE'\n"
        # OpenSSH 将 host 后 argv 以空格拼为命令串，再交给远端登录 shell 解析。
        # 本替身没有网络；攻击样本只含固定 printf，远端正文仅输出参数。
        script = 'ssh() { shift; printf "TRANSPORT_REACHED\\n"; /bin/sh -c "$*"; }\n' + prefix
        script += 'printf "REMOTE_ARG=%s\\n" "$@"\nREMOTE\n'
        environment = {"PATH": "/usr/bin:/bin", "GITHUB_RUN_ID": "31", "GITHUB_RUN_ATTEMPT": "2", "GITHUB_SHA": PORTAL,
                       "EXPECTED_ARCHIVE_SHA": "d" * 64, "EXPECTED_PERSONA_SCHEMA_PHASE": "active",
                       "EXPECTED_PERSONA_GROWTH_PHASE": "canary", "EXPECTED_WORLD_LEDGER_SCHEMA_PHASE": "compat"}
        valid = ("", "e" * 64, "e" * 64 + "," + "f" * 64)
        invalid = ("e" * 64 + "\n$(printf REMOTE_REPARSE)", "$(printf REMOTE_REPARSE)", "`printf REMOTE_REPARSE`",
                   "e" * 64 + "\n", "e" * 64 + "\r", "e" * 64 + "\t", "e" * 64 + "\v", "E" * 64, "-", ",", "e" * 63)
        for value in (*valid, *invalid):
            with self.subTest(value=repr(value)):
                result = subprocess.run(["/bin/bash", "--noprofile", "--norc", "-e"], input=script, capture_output=True,
                                        text=True, env={**environment, "PERSONA_GROWTH_CANARY_HASHES": value})
                if value in valid:
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout.splitlines(), ["TRANSPORT_REACHED", *["REMOTE_ARG=" + argument for argument in
                                     ("31", "2", PORTAL, "d" * 64, "active", "canary", value or "-", "compat")]])
                else:
                    self.assertNotEqual(result.returncode, 0)
                    self.assertNotIn("TRANSPORT_REACHED", result.stdout)

    def prepare_stopped_exposing(self):
        self.deploy()
        original = self.http

        def malformed(url, **kwargs):
            return (200, b"[]", {}) if url == "https://hi-veblen.com/api/health" else original(url, **kwargs)

        with patch.object(transaction, "_http", side_effect=malformed):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.receipt()["phase"], "exposing")
        self.assertFalse(self.active)
        self.recovery_unit_fixtures()

    def recovery_unit_fixtures(self):
        # 恢复夹具使用真实安装器的四变量替换和 EnvironmentFile 加载顺序。
        self.loaded_environment_files = True
        self.write(transaction.PROJECT_ROOT + "/.env", b"", 0o600)
        for role in ("world", "gateway"):
            files = b"EnvironmentFile=/opt/myagent/.env\nEnvironmentFile=/opt/myagent/backend-current/.release.env\n"
            if role == "gateway":
                files += b"EnvironmentFile=-/etc/myagent/admin-gateway.env\n"
            unit = "myagent-" + role + ".service"
            raw = self.unit_bytes(role=role) + files
            self.write("/etc/systemd/system/" + unit, raw)
            for key in ("LINGXI_PERSONA_SCHEMA_PHASE", "LINGXI_PERSONA_GROWTH_PHASE", "LINGXI_WORLD_LEDGER_SCHEMA_PHASE",
                        "LINGXI_PERSONA_GROWTH_CANARY_HASHES"):
                value = "" if key.endswith("HASHES") else "compat"
                raw = raw.replace((key + "=" + value + "\n").encode(), (key + "=@" + key + "@\n").encode())
            self.write(self.candidate + "/backend/ops/systemd/" + unit, raw)

    def test_revalidate_commit_inactive_holds_without_scene_changes(self):
        self.prepare_stopped_exposing()
        for maintained in (False, True):
            with self.subTest(maintained=maintained):
                self.maintenance_fixture(maintained)
                self.assert_hold_preserves_scene()

    def test_revalidate_commit_running_services_preserve_epoch(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.events.clear()
        self.p1_calls = 0
        epoch = self.epoch
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["phase"], "closed")
        self.assertEqual(self.receipt()["terminal"]["proof"]["run_epoch"], epoch)
        self.assertFalse(any(event.startswith("command systemctl " + verb) for event in self.events for verb in ("start ", "restart ", "stop ")))
        self.assertEqual(self.p1_calls + sum("--expected-revision" in event for event in self.events), 1)

    def test_bound_deploying_recovery_preserves_legal_rollback(self):
        self.deploy()
        self.events.clear()
        with transaction._Fs() as fs:
            result = transaction._resume(TXN, fs, self.lock_fd)
        self.assertEqual(result["outcome"], "rolled-back")
        self.assertEqual(self.current_root("backend"), self.old + "/backend")
        self.assertEqual(self.p1_calls + sum("--expected-revision" in event for event in self.events), 1)

    def test_prepared_recovery_preserves_legal_rollback(self):
        self.capture()
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["outcome"], "rolled-back")

    def test_partial_candidate_switch_can_resume_original_rollback(self):
        self.capture()
        transaction.verify_previous(txn_id=TXN, purpose="before-mutation", lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        replace = transaction._replace_link
        def interrupted(instance, path, *args, **kwargs):
            replace(instance, path, *args, **kwargs)
            if path == transaction.CURRENT["portal"]:
                raise OSError("注入首个 current 已替换后的中断")
        with patch.object(transaction, "_replace_link", side_effect=interrupted):
            with self.assertRaises(OSError):
                transaction._candidate_mutation(TXN, self.lock_fd, self.lease_fd)
        self.assertFalse(self.active)
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["outcome"], "rolled-back")

    def test_rollback_pending_reenters_after_link_failure(self):
        self.deploy()
        replace = transaction._replace_link
        def interrupted(instance, path, *args, **kwargs):
            if path == transaction.CURRENT["portal"]:
                raise OSError("注入 rollback-pending 后首个切链失败")
            return replace(instance, path, *args, **kwargs)
        with patch.object(transaction, "_replace_link", side_effect=interrupted), transaction._Fs() as fs:
            with self.assertRaises(transaction.TransactionError):
                transaction._resume(TXN, fs, self.lock_fd)
        self.assertEqual(self.receipt()["phase"], "rollback-pending")
        self.assertFalse(self.active)
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["outcome"], "rolled-back")

    def test_candidate_backend_switch_before_new_phase_install_can_rollback(self):
        transaction.capture_previous(txn_id=TXN, candidate_revision=BACKEND, package_sha256="d" * 64,
                                     phases={**PHASES, "persona_growth": "shadow"}, canary_hashes=[],
                                     lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        transaction.verify_previous(txn_id=TXN, purpose="before-mutation", lock_fd=self.lock_fd, lease_fd=self.lease_fd)
        replace = transaction._replace_link
        def interrupted(instance, path, *args, **kwargs):
            replace(instance, path, *args, **kwargs)
            if path == transaction.CURRENT["backend"]:
                raise OSError("注入 backend 已切换但新 phase 尚未安装")
        with patch.object(transaction, "_replace_link", side_effect=interrupted):
            with self.assertRaises(OSError):
                transaction._candidate_mutation(TXN, self.lock_fd, self.lease_fd)
        self.assertEqual(self.current_root("backend"), self.candidate + "/backend")
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["outcome"], "rolled-back")

    def test_restored_backend_before_configuration_can_resume_rollback(self):
        self.deploy()
        replace = transaction._replace_link
        def interrupted(instance, path, *args, **kwargs):
            replace(instance, path, *args, **kwargs)
            if path == transaction.CURRENT["backend"]:
                raise OSError("注入 backend 已恢复但配置尚未恢复")
        with patch.object(transaction, "_replace_link", side_effect=interrupted), transaction._Fs() as fs:
            with self.assertRaises(transaction.TransactionError):
                transaction._resume(TXN, fs, self.lock_fd)
        self.assertEqual(self.receipt()["phase"], "rollback-pending")
        self.assertEqual(self.current_root("backend"), self.old + "/backend")
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["outcome"], "rolled-back")

    def test_partially_restored_units_hold_with_loaded_configuration_unchanged(self):
        self.deploy()
        record = json.loads(self.path(self.rollback + "/" + transaction.RECORD_NAME).read_bytes())
        first_unit = next(key for key in record["config_backup"] if key.endswith("_unit"))
        destination = transaction.CONFIG[first_unit][0]
        units = ("myagent-world.service", "myagent-gateway.service")
        loaded_bytes = {unit: self.path("/etc/systemd/system/" + unit).read_bytes() for unit in units}
        # loaded 与磁盘独立；此次恢复未 daemon-reload，不能跟着磁盘夹具自动改变。
        loaded_properties = {(unit, key): self.command(["systemctl", "show", unit, "-p", key, "--value"])
                             for unit in units for key in ("Environment", "EnvironmentFiles")}
        before_loaded = copy.deepcopy(loaded_properties)
        original = self.command
        def loaded_command(arguments, **kwargs):
            if arguments[:2] == ["systemctl", "show"]:
                unit, key = arguments[2], arguments[4]
                if (unit, key) in loaded_properties:
                    self.events.append("command " + " ".join(arguments))
                    return loaded_properties[(unit, key)]
                if key == "NeedDaemonReload":
                    return b"no" if self.path("/etc/systemd/system/" + unit).read_bytes() == loaded_bytes[unit] else b"yes"
            return original(arguments, **kwargs)
        write = transaction._Fs.write
        def interrupt(fs, path, *args, **kwargs):
            result = write(fs, path, *args, **kwargs)
            if path == destination:
                raise OSError("注入第一个 unit 已写回、daemon-reload 尚未执行")
            return result
        with patch.object(transaction, "_command", side_effect=loaded_command):
            with patch.object(transaction._Fs, "write", new=interrupt), transaction._Fs() as fs:
                with self.assertRaises(transaction.TransactionError):
                    transaction._resume(TXN, fs, self.lock_fd)
            self.assertEqual(self.receipt()["phase"], "rollback-pending")
            self.assertNotEqual(self.path(destination).read_bytes(), loaded_bytes["myagent-" + first_unit.removesuffix("_unit") + ".service"])
            self.assertFalse(self.active)
            self.assert_hold_preserves_scene()
        self.assertEqual(loaded_properties, before_loaded)

    def test_revalidate_committing_requires_both_active(self):
        self.prepare_stopped_committing()
        self.assert_recovery_states_hold()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.events.clear()
        self.p1_calls = 0
        with transaction._Fs() as fs:
            self.assertEqual(transaction._resume(TXN, fs, self.lock_fd)["phase"], "closed")
        self.assertEqual(self.current_root("backend"), self.candidate + "/backend")
        self.assertFalse(any("restart " in event or event.startswith("command bash") for event in self.events))
        self.assertEqual(self.p1_calls + sum("--expected-revision" in event for event in self.events), 1)

    def prepare_stopped_committing(self):
        self.deploy()
        self.recovery_unit_fixtures()
        advance = transaction._Transaction.advance

        def fail_terminal(instance, record, old, identity, phase, **kwargs):
            if phase == "terminal":
                raise OSError("注入 committing 后 terminal 发布失败")
            return advance(instance, record, old, identity, phase, **kwargs)

        with patch.object(transaction._Transaction, "advance", new=fail_terminal):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertEqual(self.receipt()["phase"], "committing")
        self.assertFalse(self.active)

    def test_revalidate_commit_rejects_loaded_unit_drift_before_start(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        original = self.command
        for field, value in (("FragmentPath", "/etc/systemd/system/unrelated.service"), ("NeedDaemonReload", "yes"),
                             ("WorkingDirectory", self.old + "/backend"), ("ExecStart", "{ path=/bin/true ; argv[]=/bin/true ; ignore_errors=no ; }"),
                             ("ExecStartPre", "{ path=/bin/true ; argv[]=/bin/true ; ignore_errors=no ; }"), ("DropInPaths", "/tmp/override.conf"),
                             ("EnvironmentFiles", "/opt/myagent/.env (ignore_errors=yes)"), ("ActiveState", "activating")):
            with self.subTest(field=field):
                def drift(arguments, **kwargs):
                    if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and field in arguments:
                        return value.encode()
                    return original(arguments, **kwargs)

                for maintained in (False, True):
                    self.maintenance_fixture(maintained)
                    with patch.object(transaction, "_command", side_effect=drift):
                        self.assert_hold_preserves_scene()

    def test_revalidate_commit_rejects_template_drift(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        path = transaction.CONFIG["gateway_unit"][0]
        raw = self.path(path).read_bytes()
        self.write(path, raw + b"ExecStartPre=/bin/true\n")
        for maintained in (False, True):
            self.maintenance_fixture(maintained)
            self.assert_hold_preserves_scene()

    def test_revalidate_commit_pointer_drift_never_starts(self):
        self.prepare_stopped_exposing()
        link = self.path(transaction.CURRENT["backend"])
        link.unlink()
        os.symlink(self.old + "/backend", link)
        for maintained in (False, True):
            self.maintenance_fixture(maintained)
            self.assert_hold_preserves_scene()
        self.assertEqual(self.current_root("backend"), self.old + "/backend")

    def test_revalidate_commit_second_service_states_never_restart(self):
        self.prepare_stopped_exposing()
        self.assert_recovery_states_hold()

    def assert_recovery_states_hold(self):
        self.active = True
        self.writer_fixtures()
        self.stopped_units = {"myagent-gateway.service"}
        original = self.command
        for state in ("inactive", "failed", "activating", "deactivating", "unknown", ""):
            def drift(arguments, **kwargs):
                if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and "ActiveState" in arguments:
                    return state.encode()
                return original(arguments, **kwargs)
            for maintained in (False, True):
                with self.subTest(state=state, maintained=maintained):
                    self.maintenance_fixture(maintained)
                    with patch.object(transaction, "_command", side_effect=drift):
                        self.assert_hold_preserves_scene()

    def test_actual_writer_missing_or_wrong_bound_target_holds(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        process = "/proc/4102"
        for filename, raw in (("cmdline", b"python\0-m\0unrelated\0"), ("cgroup", b"0::/unrelated.service\n"),
                              ("stat", b"invalid\n"), ("environ", b"BRAIN_RELEASE_SHA=unrelated\0")):
            path = self.path(process + "/" + filename)
            original = path.read_bytes()
            for replacement in (raw, None):
                if replacement is None:
                    path.unlink()
                else:
                    path.write_bytes(replacement)
                for maintained in (False, True):
                    with self.subTest(filename=filename, replacement=replacement, maintained=maintained):
                        self.maintenance_fixture(maintained)
                        self.assert_hold_preserves_scene()
            path.write_bytes(original)

    def test_writer_cwd_executable_and_extra_cgroup_member_hold(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        for name, target in (("cwd", self.old + "/backend/ui/backend"), ("exe", self.old + "/backend/.venv/bin/python")):
            path = self.path("/proc/4102/" + name)
            original = os.readlink(path)
            path.unlink()
            os.symlink(str(self.path(target)), path)
            for maintained in (False, True):
                with self.subTest(name=name, maintained=maintained):
                    self.maintenance_fixture(maintained)
                    self.assert_hold_preserves_scene()
            path.unlink()
            os.symlink(original, path)
        self.write("/sys/fs/cgroup/system.slice/myagent-gateway.service/cgroup.procs", b"4102\n9999\n")
        self.assert_hold_preserves_scene()

    def test_loaded_pid_and_instance_must_match_actual_writer(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        original = self.command
        for field, value in (("MainPID", "0"), ("ExecMainPID", "9999"), ("InvocationID", "0" * 32),
                             ("ControlGroup", "/system.slice/unrelated.service"), ("ExecStart", "pid=0")):
            for maintained in (False, True):
                with self.subTest(field=field, maintained=maintained):
                    def drift(arguments, **kwargs):
                        raw = original(arguments, **kwargs)
                        if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and field in arguments:
                            return raw.replace(b"pid=4102", b"pid=0") if field == "ExecStart" else value.encode()
                        return raw
                    self.maintenance_fixture(maintained)
                    with patch.object(transaction, "_command", side_effect=drift):
                        self.assert_hold_preserves_scene()

    def test_writer_changes_during_second_unit_proof_hold_before_mutation(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        original = self.command
        changed = False
        for maintained in (False, True):
            changed = False
            def drift(arguments, **kwargs):
                nonlocal changed
                if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and "MainPID" in arguments:
                    changed = True
                if arguments[:3] == ["systemctl", "show", "myagent-world.service"] and "InvocationID" in arguments and changed:
                    return b"b" * 32
                return original(arguments, **kwargs)
            self.maintenance_fixture(maintained)
            with patch.object(transaction, "_command", side_effect=drift):
                self.assert_hold_preserves_scene()

    def test_active_unit_unknown_child_cgroup_preserves_scene(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.write("/sys/fs/cgroup/system.slice/myagent-world.service/unknown/cgroup.procs", b"9999\n")
        for maintained in (False, True):
            self.maintenance_fixture(maintained)
            self.assert_hold_preserves_scene()

    def test_empty_unit_unknown_child_cgroup_blocks_rollback(self):
        self.deploy()
        self.command(["systemctl", "stop", "myagent-gateway.service", "myagent-world.service"])
        self.write("/sys/fs/cgroup/system.slice/myagent-world.service/unknown/cgroup.procs", b"9999\n")
        self.assert_hold_preserves_scene()

    def test_missing_cgroup_observation_root_is_not_empty_service_proof(self):
        self.deploy()
        self.command(["systemctl", "stop", "myagent-gateway.service", "myagent-world.service"])
        shutil.rmtree(self.path("/sys/fs/cgroup/system.slice"))
        self.assert_hold_preserves_scene()

    def test_recovery_missing_record_preserves_same_lease(self):
        self.deploy()
        self.path(self.rollback + "/" + transaction.RECORD_NAME).unlink()
        for maintained in (False, True):
            self.maintenance_fixture(maintained)
            self.assert_hold_preserves_scene()

    def test_finalize_unknown_writer_does_not_fallback_to_isolation(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.path("/proc/4102/cmdline").write_bytes(b"unrelated\0")
        for maintained in (False, True):
            with self.subTest(maintained=maintained):
                self.maintenance_fixture(maintained)
                self.assert_hold_preserves_scene(self.finalize)

    def test_first_public_failure_isolates_bound_writer_and_empty_service(self):
        self.deploy()
        original = self.http
        def failed_gateway(url, **kwargs):
            if url == "https://hi-veblen.com/":
                self.stopped_units.add("myagent-gateway.service")
                self.write("/sys/fs/cgroup/system.slice/myagent-gateway.service/cgroup.procs", b"")
                raise transaction.TransactionError("E_GATES")
            return original(url, **kwargs)
        with patch.object(transaction, "_http", side_effect=failed_gateway):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertFalse(self.active)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_maintained_failure_with_lost_writer_preserves_scene(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        original = self.http
        captured = None
        def lose_writer(url, **kwargs):
            nonlocal captured
            if url == "https://lingxi.hi-veblen.com/api/session":
                self.path("/proc/4102/cmdline").write_bytes(b"unrelated\0")
                captured = self.material_snapshot()
                raise transaction.TransactionError("E_GATES")
            return original(url, **kwargs)
        with patch.object(transaction, "_http", side_effect=lose_writer):
            self.expect_code("E_GATES", self.finalize)
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_successful_observation_cannot_reuse_lost_writer_proof(self):
        self.deploy()
        maintained = transaction._maintained_gates
        captured = None
        def lose_writer(*args, **kwargs):
            nonlocal captured
            result = maintained(*args, **kwargs)
            if kwargs.get("observe", True):
                self.path("/proc/4102/cmdline").write_bytes(b"unrelated\0")
                captured = self.material_snapshot()
            return result
        with patch.object(transaction, "_maintained_gates", side_effect=lose_writer):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_lease_drift_during_final_writer_read_prevents_first_mutation(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.maintenance_fixture(False)
        original = self.command
        reads = 0
        captured = None
        def drift(arguments, **kwargs):
            nonlocal reads, captured
            if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and "MainPID" in arguments:
                reads += 1
                if reads == 4:
                    self.write(transaction.LEASE_PATH + "/owner", b"99-1\n", 0o600)
                    captured = self.material_snapshot()
            return original(arguments, **kwargs)
        with patch.object(transaction, "_command", side_effect=drift), transaction._Fs() as fs:
            self.expect_code("E_LEASE", lambda: transaction._resume(TXN, fs, self.lock_fd))
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_current_drift_during_final_writer_read_prevents_first_mutation(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.maintenance_fixture(False)
        original = self.command
        reads = 0
        captured = None
        def drift(arguments, **kwargs):
            nonlocal reads, captured
            if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and "MainPID" in arguments:
                reads += 1
                if reads == 4:
                    path = self.path(transaction.CURRENT["portal"])
                    path.unlink()
                    os.symlink(self.old + "/portal", path)
                    captured = self.material_snapshot()
            return original(arguments, **kwargs)
        with patch.object(transaction, "_command", side_effect=drift), transaction._Fs() as fs:
            self.expect_code("E_DRIFT", lambda: transaction._resume(TXN, fs, self.lock_fd))
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_prepared_late_bound_mixed_current_cannot_isolate_active_writers(self):
        self.capture()
        original = self.command
        reads = 0
        captured = None
        def drift(arguments, **kwargs):
            nonlocal reads, captured
            if arguments[:3] == ["systemctl", "show", "myagent-gateway.service"] and "MainPID" in arguments:
                reads += 1
                if reads == 4:
                    os.replace(self.path(transaction._temporary_link(TXN, "portal", "candidate")),
                               self.path(transaction.CURRENT["portal"]))
                    captured = self.material_snapshot()
            return original(arguments, **kwargs)
        with patch.object(transaction, "_command", side_effect=drift), transaction._Fs() as fs:
            self.expect_code("E_DRIFT", lambda: transaction._resume(TXN, fs, self.lock_fd))
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_resume_fallback_with_lost_receipt_preserves_failure_scene(self):
        self.prepare_stopped_exposing()
        self.active = True
        self.stopped_units.clear()
        self.writer_fixtures()
        self.maintenance_fixture(False)
        write = transaction._Fs.write
        captured = None
        def interrupt(fs, path, *args, **kwargs):
            nonlocal captured
            result = write(fs, path, *args, **kwargs)
            if path == transaction.MAINTENANCE_PATH:
                self.path(self.upload + "/" + transaction.RECEIPT_NAME).unlink()
                captured = self.material_snapshot()
                raise OSError("注入已开始隔离后丢失回执")
            return result
        with patch.object(transaction._Fs, "write", new=interrupt), transaction._Fs() as fs:
            with self.assertRaises(OSError):
                transaction._resume(TXN, fs, self.lock_fd)
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)

    def test_finalize_public_failure_with_lost_writer_proof_preserves_scene(self):
        self.deploy()
        original = self.http
        captured = None
        def drift(url, **kwargs):
            nonlocal captured
            if url == "https://hi-veblen.com/":
                self.path("/proc/4102/cmdline").write_bytes(b"unrelated\0")
                captured = self.material_snapshot()
                self.events.clear()
                raise transaction.TransactionError("E_GATES")
            return original(url, **kwargs)
        with patch.object(transaction, "_http", side_effect=drift):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertIsNotNone(captured)
        self.assertEqual(self.material_snapshot(), captured)
        self.assertTrue(self.active)
        self.assertFalse([event for event in self.events if not event.startswith(("command systemctl show ",
                                                                                "command systemctl is-enabled "))])

    def test_watcher_contract_is_not_single_health_sample(self):
        self.deploy()
        for failure in ("epoch", "v1", "fsync", "stalled"):
            self.watcher_failure = failure
            self.expect_code("E_GATES", self.finalize)
            self.assertEqual(self.receipt()["phase"], "deploying")
            self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_p1_exposing_fsync_expiry_never_removes_maintenance(self):
        self.deploy()
        original = os.fsync
        expired = False

        def delayed_sync(fd):
            nonlocal expired
            original(fd)
            if not expired and self.receipt()["phase"] == "exposing":
                expired = True
                self.p1_now += 600.001
        with patch.object(os, "fsync", side_effect=delayed_sync):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertTrue(expired)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())
        self.assertEqual(self.receipt()["phase"], "exposing")
        self.assertFalse(any(event == "GET https://lingxi.hi-veblen.com/api/health" for event in self.events))

    def test_p1_terminal_temp_fsync_expiry_never_publishes_terminal(self):
        self.deploy()
        original = os.fsync
        expired = False

        def delayed_sync(fd):
            nonlocal expired
            original(fd)
            if expired or not stat.S_ISREG(os.fstat(fd).st_mode):
                return
            path = Path(os.readlink("/proc/self/fd/" + str(fd)))
            if path.is_relative_to(self.root) and b'"phase":"terminal"' in path.read_bytes():
                expired = True
                self.p1_now += 600.001
        with patch.object(os, "fsync", side_effect=delayed_sync):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertTrue(expired)
        self.assertEqual(self.receipt()["phase"], "committing")
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_p1_public_gate_delay_does_not_refresh_completed_time(self):
        self.deploy()
        original = transaction._public_gates

        def delayed_public(*args, **kwargs):
            result = original(*args, **kwargs)
            self.p1_now += 600.001
            return result
        with patch.object(transaction, "_public_gates", side_effect=delayed_public):
            self.expect_code("E_COMMIT_UNCERTAIN", self.finalize)
        self.assertNotIn(self.receipt()["phase"], transaction.TERMINAL_PHASES)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_p1_same_revision_new_gateway_instance_rejects_old_window(self):
        self.deploy()
        self.p1_after_observation = lambda: self.p1_invocations.__setitem__("gateway", "b" * 32)
        self.expect_code("E_GATES", self.finalize)
        self.assertEqual(self.receipt()["phase"], "deploying")
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_p1_top_level_failure_never_reobserves_same_target(self):
        original = transaction._public_gates
        public_calls = 0

        def fail_first_public(*args, **kwargs):
            nonlocal public_calls
            public_calls += 1
            if public_calls == 1:
                raise transaction.TransactionError("E_GATES")
            return original(*args, **kwargs)
        def stop_failure_preserves_active(arguments, **kwargs):
            if arguments[:2] == ["systemctl", "stop"] and public_calls:
                # 已知服务停机失败仍保持active，不能靠R0偶然挡住同目标重观。
                raise transaction.TransactionError("E_SERVICES")
            return self.command(arguments, **kwargs)
        with patch.object(transaction, "_public_gates", side_effect=fail_first_public), \
                patch.object(transaction, "_command", side_effect=stop_failure_preserves_active):
            self.assertEqual(self.main_deploy(), 1)
        # 旧源码走外部watcher替身，新源码走私有入口；两种口径均精确计数。
        observed = self.p1_calls + sum("--expected-revision" in event for event in self.events)
        self.assertEqual(observed, 1)
        self.assertEqual(public_calls, 1)
        self.assertNotIn(self.receipt()["phase"], transaction.TERMINAL_PHASES)

    def p1_observation(self, fs):
        txn = transaction._Transaction(fs, TXN, self.lock_fd)
        record, _, _ = txn.load()
        return transaction._watch_heartbeat(txn, record["candidate"]["backend"], self.epoch, lease_fd=self.lease_fd)

    def test_p1_freshness_600_inclusive_and_failure_never_revives(self):
        self.deploy()
        with transaction._Fs() as fs:
            guard = self.p1_observation(fs)
            completed = self.p1_now
            self.p1_now = completed + 600
            guard()
            self.assertEqual(self.p1_calls, 1)
            self.p1_now += 0.001
            self.expect_code("E_GATES", guard)
            self.p1_now = completed
            self.expect_code("E_GATES", guard)
            self.assertEqual(self.p1_calls, 1)

    def test_p1_negative_age_and_slow_instance_check_fail(self):
        self.deploy()
        with transaction._Fs() as fs:
            guard = self.p1_observation(fs)
            self.p1_now -= 0.001
            self.expect_code("E_GATES", guard)
            guard = self.p1_observation(fs)
            revalidate = transaction._revalidate_target_services
            def slow_check(*args, **kwargs):
                result = revalidate(*args, **kwargs)
                self.p1_now += 600.001
                return result
            with patch.object(transaction, "_revalidate_target_services", side_effect=slow_check):
                self.expect_code("E_GATES", guard)

    def test_p1_new_module_generation_invalidates_old_closure(self):
        self.deploy()
        with transaction._Fs() as fs:
            first = self.p1_observation(fs)
            first()
            second = self.p1_observation(fs)
            second()
            self.expect_code("E_GATES", first)
            second()
            self.assertEqual(self.p1_calls, 2)

    def test_p1_controller_reload_cannot_reuse_old_generation(self):
        self.deploy()
        with transaction._Fs() as fs:
            guard = self.p1_observation(fs)
            # 恢复测试I/O边界，reload本身真实执行；绝不访问生产根/服务。
            boundaries = {name: getattr(transaction, name) for name in
                          ("_open_root_fd", "_control_sources", "_command", "_http", "_apparmor_loaded", "_observation_policy")}
            importlib.reload(transaction)
            transaction.__dict__.update(boundaries)
            with patch.object(transaction, "_load_p1_observer", side_effect=transaction.TransactionError("E_BINDING")):
                # deploy已有一次合法start代际，随后观察捕获2；重载后两次失败重观形成ABA。
                for _ in range(2):
                    self.expect_code("E_BINDING", lambda: self.p1_observation(fs))
            self.expect_code("E_GATES", guard)

    def test_p1_forked_closure_cannot_reuse_parent_window(self):
        self.deploy()
        with transaction._Fs() as fs:
            guard = self.p1_observation(fs)
            child = os.fork()
            if child == 0:
                try:
                    guard()
                    os._exit(96)
                except transaction.TransactionError:
                    os._exit(0)
                except BaseException:
                    os._exit(97)
            _, status = os.waitpid(child, 0)
            self.assertEqual(os.waitstatus_to_exitcode(status), 0)
            guard()

    def test_p1_start_or_changed_instance_requires_new_world_epoch(self):
        self.deploy()
        with transaction._Fs() as fs:
            self.p1_observation(fs)()
            self.p1_invocations["gateway"] = "b" * 32
            self.expect_code("E_GATES", lambda: self.p1_observation(fs))
            self.assertEqual(self.p1_calls, 1)
            self.epoch = "hb_" + "d" * 32
            self.p1_observation(fs)()
            transaction._p1_starting(TXN)
            self.expect_code("E_GATES", lambda: self.p1_observation(fs))
            self.assertEqual(self.p1_calls, 2)
            self.epoch = "hb_" + "c" * 32
            self.p1_observation(fs)()

    def test_p1_bound_bytes_and_boot_drift_permanently_invalidate(self):
        self.deploy()
        paths = [self.candidate + "/backend/scripts/p6_heartbeat_watch.py",
                 self.upload + "/control/validate_release_health.py", "/proc/sys/kernel/random/boot_id",
                 transaction.CONFIG["apparmor_profile"][0], self.rollback + "/" + transaction.RECORD_NAME]
        with transaction._Fs() as fs:
            for path in paths:
                with self.subTest(path=path):
                    guard = self.p1_observation(fs)
                    original = self.path(path).read_bytes()
                    inode = self.path(path).stat().st_ino
                    self.path(path).write_bytes(original + b" ")
                    self.assertEqual(self.path(path).stat().st_ino, inode)
                    with self.assertRaises(transaction.TransactionError):
                        guard()
                    self.path(path).write_bytes(original)
                    self.expect_code("E_GATES", guard)

    def test_p1_sample_sink_rejects_malformed_short_write_and_sync_failure(self):
        raw = transaction._canonical({"schema_version": "p6-heartbeat-watch-v2", "at_unix": 1.0, "elapsed_s": 0.0,
                                     "gateway": "http://127.0.0.1:8000", "ok": False, "latency_s": 0.0,
                                     "run_epoch": None, "freshness_failure": "request_failed", "error": "request_failed"})
        bad = [b"{}\n", raw.replace(b"\n", b"\r\n"), raw.replace(b'"ok":false', b'"ok":true'),
               raw.replace(b'"latency_s":0.0', b'"latency_s":NaN'), raw.replace(b'"error":"request_failed"', b'"error":"invented"')]
        self.directory(self.rollback)
        with transaction._Fs() as fs:
            for index, data in enumerate(bad):
                with self.subTest(index=index), transaction._P1SampleSink(fs, self.rollback + "/bad-" + str(index)) as sink:
                    self.expect_code("E_GATES", lambda: sink.append(data))
                    self.assertEqual(self.path(sink.path).read_bytes(), b"")
                    self.expect_code("E_GATES", lambda: sink.append(raw))
            for kind in ("short", "sync"):
                with self.subTest(kind=kind), transaction._P1SampleSink(fs, self.rollback + "/" + kind) as sink:
                    write = os.write
                    def short_write(fd, data):
                        return write(fd, data[:-1])
                    context = patch.object(os, "write", side_effect=short_write) if kind == "short" else patch.object(os, "fsync", side_effect=OSError("fixture fsync"))
                    with context, self.assertRaises((OSError, transaction.TransactionError)):
                        sink.append(raw)
                    self.expect_code("E_GATES", sink.verify)
                    self.expect_code("E_GATES", lambda: sink.append(raw))

    def test_p1_sample_sink_rejects_same_inode_rewrite_and_path_replacement(self):
        self.deploy()
        with transaction._Fs() as fs:
            for kind in ("same-inode", "replacement"):
                with self.subTest(kind=kind):
                    guard = self.p1_observation(fs)
                    sink = self.p1_options["sync_sample"].__self__
                    self.assertIsNone(sink.fd)
                    path = self.path(sink.path)
                    raw = path.read_bytes()
                    inode = path.stat().st_ino
                    self.assertEqual(len(raw.splitlines()), 61)
                    if kind == "same-inode":
                        path.write_bytes(raw.replace(b'"at_unix":1000.0', b'"at_unix":2000.0', 1))
                        self.assertEqual(path.stat().st_ino, inode)
                    else:
                        replacement = path.with_suffix(".replaced")
                        replacement.write_bytes(raw)
                        replacement.chmod(0o600)
                        replacement.replace(path)
                        self.assertNotEqual(path.stat().st_ino, inode)
                    self.expect_code("E_GATES", guard)
                    path.write_bytes(raw)
                    self.expect_code("E_GATES", guard)

    def test_p1_sample_sink_streams_valid_samples_beyond_64mib(self):
        self.directory(self.rollback)
        data = self.health()
        data["fixture_padding"] = "中" * 340000
        # 上游1MiB HTTP体可在规范ensure_ascii编码后扩大；不引入任意累计容量政策。
        self.assertLessEqual(len(json.dumps(data, ensure_ascii=False).encode("utf-8")), 1024 * 1024)
        with transaction._Fs() as fs, transaction._P1SampleSink(fs, self.rollback + "/large-samples") as sink:
            for index in range(34):
                sample = {"schema_version": "p6-heartbeat-watch-v2", "at_unix": 1000.0 + index * 30,
                          "elapsed_s": float(index * 30), "gateway": "http://127.0.0.1:8000", "ok": True,
                          "latency_s": 0.001, "run_epoch": self.epoch, "freshness_failure": None,
                          "status": 200, "data": data}
                sink.append(transaction._canonical(sample))
            self.assertGreater(sink.length, 64 * 1024 * 1024)
            sink.verify()

    def test_p1_dynamic_exception_identity_is_used(self):
        self.deploy()
        seen = []
        def fail(actual_observation, actual_cleanup, **kwargs):
            seen.append((actual_observation, actual_cleanup))
            raise actual_observation("P1_OBSERVATION_FAILED")
        with patch.object(builtins, "_myweb_p1_fixture", fail), transaction._Fs() as fs:
            self.expect_code("E_GATES", lambda: self.p1_observation(fs))
            self.expect_code("E_GATES", lambda: self.p1_observation(fs))
        self.assertIsNot(seen[0][0], seen[1][0])
        self.assertFalse(issubclass(seen[0][1], seen[0][0]))
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_p1_signal_handlers_restore_on_observation_and_freshness(self):
        self.deploy()
        previous = {number: signal.getsignal(number) for number in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
        with transaction._Fs() as fs:
            guard = self.p1_observation(fs)
            self.assertEqual({number: signal.getsignal(number) for number in previous}, previous)
            guard()
            self.assertEqual({number: signal.getsignal(number) for number in previous}, previous)

    def test_p1_signal_install_or_restore_failure_stops_without_recovery(self):
        for stage in ("install", "restore"):
            with self.subTest(stage=stage):
                case = TransactionTests()
                case.setUp()
                original = signal.signal
                previous = {number: signal.getsignal(number) for number in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
                injected = False
                def failure(number, handler):
                    nonlocal injected
                    result = original(number, handler)
                    matched = (stage == "install" and number == signal.SIGTERM and handler is not previous[number]) or (
                        stage == "restore" and number == signal.SIGINT and handler is previous[number] and case.p1_calls > 0)
                    if not injected and matched:
                        injected = True
                        raise OSError("信号处理器已写入后的确定性异常")
                    return result
                try:
                    with patch.object(signal, "signal", side_effect=failure), patch.object(transaction, "_resume") as resume:
                        self.assertEqual(case.main_deploy(), 1)
                    self.assertTrue(injected)
                    resume.assert_not_called()
                    self.assertEqual(case.p1_calls, 0 if stage == "install" else 1)
                    self.assertEqual({number: signal.getsignal(number) for number in previous}, previous)
                finally:
                    for number, handler in previous.items():
                        original(number, handler)
                    case.doCleanups()

    def test_p1_sticky_cancel_rejects_callback_result_and_guard(self):
        for stage in ("callback", "result", "guard"):
            with self.subTest(stage=stage):
                case = TransactionTests()
                case.setUp()
                previous = signal.getsignal(signal.SIGINT)
                invoked = False
                def observe(ordinary, cleanup, **options):
                    def cancel():
                        nonlocal invoked
                        handler = signal.getsignal(signal.SIGINT)
                        if handler is previous or not callable(handler):
                            raise ordinary("取消处理器尚未安装")
                        handler(signal.SIGINT, None)
                        invoked = True
                    if stage == "callback":
                        cancel()
                        try:
                            options["revalidate_instance"]()
                        except BaseException as error:
                            raise ordinary("P1_OBSERVATION_FAILED") from error
                        raise AssertionError("取消后错误接纳了安全回调")
                    guarded = case.p1_observe(ordinary, cleanup, **options)
                    if stage == "result":
                        cancel()
                        return guarded
                    def cancelled_guard():
                        cancel()
                        return None
                    return cancelled_guard
                try:
                    with patch.object(builtins, "_myweb_p1_fixture", observe), patch.object(transaction, "_resume") as resume:
                        self.assertEqual(case.main_deploy(), 1)
                    self.assertTrue(invoked)
                    resume.assert_not_called()
                    self.assertNotIn(case.receipt()["phase"], transaction.TERMINAL_PHASES)
                    self.assertTrue(case.path(transaction.MAINTENANCE_PATH).exists())
                    self.assertIs(signal.getsignal(signal.SIGINT), previous)
                finally:
                    case.doCleanups()

    def test_p1_cancel_during_handler_restore_rejects_side_effect(self):
        for phase in ("exposing", "committing"):
            with self.subTest(phase=phase):
                case = TransactionTests()
                case.setUp()
                original = signal.signal
                previous = {number: signal.getsignal(number) for number in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
                injected = False
                def interrupt(number, handler):
                    nonlocal injected
                    result = original(number, handler)
                    if (not injected and number == signal.SIGINT and handler is previous[number]
                            and case.p1_freshness_calls > 0 and case.receipt()["phase"] == phase):
                        current = signal.getsignal(signal.SIGHUP)
                        if current is previous[signal.SIGHUP] or not callable(current):
                            raise OSError("尚未确认当前HUP由临时处理器接管")
                        os.kill(os.getpid(), signal.SIGHUP)
                        injected = True
                    return result
                try:
                    with patch.object(signal, "signal", side_effect=interrupt), patch.object(transaction, "_resume") as resume:
                        self.assertEqual(case.main_deploy(), 1)
                    self.assertTrue(injected)
                    resume.assert_not_called()
                    self.assertEqual(case.receipt()["phase"], phase)
                    if phase == "exposing":
                        self.assertTrue(case.path(transaction.MAINTENANCE_PATH).exists())
                        self.assertNotIn("GET https://lingxi.hi-veblen.com/api/health", case.events)
                    self.assertEqual(case.p1_calls, 1)
                    self.assertEqual({number: signal.getsignal(number) for number in previous}, previous)
                finally:
                    for number, handler in previous.items():
                        original(number, handler)
                    case.doCleanups()

    def test_p1_hold_close_failure_never_reenters_business_recovery(self):
        # 每个故障使用独立事务夹具，完整走main及真实合法回滚分支。
        for target in ("sink", "sink-parent", "root", "freshness-parent"):
            with self.subTest(target=target):
                case = TransactionTests()
                case.setUp()
                try:
                    close = os.close
                    failing_fds = set()
                    closed_fault = False
                    observations = 0
                    recovered = []
                    resume = transaction._resume
                    class Owner:
                        def try_cleanup(self):
                            return True
                    def cleanup_error(actual):
                        error = actual("P1_WORKER_CLEANUP_UNCONFIRMED")
                        error.owner = Owner()
                        return error
                    def observe(actual_observation, actual_cleanup, **options):
                        nonlocal observations
                        observations += 1
                        if observations > 1:
                            return case.p1_observe(actual_observation, actual_cleanup, **options)
                        if target == "freshness-parent":
                            guard = case.p1_observe(actual_observation, actual_cleanup, **options)
                            def fail_guard():
                                for entry in Path("/proc/self/fd").iterdir():
                                    try:
                                        if os.readlink(entry) == str(case.path("/run")):
                                            failing_fds.add(int(entry.name))
                                    except FileNotFoundError:
                                        pass
                                if not failing_fds:
                                    raise AssertionError("未捕获freshness副作用的目录fd")
                                raise cleanup_error(actual_cleanup)
                            return fail_guard
                        sink = options["sync_sample"].__self__
                        cells = dict(zip(options["revalidate_instance"].__code__.co_freevars,
                                         (cell.cell_contents for cell in options["revalidate_instance"].__closure__)))
                        failing_fds.add(sink.fd if target == "sink" else sink.parent if target == "sink-parent" else cells["fs"].root)
                        raise cleanup_error(actual_cleanup)
                    def fail_close(fd):
                        nonlocal closed_fault
                        close(fd)
                        if not closed_fault and fd in failing_fds:
                            closed_fault = True
                            raise OSError("已知fd关闭时的组合故障") from None
                    def record_resume(*args, **kwargs):
                        recovered.append(True)
                        return resume(*args, **kwargs)
                    with patch.object(builtins, "_myweb_p1_fixture", observe), \
                            patch.object(os, "close", side_effect=fail_close), \
                            patch.object(transaction, "_resume", side_effect=record_resume):
                        self.assertEqual(case.main_deploy(), 1)
                    self.assertTrue(closed_fault)
                    self.assertEqual(recovered, [])
                    self.assertEqual(observations, 1)
                    self.assertEqual(case.current_root("backend"), case.candidate + "/backend")
                finally:
                    case.doCleanups()

    def test_p1_worker_unknown_holds_real_process_resources_until_closed(self):
        for interrupted in (False, True, "entry", "mask"):
            with self.subTest(interrupted=interrupted), tempfile.TemporaryDirectory(prefix="myweb-p1-hold-parent-") as directory:
                report = Path(directory)
                if interrupted == "entry":
                    (report / "entry-interrupt").write_bytes(b"inject SIGINT immediately before first mask\n")
                if interrupted == "mask":
                    (report / "mask-failure").write_bytes(b"inject first mask failure\n")
                with (report / "child.log").open("wb") as log:
                    child = subprocess.Popen([sys.executable, "-B", str(Path(__file__).resolve()), "--p1-hold-child", directory],
                                             stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                             close_fds=True, start_new_session=True)
                    def wait_report(minimum):
                        deadline = time.monotonic() + 20
                        while time.monotonic() < deadline:
                            state_path = report / "state.json"
                            if state_path.exists():
                                state = json.loads(state_path.read_text(encoding="utf-8"))
                                if state["attempts"] >= minimum:
                                    return state
                            self.assertIsNone(child.poll(), (report / "child.log").read_text(encoding="utf-8"))
                            time.sleep(0.02)
                        self.fail("未取得实际HOLD与资源验证证据")
                    try:
                        state = wait_report(2)
                        self.assertTrue(state["held"])
                        self.assertTrue(state["worker_alive"])
                        self.assertGreaterEqual(state["tracked_fds"], 6)
                        self.assertEqual(state["phase"], "deploying")
                        with open(state["lock_path"], "rb") as contender:
                            with self.assertRaises(BlockingIOError):
                                transaction.fcntl.flock(contender.fileno(), transaction.fcntl.LOCK_EX | transaction.fcntl.LOCK_NB)
                        if interrupted is True or interrupted == "mask":
                            child.send_signal(signal.SIGTERM)
                        later = wait_report(state["attempts"] + 2)
                        self.assertTrue(later["held"])
                        self.assertTrue(later["worker_alive"])
                        self.assertIsNone(child.poll())
                        (report / "release").write_bytes(b"release known fixture worker\n")
                        child.wait(timeout=10)
                        self.assertNotEqual(child.returncode, 0)
                        self.assertTrue((report / "known-closed").exists())
                        self.assertFalse((report / "business-replayed").exists())
                        if interrupted == "entry":
                            self.assertTrue((report / "entry-signal-injected").exists())
                        if interrupted == "mask":
                            self.assertTrue((report / "mask-failure-injected").exists())
                        self.assertFalse(Path("/proc/" + str(state["worker_pid"])).exists())
                        if not interrupted:
                            self.assertEqual(child.returncode, 1)
                    finally:
                        try:
                            # 本测试独占的进程组也包含异常退出后仍存活的已知fixture worker。
                            os.killpg(child.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                        if child.poll() is None:
                            child.wait(timeout=5)


def _p1_hold_fixture(directory: str) -> int:
    """独立Linux测试进程；只创建私有文件和已知sleep worker，服务/网络沿用替身。"""
    case = TransactionTests()
    case.setUp()
    report = Path(directory)
    try:
        masked = signal.pthread_sigmask
        injected = False
        def entry_signal(how, values):
            nonlocal injected
            if not injected and how == signal.SIG_BLOCK and (report / "mask-failure").exists():
                injected = True
                (report / "mask-failure-injected").write_bytes(b"first pthread_sigmask failed\n")
                raise OSError("确定性屏蔽失败")
            if not injected and how == signal.SIG_BLOCK and (report / "entry-interrupt").exists():
                injected = True
                (report / "entry-signal-injected").write_bytes(b"before first pthread_sigmask\n")
                os.kill(os.getpid(), signal.SIGINT)
            return masked(how, values)
        def observe(observation_error, cleanup_error, **options):
            worker = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import time; time.sleep(120)"],
                                      stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, close_fds=True)
            events = list(case.events)
            snapshot = case.material_snapshot()
            captured = {}
            for entry in Path("/proc/self/fd").iterdir():
                try:
                    target = os.readlink(entry)
                    if target.startswith(str(case.root)):
                        captured[int(entry.name)] = os.fstat(int(entry.name))
                except FileNotFoundError:
                    pass
            sink = options["sync_sample"].__self__
            if sink.fd not in captured or case.lock_fd not in captured or case.lease_fd not in captured:
                raise AssertionError("没有捕获真实控制描述符")
            class Owner:
                attempts = 0
                closed = False
                def try_cleanup(self):
                    if self.closed:
                        return True
                    self.attempts += 1
                    held = all(os.fstat(fd).st_ino == old.st_ino and os.fstat(fd).st_dev == old.st_dev
                               for fd, old in captured.items())
                    unchanged = case.events == events and case.material_snapshot() == snapshot
                    if not held or not unchanged:
                        (report / "business-replayed").write_bytes(b"failed\n")
                    state = {"attempts": self.attempts, "held": held and unchanged,
                             "worker_alive": worker.poll() is None, "worker_pid": worker.pid,
                             "tracked_fds": len(captured), "phase": case.receipt()["phase"],
                             "lock_path": str(case.path(transaction.LOCK_PATH))}
                    pending = report / "pending.json"
                    pending.write_text(json.dumps(state), encoding="utf-8")
                    pending.replace(report / "state.json")
                    if not (report / "release").exists():
                        if self.attempts % 2 == 0:
                            raise RuntimeError("已知worker的回收尚未确认")
                        return False
                    worker.kill()
                    worker.wait(timeout=1)
                    for stream in (worker.stdin, worker.stdout, worker.stderr):
                        stream.close()
                    self.closed = True
                    (report / "known-closed").write_bytes(b"known worker reaped and pipes closed\n")
                    return True
            error = cleanup_error("P1_WORKER_CLEANUP_UNCONFIRMED")
            error.owner = Owner()
            raise error
        def replay(*args, **kwargs):
            (report / "business-replayed").write_bytes(b"unexpected fallback\n")
            raise AssertionError("HOLD后禁止业务回放")
        with patch.object(builtins, "_myweb_p1_fixture", observe), \
                patch.object(signal, "pthread_sigmask", side_effect=entry_signal), \
                patch.object(transaction, "_resume", side_effect=replay), \
                patch.object(transaction, "_isolate_if_uncommitted", side_effect=replay):
            return case.main_deploy()
    finally:
        case.doCleanups()


if __name__ == "__main__":
    if "--p1-hold-child" in sys.argv:
        if not POSIX or len(sys.argv) != 3:
            raise SystemExit("HOLD测试入口仅接受root Linux的固定参数")
        raise SystemExit(_p1_hold_fixture(sys.argv[2]))
    require_posix = "--require-posix" in sys.argv
    if require_posix:
        sys.argv.remove("--require-posix")
        if not POSIX:
            raise SystemExit("真实 POSIX 测试环境不可用，CI 不允许仅 skip 后通过")
    unittest.main(verbosity=2)
