"""一次性准备 D050 生产验收合成用户；只在临时恢复分支运行。"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
import signal
import stat
import subprocess
import sys
import time
import uuid
from contextlib import contextmanager
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any
from urllib import error, request

from dotenv import dotenv_values

from brain.persona import DEFAULT_PERSONA_ID
from brain.workspace import p6_config
from brain.workspace.p6_config import (
    CONSENT_NOTICE_HASH,
    CONSENT_NOTICE_VERSION,
    PERSONA_GROWTH_NOTICE_HASH,
    PERSONA_GROWTH_NOTICE_VERSION,
    is_gateway_token_revoked,
    revoke_gateway_tokens,
    token_hash,
)
from brain.workspace.user_paths import ProcessFileLock, load_user_meta, user_storage_paths


DATA_DIR = "/opt/myagent/data"
TARGET_PERSIST_ID = "p6_load_c"
STUCK_PERSIST_ID = "p6_load_b"
PUBLIC_BASE_URL = "https://lingxi.hi-veblen.com"
OPS_DIR = Path("/opt/myagent/d050-recovery/p6-load-c")
STATE_PATH = OPS_DIR / "setup.json"
LEASE_PATH = OPS_DIR / "lease.json"
WATCHDOG_PATH = OPS_DIR / "watchdog.py"
WATCHDOG_CRON_PATH = Path("/etc/cron.d/d050-p6-load-c")
LOCK_DIR = Path("/run/myagent-d050-p6-load-c-locks")
LEASE_LOCK_PATH = LOCK_DIR / "lease.lock"
API_WINDOW_LOCK_PATH = LOCK_DIR / "api.lock"
RELEASE_LOCK_PATH = Path("/run/hi-veblen-release.lock")
RELEASE_LEASE_DIR = Path("/run/hi-veblen-release-lease")
MAINTENANCE_MARKER_PATH = Path("/run/myagent-release-maintenance")
PRESERVE_MARKER_PATH = Path("/run/hi-veblen-release-preserve")
FLOCK_PATH = Path("/usr/bin/flock")
BACKEND_PYTHON_PATH = Path("/opt/myagent/backend-current/.venv/bin/python")
AUDITION_TIMEOUT_SECONDS = 30 * 60
OPERATION_TIMEOUT_SECONDS = 65 * 60
LEASE_TTL_SECONDS = 2 * 60 * 60
WATCHDOG_GRACE_SECONDS = 10 * 60
MAX_API_RESPONSE_BYTES = 4 * 1024 * 1024
APPROVED_AUDITION_SHA256 = ""
_OPERATION_DEADLINE: float | None = None
_CURRENT_OPERATION_ID = ""
_CURRENT_TOKEN_HASH = ""
_CURRENT_MODE = ""
_CURRENT_BROWSER_OPENER: Any | None = None
_CURRENT_BROWSER_TOKEN_HASH = ""

WATCHDOG_SOURCE = r'''from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, "/opt/myagent/backend-current")

from dotenv import dotenv_values
from brain.workspace.p6_config import (
    atomic_write_json,
    is_gateway_token_revoked,
    parse_user_token_map,
    revoke_gateway_tokens,
    token_hash,
)
from brain.workspace.user_paths import ProcessFileLock

DATA_DIR = "/opt/myagent/data"
TARGET_PERSIST_ID = "p6_load_c"
LEASE_PATH = Path("/opt/myagent/d050-recovery/p6-load-c/lease.json")
LOCK_DIR = Path("/run/myagent-d050-p6-load-c-locks")
LOCK_PATH = LOCK_DIR / "lease.lock"
API_LOCK_PATH = LOCK_DIR / "api.lock"
CRON_PATH = Path("/etc/cron.d/d050-p6-load-c")
RELEASE_LEASE_DIR = Path("/run/hi-veblen-release-lease")
MAINTENANCE_MARKER_PATH = Path("/run/myagent-release-maintenance")
PRESERVE_MARKER_PATH = Path("/run/hi-veblen-release-preserve")


def remove_own_cron(operation_id: str) -> None:
    if CRON_PATH.is_symlink():
        return
    try:
        content = CRON_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return
    if operation_id in content:
        CRON_PATH.unlink(missing_ok=True)


def ensure_lock_dir() -> None:
    if LOCK_DIR.is_symlink():
        raise RuntimeError("合成用户锁目录不能是符号链接")
    LOCK_DIR.mkdir(mode=0o700, exist_ok=True)
    stat = LOCK_DIR.stat()
    expected_uid = getattr(os, "geteuid", lambda: stat.st_uid)()
    if not LOCK_DIR.is_dir() or stat.st_uid != expected_uid:
        raise RuntimeError("合成用户锁目录 owner 无效")
    os.chmod(LOCK_DIR, 0o700)
    if LOCK_PATH.is_symlink() or API_LOCK_PATH.is_symlink():
        raise RuntimeError("合成用户锁文件不能是符号链接")


def main() -> int:
    operation_id = sys.argv[1]
    if any(
        path.exists() or path.is_symlink()
        for path in (
            RELEASE_LEASE_DIR,
            MAINTENANCE_MARKER_PATH,
            PRESERVE_MARKER_PATH,
        )
    ):
        return 1
    if not LEASE_PATH.is_file() or LEASE_PATH.is_symlink():
        remove_own_cron(operation_id)
        return 0
    ensure_lock_dir()
    api_lock = ProcessFileLock(API_LOCK_PATH)
    for _attempt in range(3600):
        try:
            api_lock.acquire()
            break
        except RuntimeError:
            time.sleep(0.1)
    else:
        return 1
    lock = ProcessFileLock(LOCK_PATH)
    try:
        for _attempt in range(300):
            try:
                lock.acquire()
                break
            except RuntimeError:
                time.sleep(0.1)
        else:
            return 1
        try:
            if not LEASE_PATH.is_file() or LEASE_PATH.is_symlink():
                remove_own_cron(operation_id)
                return 0
            lease = json.loads(LEASE_PATH.read_text(encoding="utf-8"))
            if time.time() < float(lease.get("watchdog_after_epoch") or 0):
                return 0
            values = dotenv_values("/opt/myagent/.env")
            mapping = parse_user_token_map(
                values.get("BRAIN_GATEWAY_USER_TOKENS") or ""
            )
            token = str(mapping.get(TARGET_PERSIST_ID) or "")
            if not token or lease.get("token_hash") != token_hash(token):
                return 1
            status = str(lease.get("status") or "")
            if status != "sealed":
                lease["status"] = "fenced"
                lease["watchdog_after_epoch"] = time.time()
                atomic_write_json(str(LEASE_PATH), lease)
        finally:
            lock.release()
        token_was_revoked = is_gateway_token_revoked(DATA_DIR, token_hash(token))
        if not token_was_revoked:
            revoke_gateway_tokens(
                DATA_DIR,
                [token_hash(token)],
                reason="d050_synthetic_watchdog_resealed",
            )
            if not is_gateway_token_revoked(DATA_DIR, token_hash(token)):
                return 1
        if status != "sealed" or not token_was_revoked:
            subprocess.run(
                ["systemctl", "restart", "myagent-gateway.service"],
                check=True,
                timeout=120,
            )
            subprocess.run(
                ["systemctl", "is-active", "--quiet", "myagent-gateway.service"],
                check=True,
                timeout=30,
            )
        remove_own_cron(operation_id)
        return 0
    finally:
        api_lock.release()


if __name__ == "__main__":
    raise SystemExit(main())
'''


def _values() -> dict[str, Any]:
    return dict(dotenv_values("/opt/myagent/.env"))


def _target_token(values: dict[str, Any]) -> str:
    mapping = p6_config.parse_user_token_map(
        str(values.get("BRAIN_GATEWAY_USER_TOKENS") or "")
    )
    token = str(mapping.get(TARGET_PERSIST_ID) or "")
    if not token:
        raise RuntimeError("合成用户邀请映射不存在")
    return token


def _api_timeout() -> float:
    if _OPERATION_DEADLINE is None:
        return 300
    remaining = _OPERATION_DEADLINE - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("合成用户操作已到安全收尾时间")
    return min(300, remaining)


@contextmanager
def _hard_timeout(seconds: float, message: str):
    if not hasattr(signal, "SIGALRM") or not hasattr(signal, "setitimer"):
        yield
        return
    if signal.getitimer(signal.ITIMER_REAL)[0] > 0:
        raise RuntimeError("合成用户操作存在冲突的进程级计时器")

    def timeout_handler(_signum: int, _frame: Any) -> None:
        raise TimeoutError(message)

    previous_handler = signal.getsignal(signal.SIGALRM)
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.setitimer(signal.ITIMER_REAL, max(0.001, seconds))
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_handler)


def _read_response(response: Any, *, label: str) -> str:
    raw = response.read(MAX_API_RESPONSE_BYTES + 1)
    if len(raw) > MAX_API_RESPONSE_BYTES:
        raise RuntimeError(f"{label} 响应体超过安全上限")
    return raw.decode("utf-8", errors="replace")


def _open_response(
    opener: Any,
    req: request.Request,
    *,
    timeout: float,
    label: str,
) -> tuple[int, str]:
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.status, _read_response(response, label=label)
    except error.HTTPError as exc:
        return exc.code, _read_response(exc, label=label)


def _browser_session_opener(token: str, *, timeout: float) -> Any:
    cookie_jar = CookieJar()
    opener = request.build_opener(request.HTTPCookieProcessor(cookie_jar))
    req = request.Request(
        PUBLIC_BASE_URL + "/api/session",
        data=json.dumps({"token": token}).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    status, raw = _open_response(
        opener,
        req,
        timeout=timeout,
        label="POST /api/session",
    )
    if status != 200:
        try:
            detail = json.loads(raw).get("detail") or ""
        except json.JSONDecodeError:
            detail = ""
        raise RuntimeError(f"POST /api/session HTTP {status}: {str(detail)[:240]}")
    try:
        session = json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError("POST /api/session 返回非 JSON") from exc
    session_cookies = [
        cookie for cookie in cookie_jar
        if cookie.name == "__Host-lingxi_session"
    ]
    if (
        not isinstance(session, dict)
        or session.get("scope") != "user"
        or session.get("persist_id") != TARGET_PERSIST_ID
        or len(session_cookies) != 1
        or not session_cookies[0].secure
        or session_cookies[0].path != "/"
        or session_cookies[0].domain_specified
    ):
        raise RuntimeError("生产浏览器短会话绑定结果无效")
    return opener


def _operation_browser_opener(token: str, *, timeout: float) -> Any:
    global _CURRENT_BROWSER_OPENER, _CURRENT_BROWSER_TOKEN_HASH
    digest = token_hash(token)
    if _CURRENT_BROWSER_OPENER is not None:
        if _CURRENT_BROWSER_TOKEN_HASH != digest:
            raise RuntimeError("生产浏览器短会话 token 摘要已变化")
        return _CURRENT_BROWSER_OPENER
    opener = _browser_session_opener(token, timeout=timeout)
    _CURRENT_BROWSER_OPENER = opener
    _CURRENT_BROWSER_TOKEN_HASH = digest
    return opener


def _api(
    token: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    *,
    expected_statuses: tuple[int, ...] = (200,),
) -> dict[str, Any]:
    with _api_window_guard():
        _touch_watchdog()
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = request.Request(
            PUBLIC_BASE_URL + path,
            data=body,
            method=method,
            headers={
                "Content-Type": "application/json",
                "X-Lingxi-Expected-Persist-Id": TARGET_PERSIST_ID,
            },
        )
        request_timeout = _api_timeout()
        try:
            _unrevoke_target(token)
            with _hard_timeout(request_timeout, f"{method} {path} 响应超时"):
                opener = _operation_browser_opener(token, timeout=request_timeout)
                status, raw = _open_response(
                    opener,
                    req,
                    timeout=request_timeout,
                    label=f"{method} {path}",
                )
        finally:
            _revoke_target(token, reason="d050_synthetic_api_window_closed")
    if status not in expected_statuses:
        try:
            detail = json.loads(raw).get("detail") or ""
        except json.JSONDecodeError:
            detail = ""
        raise RuntimeError(f"{method} {path} HTTP {status}: {str(detail)[:240]}")
    try:
        result = json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{method} {path} 返回非 JSON") from exc
    if not isinstance(result, dict):
        raise RuntimeError(f"{method} {path} 返回结构无效")
    return result


def _unrevoke_target(token: str) -> None:
    digest = token_hash(token)
    if not is_gateway_token_revoked(DATA_DIR, digest):
        raise RuntimeError("合成邀请并非撤销状态，拒绝覆盖现有现场")
    with p6_config._REVOCATION_LOCK:  # noqa: SLF001 - 一次性运维严格复用原锁序
        file_lock = p6_config._acquire_revocation_file_lock(DATA_DIR)  # noqa: SLF001
        try:
            data = p6_config._load_revocations(DATA_DIR, require_exists=True)  # noqa: SLF001
            removed = data["tokens"].pop(digest, None)
            if not isinstance(removed, dict):
                raise RuntimeError("撤销表中的合成邀请状态已变化")
            data["updated_at"] = p6_config.clock.to_iso()
            p6_config.atomic_write_json(  # noqa: SLF001
                str(p6_config._revocation_path(DATA_DIR)), data  # noqa: SLF001
            )
        finally:
            file_lock.release()
    if is_gateway_token_revoked(DATA_DIR, digest):
        raise RuntimeError("合成邀请显式恢复未生效")


def _revoke_target(token: str, *, reason: str) -> None:
    digest = token_hash(token)
    revoke_gateway_tokens(DATA_DIR, [digest], reason=reason)
    if not is_gateway_token_revoked(DATA_DIR, digest):
        raise RuntimeError("合成邀请撤销未生效")


def _host_purge(values: dict[str, Any], persist_id: str) -> dict[str, Any]:
    host_token = str(
        values.get("BRAIN_HOST_TOKEN")
        or values.get("BRAIN_GATEWAY_TOKEN")
        or ""
    ).strip()
    if not host_token:
        raise RuntimeError("宿主内部认证不可用")
    host_port = int(values.get("BRAIN_HOST_PORT") or 8765)
    req = request.Request(
        f"http://127.0.0.1:{host_port}/host/purge_user",
        data=json.dumps({"persist_id": persist_id}).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {host_token}",
            "Content-Type": "application/json",
        },
    )
    with _hard_timeout(180, "宿主合成用户清理响应超时"):
        with request.urlopen(req, timeout=180) as response:
            result = json.loads(_read_response(response, label="宿主合成用户清理"))
    if response.status != 200 or result.get("ok") is not True:
        raise RuntimeError("宿主未确认合成用户清理完成")
    return result


def _restart_gateway() -> None:
    subprocess.run(
        ["systemctl", "restart", "myagent-gateway.service"],
        check=True,
        timeout=120,
    )
    subprocess.run(
        ["systemctl", "is-active", "--quiet", "myagent-gateway.service"],
        check=True,
        timeout=30,
    )


def _restart_world(values: dict[str, Any]) -> None:
    expected_revision = Path("/opt/myagent/backend-current/release.txt").read_text(
        encoding="ascii"
    ).strip()
    if not re.fullmatch(r"[0-9a-f]{40}", expected_revision):
        raise RuntimeError("当前 backend revision 无效")
    subprocess.run(
        [
            "systemctl",
            "restart",
            "myagent-world.service",
            "myagent-gateway.service",
        ],
        check=True,
        timeout=180,
    )
    for unit in ("myagent-world.service", "myagent-gateway.service"):
        for action in ("is-active", "is-enabled"):
            subprocess.run(
                ["systemctl", action, "--quiet", unit],
                check=True,
                timeout=30,
            )
        drop_ins = subprocess.run(
            ["systemctl", "show", unit, "-p", "DropInPaths", "--value"],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        ).stdout.strip()
        if drop_ins:
            raise RuntimeError(f"{unit} 存在临时 DropInPaths")
    host_port = int(values.get("BRAIN_HOST_PORT") or 8765)
    gateway_port = int(values.get("BRAIN_GATEWAY_PORT") or 8000)
    deadline = time.monotonic() + 180
    stable_samples = 0
    while time.monotonic() < deadline:
        try:
            with request.urlopen(
                f"http://127.0.0.1:{host_port}/host/health", timeout=10
            ) as response:
                payload = json.loads(_read_response(response, label="world 健康检查"))
            host = payload.get("host") or payload
            heartbeat = host.get("heartbeat") or {}
            with request.urlopen(
                f"http://127.0.0.1:{gateway_port}/api/health", timeout=10
            ) as gateway_response:
                gateway_payload = json.loads(
                    _read_response(gateway_response, label="gateway 健康检查")
                )
            gateway_host = gateway_payload.get("host") or {}
            stable = bool(
                response.status == 200
                and gateway_response.status == 200
                and host.get("ok") is True
                and host.get("ready") is True
                and host.get("backend_revision") == expected_revision
                and host.get("audition_isolation_ok") is True
                and heartbeat.get("running") is True
                and heartbeat.get("first_fire_completed") is True
                and heartbeat.get("first_fire_ok") is True
                and heartbeat.get("in_flight") is False
                and heartbeat.get("in_flight_timed_out") is False
                and int(heartbeat.get("consecutive_failures") or 0) == 0
                and gateway_payload.get("ok") is True
                and gateway_payload.get("backend_revision") == expected_revision
                and gateway_host.get("ok") is True
                and gateway_host.get("ready") is True
                and gateway_host.get("backend_revision") == expected_revision
            )
            stable_samples = stable_samples + 1 if stable else 0
            if stable_samples >= 2:
                return
        except (OSError, ValueError, error.URLError):
            stable_samples = 0
        time.sleep(2)
    raise RuntimeError("world 服务重启后未进入连续两次稳定就绪")


def _install_watchdog(operation_id: str) -> None:
    for required_path in (
        FLOCK_PATH,
        BACKEND_PYTHON_PATH,
    ):
        if not required_path.is_file():
            raise RuntimeError(f"合成用户看门狗依赖不可用：{required_path}")
    for action in ("is-active", "is-enabled"):
        subprocess.run(
            ["systemctl", action, "--quiet", "cron.service"],
            check=True,
            timeout=30,
        )
    _atomic_write_text(WATCHDOG_PATH, WATCHDOG_SOURCE, 0o700)
    cron_line = (
        "* * * * * root cd /opt/myagent/backend-current && "
        f"{FLOCK_PATH} -n {RELEASE_LOCK_PATH} "
        f"{FLOCK_PATH} -n /run/d050-p6-load-c-watchdog.lock "
        f"{BACKEND_PYTHON_PATH} -B "
        "/opt/myagent/d050-recovery/p6-load-c/watchdog.py "
        f"{operation_id} >/dev/null 2>&1\n"
    )
    _atomic_write_text(WATCHDOG_CRON_PATH, cron_line, 0o600)


def _remove_watchdog(operation_id: str) -> None:
    if WATCHDOG_CRON_PATH.is_symlink():
        raise RuntimeError("合成用户看门狗计划不能是符号链接")
    try:
        content = WATCHDOG_CRON_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        WATCHDOG_PATH.unlink(missing_ok=True)
        return
    if operation_id not in content:
        return
    WATCHDOG_CRON_PATH.unlink(missing_ok=True)
    WATCHDOG_PATH.unlink(missing_ok=True)


def _remove_ops_dir_if_empty() -> None:
    try:
        OPS_DIR.rmdir()
    except OSError:
        pass


def _assert_recovery_artifacts_removed() -> None:
    if (
        WATCHDOG_CRON_PATH.exists()
        or WATCHDOG_CRON_PATH.is_symlink()
        or OPS_DIR.exists()
        or OPS_DIR.is_symlink()
    ):
        raise RuntimeError("合成用户临时恢复文件尚未清零")


@contextmanager
def _release_guard():
    if RELEASE_LOCK_PATH.is_symlink():
        raise RuntimeError("生产发布锁不能是符号链接")
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(RELEASE_LOCK_PATH, flags, 0o600)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid():
            raise RuntimeError("生产发布锁 owner 或类型无效")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise RuntimeError("生产发布事务正在运行") from exc
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def _require_release_idle() -> None:
    for path in (
        RELEASE_LEASE_DIR,
        MAINTENANCE_MARKER_PATH,
        PRESERVE_MARKER_PATH,
    ):
        if path.exists() or path.is_symlink():
            raise RuntimeError(f"检测到生产发布保护现场：{path}")


def _require_stuck_host(values: dict[str, Any]) -> None:
    mapping = p6_config.parse_user_token_map(
        str(values.get("BRAIN_GATEWAY_USER_TOKENS") or "")
    )
    token = str(mapping.get(STUCK_PERSIST_ID) or "")
    user_dir = Path(user_storage_paths(DATA_DIR, STUCK_PERSIST_ID).user_dir)
    if not token:
        raise RuntimeError("旧删除失败现场的邀请映射不存在")
    if not is_gateway_token_revoked(DATA_DIR, token_hash(token)):
        raise RuntimeError("旧删除失败现场的邀请尚未撤销")
    if user_dir.is_symlink() or not user_dir.is_dir():
        raise RuntimeError("旧删除失败现场的用户目录不存在")


def _draft(catalog: dict[str, Any]) -> dict[str, Any]:
    presets = [
        item
        for item in catalog.get("presets") or []
        if isinstance(item, dict) and item.get("id") == DEFAULT_PERSONA_ID
    ]
    if len(presets) != 1:
        raise RuntimeError("默认共享预设不可用")
    dimensions = catalog.get("relationship_dimensions") or []
    relationship_profile = {
        str(item["id"]): int(item["default"])
        for item in dimensions
        if isinstance(item, dict) and item.get("id")
    }
    return {
        "mode": "preset",
        "setup_mode": "quick",
        "studio_draft_id": "",
        "studio_revision": 0,
        "preset_role_id": DEFAULT_PERSONA_ID,
        "name": "",
        "age": None,
        "gender": "",
        "occupation": "",
        "scene": "",
        "history": "",
        "worldview": "",
        "life_view": "",
        "values_view": "",
        "relation_expectation": "作为边界清晰、彼此尊重的长期伙伴共同成长",
        "relationship_profile": relationship_profile,
        "quiet_start": "23:30",
        "quiet_end": "08:00",
        "role_big_five_answers": {},
        "role_value_answers": {},
        "value_priorities": [],
        "value_non_negotiable": "",
        "supplemental_answers": {},
        "preview_adjustments": [],
    }


def _synthetic_supplemental_answer(question_id: str) -> str:
    answers = {
        "background_story": "参与过一次社区步行路线改进",
        "life_scene": "安静、开放并重视边界的日常空间",
        "current_concern": "把长期陪伴做得稳定而不过度打扰",
        "life_context": (
            "日常：安静、开放并重视边界的生活空间；"
            "经历：参与过一次社区步行路线改进；"
            "牵挂：把长期陪伴做得稳定而不过度打扰"
        ),
        "values": "真诚；尊重边界；重视具体生活",
        "core_values_growth": (
            "三观：真诚、尊重边界并重视具体生活；"
            "守住：不替用户作重大决定；"
            "成长：依据真实经历形成连续而可解释的变化"
        ),
        "core_commitment": "保持真诚，也尊重双方的明确边界",
        "growth_direction": "依据真实经历形成连续而可解释的变化",
        "conflict_repair": "先暂停，再把事实、感受和边界说清楚",
        "repair_boundaries": (
            "修复：先暂停，再把事实和感受说清楚；"
            "边界：不替用户作重大决定"
        ),
        "communication_preference": "先说明观察，再自然询问对方是否愿意继续",
        "boundaries": "不替用户作重大决定，也不越过明确拒绝",
        "shared_topics": "日常生活、长期计划和真实经历中的变化",
        "relationship_expectation": "作为边界清晰、彼此尊重的长期伙伴共同成长",
        "user_routine": "白天保持克制联系，夜间遵守勿扰时间",
    }
    try:
        return answers[question_id]
    except KeyError as exc:
        raise RuntimeError(f"未知出生补充问题：{question_id}") from exc


def _atomic_write_text(path: Path, content: str, mode: int) -> None:
    if path.exists() and path.is_symlink():
        raise RuntimeError(f"拒绝覆盖符号链接：{path}")
    tmp = path.with_name(f"{path.name}.tmp.{os.getpid()}.{uuid.uuid4().hex}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(tmp, flags, mode)
    try:
        os.write(fd, content.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)
    os.replace(tmp, path)


def _write_private_json(path: Path, payload: dict[str, Any]) -> None:
    OPS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    if OPS_DIR.is_symlink():
        raise RuntimeError("合成用户运维目录不能是符号链接")
    os.chmod(OPS_DIR, 0o700)
    _atomic_write_text(
        path,
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2),
        0o600,
    )


def _write_state(payload: dict[str, Any]) -> None:
    _write_private_json(STATE_PATH, payload)


def _write_lease_unlocked(payload: dict[str, Any]) -> None:
    _write_private_json(LEASE_PATH, payload)


def _ensure_lock_dir() -> None:
    if LOCK_DIR.is_symlink():
        raise RuntimeError("合成用户锁目录不能是符号链接")
    LOCK_DIR.mkdir(mode=0o700, exist_ok=True)
    stat = LOCK_DIR.stat()
    expected_uid = getattr(os, "geteuid", lambda: stat.st_uid)()
    if not LOCK_DIR.is_dir() or stat.st_uid != expected_uid:
        raise RuntimeError("合成用户锁目录 owner 无效")
    os.chmod(LOCK_DIR, 0o700)
    if LEASE_LOCK_PATH.is_symlink() or API_WINDOW_LOCK_PATH.is_symlink():
        raise RuntimeError("合成用户锁文件不能是符号链接")


@contextmanager
def _lease_guard(*, create_ops_dir: bool = False):
    if OPS_DIR.is_symlink():
        raise RuntimeError("合成用户运维目录不能是符号链接")
    if create_ops_dir:
        OPS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    elif not OPS_DIR.is_dir():
        raise RuntimeError("合成用户运维目录不存在")
    os.chmod(OPS_DIR, 0o700)
    _ensure_lock_dir()
    lock = ProcessFileLock(LEASE_LOCK_PATH)
    deadline = time.monotonic() + 30
    while True:
        try:
            lock.acquire()
            break
        except RuntimeError:
            if time.monotonic() >= deadline:
                raise RuntimeError("合成用户准备租约锁等待超时")
            time.sleep(0.1)
    try:
        yield
    finally:
        lock.release()


@contextmanager
def _api_window_guard():
    _ensure_lock_dir()
    lock = ProcessFileLock(API_WINDOW_LOCK_PATH)
    deadline = time.monotonic() + 360
    while True:
        try:
            lock.acquire()
            break
        except RuntimeError:
            if time.monotonic() >= deadline:
                raise RuntimeError("合成用户 API 窗口锁等待超时")
            time.sleep(0.1)
    try:
        yield
    finally:
        lock.release()


def _lease_unlocked() -> dict[str, Any]:
    if not LEASE_PATH.is_file() or LEASE_PATH.is_symlink():
        raise RuntimeError("合成用户准备租约不存在")
    payload = json.loads(LEASE_PATH.read_text(encoding="utf-8"))
    expires_at_epoch = payload.get("expires_at_epoch")
    watchdog_after_epoch = payload.get("watchdog_after_epoch")
    if (
        payload.get("schema_version") != "d050-synthetic-lease-v1"
        or payload.get("persist_id") != TARGET_PERSIST_ID
        or not re.fullmatch(
            r"sha256:[0-9a-f]{64}", str(payload.get("token_hash") or "")
        )
        or not re.fullmatch(
            r"[0-9]+-[0-9]+-[0-9a-f]{40}", str(payload.get("owner") or "")
        )
        or payload.get("status")
        not in {
            "arming", "active", "sealing", "sealed", "confirming", "committing",
            "fenced", "cleaning",
        }
        or isinstance(expires_at_epoch, bool)
        or not isinstance(expires_at_epoch, (int, float))
        or expires_at_epoch <= 0
        or isinstance(watchdog_after_epoch, bool)
        or not isinstance(watchdog_after_epoch, (int, float))
        or watchdog_after_epoch <= 0
    ):
        raise RuntimeError("合成用户准备租约无效")
    return payload


def _lease_expired(lease: dict[str, Any]) -> bool:
    return time.time() >= float(lease["expires_at_epoch"])


def _touch_watchdog() -> None:
    expected_status = "active" if _CURRENT_MODE == "prepare" else "confirming"
    with _lease_guard():
        lease = _lease_unlocked()
        if (
            lease.get("owner") != _CURRENT_OPERATION_ID
            or lease.get("token_hash") != _CURRENT_TOKEN_HASH
            or lease.get("status") != expected_status
        ):
            raise RuntimeError("合成用户操作租约已失效")
        lease["watchdog_after_epoch"] = time.time() + WATCHDOG_GRACE_SECONDS
        lease["updated_at"] = p6_config.clock.to_iso()
        _write_lease_unlocked(lease)


def _transition_lease(
    operation_id: str,
    digest: str,
    *,
    expected_status: str,
    status: str,
    watchdog_delay_seconds: float = WATCHDOG_GRACE_SECONDS,
) -> dict[str, Any]:
    with _lease_guard():
        lease = _lease_unlocked()
        if (
            lease.get("token_hash") != digest
            or lease.get("status") != expected_status
            or lease.get("owner") != operation_id
        ):
            raise RuntimeError("合成用户准备租约状态已变化")
        lease.update({
            "owner": operation_id,
            "status": status,
            "watchdog_after_epoch": time.time() + watchdog_delay_seconds,
            "updated_at": p6_config.clock.to_iso(),
        })
        _write_lease_unlocked(lease)
        return lease


def _new_lease(operation_id: str, digest: str) -> None:
    with _lease_guard(create_ops_dir=True):
        if LEASE_PATH.exists() or LEASE_PATH.is_symlink():
            raise RuntimeError("合成用户准备租约已存在")
        _write_lease_unlocked({
            "schema_version": "d050-synthetic-lease-v1",
            "persist_id": TARGET_PERSIST_ID,
            "token_hash": digest,
            "owner": operation_id,
            "status": "arming",
            "expires_at_epoch": time.time() + LEASE_TTL_SECONDS,
            "watchdog_after_epoch": time.time() + WATCHDOG_GRACE_SECONDS,
            "updated_at": p6_config.clock.to_iso(),
        })


def _claim_lease(operation_id: str, digest: str) -> None:
    with _lease_guard():
        lease = _lease_unlocked()
        if _lease_expired(lease):
            raise RuntimeError("合成用户准备租约已经过期")
        if lease.get("token_hash") != digest or lease.get("status") != "sealed":
            raise RuntimeError("合成用户准备租约状态已变化")
        lease.update({
            "owner": operation_id,
            "status": "arming",
            "watchdog_after_epoch": time.time() + WATCHDOG_GRACE_SECONDS,
            "updated_at": p6_config.clock.to_iso(),
        })
        _write_lease_unlocked(lease)


def _claim_cleanup(operation_id: str, digest: str) -> tuple[dict[str, Any], str] | None:
    with _lease_guard():
        lease = _lease_unlocked()
        if lease.get("token_hash") != digest:
            raise RuntimeError("合成用户清理租约 token 摘要不一致")
        previous_owner = str(lease.get("owner") or "")
        if (
            previous_owner != operation_id
            and lease.get("status") not in {"fenced", "cleaning"}
            and not _lease_expired(lease)
        ):
            return None
        lease.update({
            "owner": operation_id,
            "status": "cleaning",
            "watchdog_after_epoch": time.time(),
            "updated_at": p6_config.clock.to_iso(),
        })
        _write_lease_unlocked(lease)
        return lease, previous_owner


def _finish_lease(operation_id: str, digest: str, expected_status: str) -> None:
    with _lease_guard():
        lease = _lease_unlocked()
        if (
            lease.get("owner") != operation_id
            or lease.get("token_hash") != digest
            or lease.get("status") != expected_status
        ):
            raise RuntimeError("合成用户租约最终状态已变化")
        STATE_PATH.unlink(missing_ok=True)
        LEASE_PATH.unlink(missing_ok=True)


def _seal_lease(operation_id: str, token: str, digest: str) -> None:
    with _api_window_guard():
        _transition_lease(
            operation_id,
            digest,
            expected_status="active",
            status="sealing",
        )
        _revoke_target(token, reason="d050_synthetic_setup_sealed")
        _restart_gateway()
        _transition_lease(
            operation_id,
            digest,
            expected_status="sealing",
            status="sealed",
        )
    _remove_watchdog(operation_id)


def prepare(operation_id: str) -> None:
    global _CURRENT_MODE, _CURRENT_OPERATION_ID, _CURRENT_TOKEN_HASH
    values = _values()
    _require_stuck_host(values)
    _restart_world(values)
    token = _target_token(values)
    digest = token_hash(token)
    _CURRENT_MODE = "prepare"
    _CURRENT_OPERATION_ID = operation_id
    _CURRENT_TOKEN_HASH = digest
    user_dir = Path(DATA_DIR) / "users" / TARGET_PERSIST_ID
    if (
        user_dir.exists()
        or user_dir.is_symlink()
        or STATE_PATH.exists()
        or LEASE_PATH.exists()
    ):
        raise RuntimeError("合成用户准备现场并非干净状态")
    _new_lease(operation_id, digest)
    _transition_lease(
        operation_id,
        digest,
        expected_status="arming",
        status="active",
    )
    _install_watchdog(operation_id)

    me = _api(token, "GET", "/api/me")
    if me.get("persist_id") != TARGET_PERSIST_ID:
        raise RuntimeError("合成邀请身份绑定错误")
    if not (me.get("consent") or {}).get("accepted"):
        _api(
            token,
            "POST",
            "/api/consent",
            {
                "notice_version": CONSENT_NOTICE_VERSION,
                "notice_hash": CONSENT_NOTICE_HASH,
                "accepted": True,
            },
        )

    catalog = _api(token, "GET", "/api/onboarding")
    if (catalog.get("onboarding") or {}).get("completed"):
        raise RuntimeError("合成用户已经完成角色创建")
    draft = _draft(catalog)
    question_payload = _api(
        token, "POST", "/api/onboarding/questions", draft
    )
    questions = question_payload.get("questions") or []
    if not 3 <= len(questions) <= 5:
        raise RuntimeError("补充问题数量不符合出生契约")
    draft["supplemental_answers"] = {
        str(item["id"]): _synthetic_supplemental_answer(str(item["id"]))
        for item in questions
        if isinstance(item, dict) and item.get("id")
    }
    if len(draft["supplemental_answers"]) != len(questions):
        raise RuntimeError("补充问题标识无效")

    preview_payload = _api(
        token, "POST", "/api/onboarding/preview", draft
    )
    preview = preview_payload.get("preview") or {}
    preview_fingerprint = str(preview.get("build_fingerprint") or "")
    if not preview_fingerprint.startswith("sha256:"):
        raise RuntimeError("角色预览缺少构建指纹")
    audit = (preview.get("validation") or {}).get("audit") or {}
    if any(
        isinstance(item, dict) and item.get("severity") == "blocking"
        for item in audit.get("issues") or []
    ):
        raise RuntimeError("角色预览仍有阻断冲突")

    consent = _api(
        token,
        "POST",
        "/api/onboarding/ai-consent",
        {"accepted": True},
    )
    if not (consent.get("consent") or {}).get("accepted"):
        raise RuntimeError("真实试镜外部 AI 同意未生效")

    audition_key = "d050-prepare-" + uuid.uuid4().hex
    audition_payload = _api(
        token,
        "POST",
        "/api/onboarding/auditions",
        {
            "draft": draft,
            "expected_revision": 0,
            "idempotency_key": audition_key,
        },
        expected_statuses=(200, 202),
    )
    audition = audition_payload.get("audition") or {}
    audition_id = str(audition.get("audition_id") or "")
    if not audition_id:
        raise RuntimeError("真实试镜未返回任务标识")
    deadline = time.monotonic() + AUDITION_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        audition = (
            _api(
                token,
                "GET",
                f"/api/onboarding/auditions/{audition_id}",
            ).get("audition")
            or {}
        )
        status = str(audition.get("status") or "")
        if status == "main_ready":
            break
        if status in {"failed", "changes_required", "confirmed"}:
            failure = {
                "status": status,
                "error_code": str(audition.get("error_code") or "")[:80],
                "error": str(audition.get("error") or "")[:240],
                "retryable": audition.get("retryable") is True,
                "completed_count": int(audition.get("completed_count") or 0),
            }
            raise RuntimeError(
                "出生试镜提前结束："
                + json.dumps(failure, ensure_ascii=False, sort_keys=True)
            )
        time.sleep(5)
    else:
        raise RuntimeError("出生试镜等待超时")

    main_results = audition.get("main_results") or []
    holdout_results = audition.get("holdout_results") or []
    if len(main_results) != 10 or len(holdout_results) != 5:
        raise RuntimeError("出生试镜结果数量不完整")
    _write_state({
        "schema_version": "d050-synthetic-setup-v1",
        "persist_id": TARGET_PERSIST_ID,
        "draft": draft,
        "preview_fingerprint": preview_fingerprint,
        "audition_id": audition_id,
        "audition": audition,
        "growth_notice_version": PERSONA_GROWTH_NOTICE_VERSION,
        "growth_notice_hash": PERSONA_GROWTH_NOTICE_HASH,
    })
    _seal_lease(operation_id, token, digest)
    print(json.dumps({
        "mode": "prepare",
        "persist_id": TARGET_PERSIST_ID,
        "status": "sealed",
        "main_result_count": len(main_results),
        "holdout_result_count": len(holdout_results),
    }, ensure_ascii=False, sort_keys=True))


def confirm(operation_id: str) -> None:
    global _CURRENT_MODE, _CURRENT_OPERATION_ID, _CURRENT_TOKEN_HASH
    values = _values()
    _require_stuck_host(values)
    token = _target_token(values)
    digest = token_hash(token)
    _CURRENT_MODE = "confirm"
    _CURRENT_OPERATION_ID = operation_id
    _CURRENT_TOKEN_HASH = digest
    if not is_gateway_token_revoked(DATA_DIR, digest):
        raise RuntimeError("合成邀请在确认前未保持封存")
    state_bytes = STATE_PATH.read_bytes()
    if not re.fullmatch(r"[0-9a-f]{64}", APPROVED_AUDITION_SHA256):
        raise RuntimeError("出生试镜证据尚未经过人工复读批准")
    if hashlib.sha256(state_bytes).hexdigest() != APPROVED_AUDITION_SHA256:
        raise RuntimeError("出生试镜证据摘要与批准版本不一致")
    _claim_lease(operation_id, digest)
    _install_watchdog(operation_id)
    _transition_lease(
        operation_id,
        digest,
        expected_status="arming",
        status="confirming",
    )
    state = json.loads(state_bytes.decode("utf-8"))
    if (
        state.get("schema_version") != "d050-synthetic-setup-v1"
        or state.get("persist_id") != TARGET_PERSIST_ID
    ):
        raise RuntimeError("合成用户准备状态无效")
    audition_id = str(state.get("audition_id") or "")
    audition = (
        _api(
            token,
            "GET",
            f"/api/onboarding/auditions/{audition_id}",
        ).get("audition")
        or {}
    )
    if audition.get("status") != "main_ready":
        raise RuntimeError("出生试镜不在可确认状态")
    holdout_results = audition.get("holdout_results") or []
    if len(holdout_results) != 5:
        raise RuntimeError("出生留出结果数量不完整")
    holdout_reviews = {
        str(item["scenario_id"]): {
            "accepted": True,
            "severe_violation": False,
        }
        for item in holdout_results
        if isinstance(item, dict) and item.get("scenario_id")
    }
    if len(holdout_reviews) != 5:
        raise RuntimeError("出生留出场景标识无效")
    confirm_payload = _api(
        token,
        "POST",
        f"/api/onboarding/auditions/{audition_id}/confirm",
        {
            "draft": state["draft"],
            "expected_revision": 0,
            "accept_uncontested": True,
            "reviews": {},
            "holdout_reviews": holdout_reviews,
            "idempotency_key": "d050-confirm-" + uuid.uuid4().hex,
        },
    )
    confirmed = confirm_payload.get("audition") or {}
    if confirmed.get("status") != "confirmed":
        raise RuntimeError("出生试镜未确认通过")
    severe_receipt = confirmed.get("severe_violation_receipt") or {}
    if int(severe_receipt.get("severe_violation_count") or 0) != 0:
        raise RuntimeError("出生试镜存在严重违例")

    complete_payload = _api(
        token,
        "POST",
        "/api/onboarding/complete",
        {
            "draft": state["draft"],
            "idempotency_key": "d050-complete-" + uuid.uuid4().hex,
            "preview_fingerprint": state["preview_fingerprint"],
            "growth_notice_version": state["growth_notice_version"],
            "growth_notice_hash": state["growth_notice_hash"],
            "growth_accepted": True,
            "confirm_explicit_unknowns": False,
        },
    )
    me = complete_payload.get("me") or {}
    if (
        me.get("persist_id") != TARGET_PERSIST_ID
        or not (me.get("onboarding") or {}).get("completed")
        or not str(me.get("persona_id") or "").startswith("custom_")
    ):
        raise RuntimeError("合成用户角色创建结果未确认")
    growth = _api(token, "GET", "/api/persona/growth").get("growth") or {}
    if not (growth.get("consent") or {}).get("accepted"):
        raise RuntimeError("合成用户自主成长同意未确认")
    paths = user_storage_paths(DATA_DIR, TARGET_PERSIST_ID)
    meta = load_user_meta(paths)
    if meta.get("persona") != me.get("persona_id"):
        raise RuntimeError("合成用户私有 Persona 绑定不一致")
    with _api_window_guard():
        _transition_lease(
            operation_id,
            digest,
            expected_status="confirming",
            status="committing",
            watchdog_delay_seconds=0,
        )
        _unrevoke_target(token)
        _restart_gateway()
        _finish_lease(operation_id, digest, "committing")
    _remove_watchdog(operation_id)
    _remove_ops_dir_if_empty()
    _assert_recovery_artifacts_removed()
    print(json.dumps({
        "mode": "confirm",
        "persist_id": TARGET_PERSIST_ID,
        "audition_status": confirmed.get("status"),
        "severe_violation_count": 0,
        "onboarding_completed": True,
        "private_binding": True,
        "growth_accepted": True,
    }, ensure_ascii=False, sort_keys=True))


def cleanup(operation_id: str) -> None:
    with _api_window_guard():
        if LEASE_PATH.is_symlink():
            raise RuntimeError("合成用户准备租约不能是符号链接")
        if not LEASE_PATH.is_file():
            _remove_watchdog(operation_id)
            _remove_ops_dir_if_empty()
            print(json.dumps({
                "mode": "cleanup",
                "persist_id": TARGET_PERSIST_ID,
                "cleanup_skipped": True,
                "reason": "lease_missing",
            }, ensure_ascii=False, sort_keys=True))
            return
        values = _values()
        token = _target_token(values)
        digest = token_hash(token)
        claimed = _claim_cleanup(operation_id, digest)
        if claimed is None:
            print(json.dumps({
                "mode": "cleanup",
                "persist_id": TARGET_PERSIST_ID,
                "cleanup_skipped": True,
                "reason": "lease_owner_mismatch",
            }, ensure_ascii=False, sort_keys=True))
            return
        _lease_payload, previous_owner = claimed
        _revoke_target(token, reason="d050_synthetic_setup_cleanup")
        _restart_gateway()
        _host_purge(values, TARGET_PERSIST_ID)
        _restart_world(values)
        _finish_lease(operation_id, digest, "cleaning")
    _remove_watchdog(previous_owner)
    _remove_watchdog(operation_id)
    _remove_ops_dir_if_empty()
    _assert_recovery_artifacts_removed()
    user_dir = Path(DATA_DIR) / "users" / TARGET_PERSIST_ID
    if user_dir.exists() or user_dir.is_symlink():
        raise RuntimeError("合成用户失败清理未完成")
    print(json.dumps({
        "mode": "cleanup",
        "persist_id": TARGET_PERSIST_ID,
        "token_revoked": True,
        "directory_absent": True,
    }, ensure_ascii=False, sort_keys=True))


def main() -> int:
    global _OPERATION_DEADLINE
    if (
        len(sys.argv) != 3
        or sys.argv[1] not in {"prepare", "confirm", "cleanup"}
        or not re.fullmatch(r"[0-9]+-[0-9]+-[0-9a-f]{40}", sys.argv[2])
    ):
        raise SystemExit(
            "用法：d050_prepare_synthetic.py prepare|confirm|cleanup <operation_id>"
        )
    mode = sys.argv[1]
    operation_id = sys.argv[2]
    handled_signals: list[signal.Signals] = []

    def interrupt(signum: int, _frame: Any) -> None:
        raise InterruptedError(f"合成用户操作收到终止信号 {signum}")

    for signal_name in ("SIGHUP", "SIGTERM"):
        candidate = getattr(signal, signal_name, None)
        if candidate is not None:
            signal.signal(
                candidate,
                signal.SIG_IGN if mode == "cleanup" else interrupt,
            )
            handled_signals.append(candidate)

    if mode != "cleanup":
        _OPERATION_DEADLINE = time.monotonic() + OPERATION_TIMEOUT_SECONDS
    with _release_guard():
        _require_release_idle()
        try:
            {"prepare": prepare, "confirm": confirm, "cleanup": cleanup}[
                mode
            ](operation_id)
        except BaseException:
            if mode != "cleanup":
                for candidate in handled_signals:
                    signal.signal(candidate, signal.SIG_IGN)
                try:
                    cleanup(operation_id)
                except BaseException as cleanup_exc:
                    raise RuntimeError(
                        "合成用户主操作失败且自动清理未完成"
                    ) from cleanup_exc
            raise
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
