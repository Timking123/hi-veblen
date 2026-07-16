#!/usr/bin/env python3
"""验证当前发布与 N-1 回滚版本的健康响应契约。"""

from __future__ import annotations

import copy
import json
import sys
from typing import Any


LEGACY_ROLLBACK_CONTRACTS = {
    "014bdc14326cebcc230fea2d8aca7258153c2a08": "v1",
}


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _base_health(data: dict[str, Any], expected: str) -> dict[str, Any]:
    host = data.get("host") or {}
    _require(data.get("production_auth_safe") is True, "生产鉴权安全门未通过")
    _require(data.get("backend_revision") == expected, "后端 revision 不匹配")
    _require(host.get("ok") is True, "宿主健康检查未通过")
    _require(host.get("backend_revision") == expected, "宿主 revision 不匹配")
    return host


def _strict_health(host: dict[str, Any]) -> None:
    heartbeat = host.get("heartbeat") or {}
    _require(host.get("ready") is True, "宿主尚未 ready")
    _require(host.get("continuity_ok") is True, "连续性探针未通过")
    _require(heartbeat.get("running") is True, "心跳未运行")
    _require(heartbeat.get("first_fire_completed") is True, "心跳首拍未完成")
    _require(heartbeat.get("first_fire_ok") is True, "心跳首拍失败")
    _require(heartbeat.get("in_flight_timed_out") is False, "心跳仍有超时任务")
    _require(heartbeat.get("consecutive_failures") == 0, "心跳存在连续失败")


def validate_payload(data: dict[str, Any], mode: str, expected: str) -> str:
    _require(mode in {"current", "rollback"}, f"未知健康检查模式：{mode}")
    _require(
        len(expected) == 40 and all(char in "0123456789abcdef" for char in expected),
        "expected revision 必须是完整小写 SHA",
    )
    host = _base_health(data, expected)
    contract = "v2" if mode == "current" else LEGACY_ROLLBACK_CONTRACTS.get(expected, "v2")
    if mode == "current":
        _require(
            (data.get("persona_import") or {}).get("ready") is True,
            "角色设定导入能力尚未 ready",
        )
    if contract == "v2":
        _strict_health(host)
    return contract


def _expect_rejected(data: dict[str, Any], mode: str, expected: str) -> None:
    try:
        validate_payload(data, mode, expected)
    except ValueError:
        return
    raise AssertionError("危险健康响应未被拒绝")


def _self_test() -> None:
    legacy_revision = "014bdc14326cebcc230fea2d8aca7258153c2a08"
    legacy = {
        "ok": True,
        "backend_revision": legacy_revision,
        "production_auth_safe": True,
        "host": {"ok": True, "backend_revision": legacy_revision},
    }
    _require(validate_payload(legacy, "rollback", legacy_revision) == "v1", "v1 回滚未通过")
    _expect_rejected(legacy, "current", legacy_revision)

    strict_revision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    strict = {
        "ok": True,
        "backend_revision": strict_revision,
        "production_auth_safe": True,
        "persona_import": {"ready": True},
        "host": {
            "ok": True,
            "backend_revision": strict_revision,
            "ready": True,
            "continuity_ok": True,
            "heartbeat": {
                "running": True,
                "first_fire_completed": True,
                "first_fire_ok": True,
                "in_flight_timed_out": False,
                "consecutive_failures": 0,
            },
        },
    }
    _require(validate_payload(strict, "current", strict_revision) == "v2", "v2 当前发布未通过")
    _require(validate_payload(strict, "rollback", strict_revision) == "v2", "v2 回滚未通过")

    missing_persona_import = copy.deepcopy(strict)
    del missing_persona_import["persona_import"]
    _expect_rejected(missing_persona_import, "current", strict_revision)

    disabled_persona_import = copy.deepcopy(strict)
    disabled_persona_import["persona_import"]["ready"] = False
    _expect_rejected(disabled_persona_import, "current", strict_revision)

    unknown_legacy = copy.deepcopy(legacy)
    unknown_legacy["backend_revision"] = strict_revision
    unknown_legacy["host"]["backend_revision"] = strict_revision
    _expect_rejected(unknown_legacy, "rollback", strict_revision)

    unsafe = copy.deepcopy(legacy)
    unsafe["production_auth_safe"] = False
    _expect_rejected(unsafe, "rollback", legacy_revision)

    mismatched = copy.deepcopy(legacy)
    mismatched["host"]["backend_revision"] = strict_revision
    _expect_rejected(mismatched, "rollback", legacy_revision)

    failed_heartbeat = copy.deepcopy(strict)
    failed_heartbeat["host"]["heartbeat"]["first_fire_ok"] = False
    _expect_rejected(failed_heartbeat, "current", strict_revision)
    _expect_rejected(failed_heartbeat, "rollback", strict_revision)
    print("release health contract self-test OK")


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        _self_test()
        return 0
    if len(argv) != 2:
        raise SystemExit("用法：validate_release_health.py <current|rollback> <expected_revision>")
    mode, expected = argv
    payload = json.load(sys.stdin)
    _require(isinstance(payload, dict), "健康响应必须是 JSON 对象")
    contract = validate_payload(payload, mode, expected)
    print(f"release health contract OK: {mode}-{contract}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
