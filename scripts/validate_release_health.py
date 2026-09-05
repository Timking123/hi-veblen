#!/usr/bin/env python3
"""验证当前发布与 N-1 回滚版本的健康响应契约。"""

from __future__ import annotations

import copy
import json
import re
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


def validate_payload(
    data: dict[str, Any],
    mode: str,
    expected: str,
    expected_schema_phase: str | None = None,
    expected_growth_phase: str | None = None,
) -> str:
    _require(mode in {"current", "rollback"}, f"未知健康检查模式：{mode}")
    _require(
        len(expected) == 40 and all(char in "0123456789abcdef" for char in expected),
        "expected revision 必须是完整小写 SHA",
    )
    host = _base_health(data, expected)
    contract = "v2" if mode == "current" else LEGACY_ROLLBACK_CONTRACTS.get(expected, "v2")
    if mode == "current":
        _require(
            expected_schema_phase in {"compat", "active"},
            "current 必须指定预期 schema phase",
        )
        _require(
            expected_growth_phase in {"compat", "shadow", "canary", "active"},
            "current 必须指定预期 growth phase",
        )
        _require(
            data.get("persona_schema_capability") == "dual-read-v1",
            "Persona schema capability 不匹配",
        )
        _require(
            data.get("persona_schema_phase") == expected_schema_phase,
            "Persona schema phase 不匹配",
        )
        persona_growth = data.get("persona_growth") or {}
        _require(
            persona_growth.get("capability") == "autonomous-growth-v1",
            "Persona growth capability 不匹配",
        )
        _require(
            persona_growth.get("phase") == expected_growth_phase,
            "Persona growth phase 不匹配",
        )
        _require(persona_growth.get("ready") is True, "Persona growth 尚未 ready")
        _require(host.get("audition_isolation_ok") is True, "角色试镜隔离健康门未通过")
        _require(
            (data.get("persona_import") or {}).get("ready") is True,
            "角色设定导入能力尚未 ready",
        )
    else:
        _require(
            expected_schema_phase is None and expected_growth_phase is None,
            "rollback 不接受 phase 参数",
        )
    if contract == "v2":
        _strict_health(host)
    return contract


def _transaction_object(value: Any, name: str) -> dict[str, Any]:
    _require(isinstance(value, dict), f"{name} 必须是 JSON 对象")
    return value


def validate_transaction_payload(
    data: dict[str, Any],
    expected: str,
    phases: dict[str, str],
    canary_hashes: list[str],
) -> str:
    """验证事务的单个初步健康样本，返回 epoch；持续观察由事务调用方完成。"""
    _require(
        isinstance(expected, str) and re.fullmatch(r"[0-9a-f]{40}", expected) is not None,
        "expected revision 必须是完整小写 SHA",
    )
    phases = _transaction_object(phases, "事务 phases")
    allowed_phases = {
        "persona_schema": {"compat", "active"},
        "persona_growth": {"compat", "shadow", "canary", "active"},
        "world_ledger": {"compat", "active"},
    }
    _require(set(phases) == set(allowed_phases), "事务 phases 必须包含精确的三个 phase 键")
    for name, allowed in allowed_phases.items():
        _require(
            isinstance(phases[name], str) and phases[name] in allowed,
            f"事务 {name} phase 无效",
        )
    _require(
        phases["persona_schema"] != "compat"
        or phases["persona_growth"] in {"compat", "shadow"},
        "compat schema 仅允许 compat 或 shadow growth",
    )
    _require(isinstance(canary_hashes, list), "事务 canary_hashes 必须是 JSON 数组")
    _require(len(canary_hashes) <= 512, "事务 canary_hashes 超过 512 项")
    _require(
        all(
            isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None
            for value in canary_hashes
        ),
        "事务 canary_hashes 必须是 64 位小写十六进制哈希",
    )
    _require(
        canary_hashes == sorted(set(canary_hashes)),
        "事务 canary_hashes 必须升序且唯一",
    )
    _require(
        phases["persona_growth"] == "canary" or not canary_hashes,
        "非 canary phase 的 canary_hashes 必须为空",
    )

    # 事务不走旧版回滚豁免；每个发布版本都必须提供完整健康证据。
    data = _transaction_object(data, "健康响应")
    host = _transaction_object(data.get("host"), "宿主健康响应")
    heartbeat = _transaction_object(host.get("heartbeat"), "心跳健康响应")
    persona_import = _transaction_object(data.get("persona_import"), "角色导入健康响应")
    persona_growth = _transaction_object(data.get("persona_growth"), "角色成长健康响应")
    _require(data.get("ok") is True, "整体健康检查未通过")
    _base_health(data, expected)
    for name in ("ready", "continuity_ok", "audition_isolation_ok"):
        _require(host.get(name) is True, f"宿主 {name} 健康门未通过")
    _require(
        data.get("persona_schema_capability") == "dual-read-v1",
        "Persona schema capability 不匹配",
    )
    _require(
        data.get("persona_schema_phase") == phases["persona_schema"],
        "Persona schema phase 不匹配",
    )
    _require(
        data.get("world_ledger_schema_capability") == "dual-read-v2-preserve",
        "World ledger schema capability 不匹配",
    )
    _require(
        data.get("world_ledger_schema_phase") == phases["world_ledger"],
        "World ledger schema phase 不匹配",
    )
    _require(persona_import.get("ready") is True, "角色设定导入能力尚未 ready")
    _require(
        persona_growth.get("capability") == "autonomous-growth-v1",
        "Persona growth capability 不匹配",
    )
    _require(
        persona_growth.get("phase") == phases["persona_growth"],
        "Persona growth phase 不匹配",
    )
    _require(persona_growth.get("runtime_ready") is True, "Persona growth 运行环境尚未 ready")
    _require(persona_growth.get("ready") is True, "Persona growth 尚未 ready")
    # 公开健康响应不要求回显 canary 名单；实际 unit 环境由事务调用方核验。
    for name in ("running", "first_fire_completed", "first_fire_ok"):
        _require(heartbeat.get(name) is True, f"心跳 {name} 健康门未通过")
    _require(heartbeat.get("in_flight_timed_out") is False, "心跳仍有超时任务")
    failures = heartbeat.get("consecutive_failures")
    _require(type(failures) is int and failures == 0, "心跳连续失败计数必须是整数 0")
    completed_fires = heartbeat.get("completed_fires")
    _require(
        type(completed_fires) is int and completed_fires >= 0,
        "心跳完成计数必须是非负整数",
    )
    run_epoch = heartbeat.get("run_epoch")
    _require(
        isinstance(run_epoch, str) and re.fullmatch(r"hb_[0-9a-f]{32}", run_epoch) is not None,
        "心跳 run_epoch 格式无效",
    )
    return run_epoch


