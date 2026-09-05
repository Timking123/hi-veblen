#!/usr/bin/env python3
"""在私有 Linux 临时根执行真实事务；仅替换服务、网络和独立制品来源边界。"""

from __future__ import annotations

import copy
import io
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
import unittest
from contextlib import ExitStack
from unittest.mock import patch

import release_transaction as transaction


POSIX = sys.platform == "linux" and hasattr(os, "geteuid") and os.geteuid() == 0
PORTAL = "a" * 40
BACKEND = "b" * 40
PREVIOUS = "c" * 40
TXN = f"run-31-2-{PORTAL}"
PHASES = {"persona_schema": "compat", "persona_growth": "compat", "world_ledger": "compat"}


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
        self.counter = 10
        self.epoch = "hb_" + "e" * 32
        self.events: list[str] = []
        self.watcher_failure: str | None = None
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
                    self.write(root + "/.release.env", transaction._release_env(backend))
                    self.write(root + "/ops/apparmor/myagent-persona-parser", b"# fixture profile\n")
                    self.write(root + "/ops/nginx/hi-veblen.com.http.conf", self.nginx())
                    self.write(root + "/scripts/p6_heartbeat_watch.py", "# 独立网络观察器边界夹具\n".encode("utf-8"))
        for slot, current in transaction.CURRENT.items():
            os.symlink(self.old + "/" + slot, self.path(current))
        for key, (path, _) in transaction.CONFIG.items():
            if key.endswith("_enabled"):
                available = transaction.CONFIG[key.replace("_enabled", "_available")][0]
                os.symlink(available, self.path(path))
            elif key.endswith("_unit"):
                self.write(path, self.unit_bytes())
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
        original_open = open

        def kernel_open(path, *args, **kwargs):
            if path == "/proc/sys/kernel/apparmor_restrict_unprivileged_userns":
                return io.BytesIO(b"1\n")
            return original_open(path, *args, **kwargs)

        self.stack.enter_context(patch("builtins.open", side_effect=kernel_open))

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

    def unit_bytes(self, phases: dict[str, str] | None = None) -> bytes:
        phases = phases or PHASES
        return ("[Service]\nEnvironment=LINGXI_PERSONA_SCHEMA_PHASE=" + phases["persona_schema"] +
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
                return b"\n"
            if "Environment" in arguments:
                unit = arguments[2]
                raw = self.path("/etc/systemd/system/" + unit).read_text()
                return " ".join(line[len("Environment="):] for line in raw.splitlines() if line.startswith("Environment=")).encode()
            if "ActiveState" in arguments:
                return b"active\n" if self.active else b"inactive\n"
            if arguments[1] == "stop":
                self.active = False
            elif arguments[1] in ("start", "restart"):
                self.active = True
            elif arguments[1] == "is-active" and not self.active:
                raise transaction.TransactionError("E_SERVICES")
            return b""
        if arguments[0] == "nginx":
            return self.nginx() if arguments[1] == "-T" else b""
        if arguments[0] == "apparmor_parser":
            return b""
        if arguments[0] == "bash":
            self.active = True
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
            return json.dumps(summary).encode()
        raise AssertionError("未经定义的服务边界：" + repr(arguments))

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

    def test_recovery_drift_still_isolates_bound_nonterminal_transaction(self):
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
        link = self.path(transaction.CURRENT["portal"])
        link.unlink()
        os.symlink(self.old + "/portal", link)
        with transaction._Fs() as fs, self.assertRaises(transaction.TransactionError):
            transaction._resume(TXN, fs, self.lock_fd)
        self.assertFalse(self.active)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

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
        original = self.command

        def mutate_profile(arguments, **kwargs):
            result = original(arguments, **kwargs)
            if "--expected-revision" in arguments:
                self.write(transaction.CONFIG["apparmor_profile"][0], b"changed\n")
            return result

        with patch.object(transaction, "_command", side_effect=mutate_profile):
            self.expect_code("E_GATES", self.finalize)
        self.assertEqual(self.receipt()["phase"], "deploying")
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

    def test_recovery_missing_preserve_still_stops_own_services(self):
        self.deploy()
        self.path(self.upload + "/PRESERVE").unlink()
        self.path(transaction.MAINTENANCE_PATH).unlink()
        self.active = True
        with transaction._Fs() as fs, self.assertRaises((transaction.TransactionError, OSError)):
            transaction._resume(TXN, fs, self.lock_fd)
        self.assertFalse(self.active)
        self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())

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

    def test_watcher_contract_is_not_single_health_sample(self):
        self.deploy()
        for failure in ("epoch", "v1", "fsync", "stalled"):
            self.watcher_failure = failure
            self.expect_code("E_GATES", self.finalize)
            self.assertEqual(self.receipt()["phase"], "deploying")
            self.assertTrue(self.path(transaction.MAINTENANCE_PATH).exists())


if __name__ == "__main__":
    require_posix = "--require-posix" in sys.argv
    if require_posix:
        sys.argv.remove("--require-posix")
        if not POSIX:
            raise SystemExit("真实 POSIX 测试环境不可用，CI 不允许仅 skip 后通过")
    unittest.main(verbosity=2)