def _expect_rejected(
    data: dict[str, Any],
    mode: str,
    expected: str,
    expected_schema_phase: str | None = None,
    expected_growth_phase: str | None = None,
) -> None:
    try:
        validate_payload(
            data,
            mode,
            expected,
            expected_schema_phase,
            expected_growth_phase,
        )
    except ValueError:
        return
    raise AssertionError("危险健康响应未被拒绝")


def _transaction_self_test(
    strict: dict[str, Any], revision: str, legacy: dict[str, Any]
) -> None:
    phases = {
        "persona_schema": "compat",
        "persona_growth": "compat",
        "world_ledger": "compat",
    }
    payload = copy.deepcopy(strict)
    payload["world_ledger_schema_capability"] = "dual-read-v2-preserve"
    payload["world_ledger_schema_phase"] = "compat"
    payload["persona_growth"]["runtime_ready"] = True
    epoch = "hb_" + "a" * 32
    payload["host"]["heartbeat"].update(run_epoch=epoch, completed_fires=0)

    def rejected(
        data: Any, candidate_phases: Any, hashes: Any, expected: Any = revision
    ) -> None:
        try:
            validate_transaction_payload(data, expected, candidate_phases, hashes)
        except ValueError:
            return
        raise AssertionError("危险事务健康响应未被拒绝")

    # 覆盖全部合法组合；canary 不依赖公开健康响应回显名单。
    for schema in ("compat", "active"):
        for growth in ("compat", "shadow", "canary", "active"):
            for world in ("compat", "active"):
                candidate_phases = {
                    "persona_schema": schema,
                    "persona_growth": growth,
                    "world_ledger": world,
                }
                candidate = copy.deepcopy(payload)
                candidate["persona_schema_phase"] = schema
                candidate["persona_growth"]["phase"] = growth
                candidate["world_ledger_schema_phase"] = world
                hashes = ["a" * 64] if growth == "canary" else []
                if schema == "compat" and growth in {"canary", "active"}:
                    rejected(candidate, candidate_phases, hashes)
                else:
                    _require(
                        validate_transaction_payload(
                            candidate, revision, candidate_phases, hashes
                        ) == epoch,
                        "合法事务健康组合未通过或 epoch 返回错误",
                    )

    # 每项必要证据缺失都必须拒绝，包括 World ledger 的能力与 phase。
    required_paths = [
        ("ok",),
        ("production_auth_safe",),
        ("backend_revision",),
        ("persona_schema_capability",),
        ("persona_schema_phase",),
        ("world_ledger_schema_capability",),
        ("world_ledger_schema_phase",),
        ("persona_import",),
        ("persona_import", "ready"),
        ("persona_growth",),
        ("persona_growth", "capability"),
        ("persona_growth", "phase"),
        ("persona_growth", "runtime_ready"),
        ("persona_growth", "ready"),
        ("host",),
        ("host", "ok"),
        ("host", "backend_revision"),
        ("host", "ready"),
        ("host", "continuity_ok"),
        ("host", "audition_isolation_ok"),
        ("host", "heartbeat"),
        ("host", "heartbeat", "running"),
        ("host", "heartbeat", "first_fire_completed"),
        ("host", "heartbeat", "first_fire_ok"),
        ("host", "heartbeat", "in_flight_timed_out"),
        ("host", "heartbeat", "consecutive_failures"),
        ("host", "heartbeat", "completed_fires"),
        ("host", "heartbeat", "run_epoch"),
    ]
    for path in required_paths:
        missing = copy.deepcopy(payload)
        parent = missing
        for key in path[:-1]:
            parent = parent[key]
        del parent[path[-1]]
        rejected(missing, phases, [])

        # 布尔健康门不能由 0/1 代替，字符串字段也不能接受数字。
        original = payload
        for key in path:
            original = original[key]
        if isinstance(original, dict):
            invalid_values = (None, [], "invalid", True, 0)
        elif original is True:
            invalid_values = (False, 1)
        elif original is False:
            invalid_values = (True, 0)
        elif isinstance(original, str):
            invalid_values = (None, True, 0, "invalid")
        else:
            invalid_values = (None, True, False, 0.0, "0", -1)
        for value in invalid_values:
            invalid = copy.deepcopy(payload)
            parent = invalid
            for key in path[:-1]:
                parent = parent[key]
            parent[path[-1]] = value
            rejected(invalid, phases, [])

    for data in (None, [], "invalid", True, 0):
        rejected(data, phases, [])
    rejected(legacy, phases, [], legacy["backend_revision"])
    for expected in (None, [], True, 0, "a" * 39, "A" * 40, "a" * 40 + "\n"):
        rejected(payload, phases, [], expected)
    for candidate_phases in (None, [], True, {}, {**phases, "extra": "compat"}):
        rejected(payload, candidate_phases, [])
    for name in phases:
        missing_phase = dict(phases)
        del missing_phase[name]
        rejected(payload, missing_phase, [])
        for value in (None, [], True, 0, "invalid"):
            rejected(payload, {**phases, name: value}, [])
    for field in ("persona_schema_phase", "world_ledger_schema_phase"):
        mismatched = copy.deepcopy(payload)
        mismatched[field] = "active"
        rejected(mismatched, phases, [])
    mismatched = copy.deepcopy(payload)
    mismatched["persona_growth"]["phase"] = "shadow"
    rejected(mismatched, phases, [])

    invalid_heartbeat_values = {
        "run_epoch": (
            "hb_" + "a" * 31, "hb_" + "A" * 32, "hb_" + "a" * 32 + "\n", "a" * 32,
        ),
        "consecutive_failures": (1, 10),
        "completed_fires": (1.5,),
    }
    for name, values in invalid_heartbeat_values.items():
        for value in values:
            invalid = copy.deepcopy(payload)
            invalid["host"]["heartbeat"][name] = value
            rejected(invalid, phases, [])
    completed = copy.deepcopy(payload)
    completed["host"]["heartbeat"]["completed_fires"] = 7
    _require(
        validate_transaction_payload(completed, revision, phases, []) == epoch,
        "心跳完成计数未通过",
    )

    canary_phases = {**phases, "persona_schema": "active", "persona_growth": "canary"}
    canary = copy.deepcopy(payload)
    canary["persona_schema_phase"] = "active"
    canary["persona_growth"]["phase"] = "canary"
    for hashes in ([], [f"{number:064x}" for number in range(512)]):
        _require(
            validate_transaction_payload(canary, revision, canary_phases, hashes) == epoch,
            "合法 canary 数组边界未通过",
        )
    invalid_canaries = (
        None, {}, (), True, "a" * 64, [None], [True], [0], [[]],
        ["a" * 63], ["a" * 65], ["A" * 64], ["g" * 64], ["a" * 64 + "\n"],
        ["b" * 64, "a" * 64], ["a" * 64, "a" * 64],
        [f"{number:064x}" for number in range(513)],
    )
    for hashes in invalid_canaries:
        rejected(canary, canary_phases, hashes)
    rejected(payload, phases, ["a" * 64])
    print("release transaction health contract self-test OK")


def _self_test() -> None:
    legacy_revision = "014bdc14326cebcc230fea2d8aca7258153c2a08"
    legacy = {
        "ok": True,
        "backend_revision": legacy_revision,
        "production_auth_safe": True,
        "host": {"ok": True, "backend_revision": legacy_revision},
    }
    _require(validate_payload(legacy, "rollback", legacy_revision) == "v1", "v1 回滚未通过")
    _expect_rejected(legacy, "current", legacy_revision, "compat", "compat")

    strict_revision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    strict = {
        "ok": True,
        "backend_revision": strict_revision,
        "production_auth_safe": True,
        "persona_schema_capability": "dual-read-v1",
        "persona_schema_phase": "compat",
        "persona_import": {"ready": True},
        "persona_growth": {
            "capability": "autonomous-growth-v1",
            "phase": "compat",
            "ready": True,
        },
        "host": {
            "ok": True,
            "backend_revision": strict_revision,
            "ready": True,
            "continuity_ok": True,
            "audition_isolation_ok": True,
            "heartbeat": {
                "running": True,
                "first_fire_completed": True,
                "first_fire_ok": True,
                "in_flight_timed_out": False,
                "consecutive_failures": 0,
            },
        },
    }
    _require(
        validate_payload(strict, "current", strict_revision, "compat", "compat") == "v2",
        "v2 当前发布未通过",
    )
    _require(validate_payload(strict, "rollback", strict_revision) == "v2", "v2 回滚未通过")
    _expect_rejected(strict, "rollback", strict_revision, "compat", "compat")

    active = copy.deepcopy(strict)
    active["persona_schema_phase"] = "active"
    active["persona_growth"]["phase"] = "active"
    _require(
        validate_payload(active, "current", strict_revision, "active", "active") == "v2",
        "active 当前发布未通过",
    )

    _expect_rejected(strict, "current", strict_revision)
    _expect_rejected(strict, "current", strict_revision, "compat")

    missing_capability = copy.deepcopy(strict)
    del missing_capability["persona_schema_capability"]
    _expect_rejected(missing_capability, "current", strict_revision, "compat", "compat")

    wrong_capability = copy.deepcopy(strict)
    wrong_capability["persona_schema_capability"] = "legacy"
    _expect_rejected(wrong_capability, "current", strict_revision, "compat", "compat")

    missing_phase = copy.deepcopy(strict)
    del missing_phase["persona_schema_phase"]
    _expect_rejected(missing_phase, "current", strict_revision, "compat", "compat")

    mismatched_phase = copy.deepcopy(strict)
    mismatched_phase["persona_schema_phase"] = "active"
    _expect_rejected(mismatched_phase, "current", strict_revision, "compat", "compat")

    _expect_rejected(strict, "current", strict_revision, "invalid", "compat")

    missing_growth_capability = copy.deepcopy(strict)
    del missing_growth_capability["persona_growth"]["capability"]
    _expect_rejected(
        missing_growth_capability,
        "current",
        strict_revision,
        "compat",
        "compat",
    )

    mismatched_growth_phase = copy.deepcopy(strict)
    mismatched_growth_phase["persona_growth"]["phase"] = "shadow"
    _expect_rejected(
        mismatched_growth_phase,
        "current",
        strict_revision,
        "compat",
        "compat",
    )

    disabled_growth = copy.deepcopy(strict)
    disabled_growth["persona_growth"]["ready"] = False
    _expect_rejected(disabled_growth, "current", strict_revision, "compat", "compat")

    _expect_rejected(strict, "current", strict_revision, "compat", "invalid")

    failed_audition_isolation = copy.deepcopy(strict)
    failed_audition_isolation["host"]["audition_isolation_ok"] = False
    _expect_rejected(
        failed_audition_isolation,
        "current",
        strict_revision,
        "compat",
        "compat",
    )

    missing_persona_import = copy.deepcopy(strict)
    del missing_persona_import["persona_import"]
    _expect_rejected(missing_persona_import, "current", strict_revision, "compat", "compat")

    disabled_persona_import = copy.deepcopy(strict)
    disabled_persona_import["persona_import"]["ready"] = False
    _expect_rejected(disabled_persona_import, "current", strict_revision, "compat", "compat")

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
    _expect_rejected(failed_heartbeat, "current", strict_revision, "compat", "compat")
    _expect_rejected(failed_heartbeat, "rollback", strict_revision)
    _transaction_self_test(strict, strict_revision, legacy)
    print("release health contract self-test OK")


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        _self_test()
        return 0
    if len(argv) not in {2, 4}:
        raise SystemExit(
            "用法：validate_release_health.py <current|rollback> <expected_revision> "
            "[expected_schema_phase expected_growth_phase]"
        )
    mode, expected = argv[:2]
    expected_schema_phase = argv[2] if len(argv) == 4 else None
    expected_growth_phase = argv[3] if len(argv) == 4 else None
    payload = json.load(sys.stdin)
    _require(isinstance(payload, dict), "健康响应必须是 JSON 对象")
    contract = validate_payload(
        payload,
        mode,
        expected,
        expected_schema_phase,
        expected_growth_phase,
    )
    print(f"release health contract OK: {mode}-{contract}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
