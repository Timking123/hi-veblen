#!/usr/bin/env python3
"""通过生产 HTTPS API 可重入地准备 D050 合成用户。"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import sys
import time
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any
from urllib import error, parse, request


TARGET_PERSIST_ID = "p6_load_a"
PRODUCTION_BASE_URL = "https://lingxi.hi-veblen.com"
SESSION_COOKIE_NAME = "__Host-lingxi_session"
EXPECTED_PERSIST_ID_HEADER = "X-Lingxi-Expected-Persist-Id"
REQUEST_TIMEOUT_SECONDS = 60
AUDITION_TIMEOUT_SECONDS = 30 * 60
POLL_INTERVAL_SECONDS = 5
MAX_RESPONSE_BYTES = 4 * 1024 * 1024

AUDITION_KEY = "d050-p6-load-a-audition-v1"
COMPLETE_KEY = "d050-p6-load-a-complete-v1"
REVIEW_REQUEST_PATH = Path("d050-holdout-review-request.json")
REVIEW_DECISION_PATH = Path("d050-holdout-review-decision.json")
REVIEW_CONFIRMATION_PATH = Path("d050-holdout-review-confirmation.json")

_SHA256_PATTERN = re.compile(r"sha256:[0-9a-f]{64}")
_AUDITION_ID_PATTERN = re.compile(r"audition_[0-9a-f]{24}")
_REVISION_PATTERN = re.compile(r"[0-9a-f]{40}")


class PreparationError(RuntimeError):
    """合成用户准备未满足生产契约。"""


class _NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        del req, fp, code, msg, headers, newurl
        return None


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise PreparationError(message)


def _object(value: Any, label: str) -> dict[str, Any]:
    _require(isinstance(value, dict), f"{label} 结构无效")
    return value


def _strict_nonnegative_int(value: Any, label: str) -> int:
    _require(
        isinstance(value, int) and not isinstance(value, bool) and value >= 0,
        f"{label} 不是非负整数",
    )
    return value


def _canonical_sha256(value: Any) -> str:
    raw = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def _text_sha256(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


def _decode_token(encoded: str) -> str:
    _require(bool(encoded), "缺少 D050_PRIMARY_TOKEN_B64")
    _require(len(encoded) <= 8192, "D050_PRIMARY_TOKEN_B64 长度无效")
    try:
        raw = base64.b64decode(encoded, validate=True)
        token = raw.decode("utf-8")
    except (UnicodeDecodeError, ValueError) as exc:
        raise PreparationError("D050_PRIMARY_TOKEN_B64 格式无效") from exc
    _require(0 < len(token) <= 4096 and token == token.strip(), "合成凭证格式无效")
    return token


def _production_base_url(value: str) -> str:
    normalized = value.strip().rstrip("/")
    parsed = parse.urlsplit(normalized)
    _require(
        normalized == PRODUCTION_BASE_URL
        and parsed.scheme == "https"
        and parsed.hostname == "lingxi.hi-veblen.com"
        and parsed.port is None
        and not parsed.path
        and not parsed.query
        and not parsed.fragment,
        "D050 只允许访问固定生产 HTTPS 来源",
    )
    return normalized


def _read_response(response: Any, label: str) -> bytes:
    raw = response.read(MAX_RESPONSE_BYTES + 1)
    _require(len(raw) <= MAX_RESPONSE_BYTES, f"{label} 响应超过安全上限")
    return raw


class ProductionApi:
    """只持有浏览器短会话，不保存邀请凭证。"""

    def __init__(self, base_url: str) -> None:
        self.base_url = _production_base_url(base_url)
        self.cookies = CookieJar()
        self.opener = request.build_opener(
            _NoRedirect(), request.HTTPCookieProcessor(self.cookies)
        )

    def login(self, token: str) -> dict[str, Any]:
        identity = self._call(
            "POST",
            "/api/session",
            {"token": token},
            expected_statuses=(200,),
            include_identity_header=False,
        )
        session_cookies = [
            cookie for cookie in self.cookies if cookie.name == SESSION_COOKIE_NAME
        ]
        _require(
            len(session_cookies) == 1
            and session_cookies[0].secure
            and session_cookies[0].path == "/"
            and not session_cookies[0].domain_specified
            and session_cookies[0].has_nonstandard_attr("HttpOnly")
            and str(
                session_cookies[0].get_nonstandard_attr("SameSite") or ""
            ).lower()
            == "strict",
            "生产浏览器短会话 Cookie 属性无效",
        )
        _require(
            identity.get("scope") == "user"
            and identity.get("persist_id") == TARGET_PERSIST_ID,
            "生产短会话未绑定批准的合成用户",
        )
        return identity

    def api(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        expected_statuses: tuple[int, ...] = (200,),
    ) -> dict[str, Any]:
        return self._call(
            method,
            path,
            payload,
            expected_statuses=expected_statuses,
            include_identity_header=True,
        )

    def _call(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None,
        *,
        expected_statuses: tuple[int, ...],
        include_identity_header: bool,
    ) -> dict[str, Any]:
        _require(
            path.startswith("/api/")
            and "://" not in path
            and ".." not in path
            and "?" not in path,
            "API 路径无效",
        )
        headers = {"Accept": "application/json"}
        if include_identity_header:
            headers[EXPECTED_PERSIST_ID_HEADER] = TARGET_PERSIST_ID
        body = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(
                payload, ensure_ascii=False, separators=(",", ":")
            ).encode("utf-8")
        label = f"{method} {path}"
        req = request.Request(
            self.base_url + path,
            data=body,
            method=method,
            headers=headers,
        )
        try:
            with self.opener.open(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                status = response.status
                raw = _read_response(response, label)
        except error.HTTPError as exc:
            status = exc.code
            try:
                _read_response(exc, label)
            finally:
                exc.close()
            raw = b""
        except (error.URLError, TimeoutError, OSError) as exc:
            raise PreparationError(f"{label} 网络请求失败") from exc
        _require(status in expected_statuses, f"{label} 返回 HTTP {status}")
        try:
            result = json.loads(raw.decode("utf-8")) if raw else {}
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PreparationError(f"{label} 返回非 JSON") from exc
        return _object(result, f"{label} 响应")


def _expected_persona_id() -> str:
    digest = hashlib.sha256(TARGET_PERSIST_ID.encode("utf-8")).hexdigest()[:16]
    return f"custom_{digest}"


def _accept_general_consent(client: Any, identity: dict[str, Any]) -> None:
    consent = _object(identity.get("consent"), "通用知情同意")
    if consent.get("accepted") is True:
        return
    notice_version = consent.get("notice_version")
    notice_hash = consent.get("notice_hash")
    _require(isinstance(notice_version, str) and bool(notice_version), "须知版本缺失")
    _require(
        isinstance(notice_hash, str) and _SHA256_PATTERN.fullmatch(notice_hash),
        "须知摘要无效",
    )
    saved = _object(
        client.api(
            "POST",
            "/api/consent",
            {
                "notice_version": notice_version,
                "notice_hash": notice_hash,
                "accepted": True,
            },
        ).get("consent"),
        "通用知情同意结果",
    )
    _require(saved.get("accepted") is True, "通用知情同意未生效")


def _build_draft(catalog: dict[str, Any]) -> dict[str, Any]:
    presets = [
        item
        for item in catalog.get("presets") or []
        if isinstance(item, dict) and isinstance(item.get("id"), str) and item["id"]
    ]
    _require(
        len(presets) == 1 and presets[0]["id"] == "linxi",
        "默认共享预设不是固定 linxi",
    )
    dimensions = catalog.get("relationship_dimensions")
    _require(isinstance(dimensions, list) and len(dimensions) == 5, "关系维度不完整")
    profile: dict[str, int] = {}
    for item in dimensions:
        row = _object(item, "关系维度")
        dimension_id = row.get("id")
        default = row.get("default")
        _require(
            isinstance(dimension_id, str)
            and re.fullmatch(r"[a-z_]{2,64}", dimension_id) is not None
            and dimension_id not in profile,
            "关系维度标识无效",
        )
        _require(
            isinstance(default, int)
            and not isinstance(default, bool)
            and 1 <= default <= 5,
            "关系维度默认值无效",
        )
        profile[dimension_id] = default
    return {
        "mode": "preset",
        "setup_mode": "quick",
        "studio_draft_id": "",
        "studio_revision": 0,
        "preset_role_id": presets[0]["id"],
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
        "relationship_profile": profile,
        "quiet_start": "23:30",
        "quiet_end": "08:00",
        "role_big_five_answers": {},
        "role_value_answers": {},
        "value_priorities": [],
        "value_non_negotiable": "",
        "supplemental_answers": {},
        "preview_adjustments": [],
    }


def _supplemental_answer(question_id: str) -> str:
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
        "repair_boundaries": "修复：先暂停，再把事实和感受说清楚；边界：不替用户作重大决定",
        "communication_preference": "先说明观察，再自然询问对方是否愿意继续",
        "boundaries": "不替用户作重大决定，也不越过明确拒绝",
        "shared_topics": "日常生活、长期计划和真实经历中的变化",
        "relationship_expectation": "作为边界清晰、彼此尊重的长期伙伴共同成长",
        "user_routine": "白天保持克制联系，夜间遵守勿扰时间",
    }
    _require(question_id in answers, f"服务返回未知补充问题：{question_id}")
    return answers[question_id]


def _answer_questions(client: Any, draft: dict[str, Any]) -> None:
    payload = client.api("POST", "/api/onboarding/questions", draft)
    questions = payload.get("questions")
    _require(isinstance(questions, list) and 3 <= len(questions) <= 5, "补充问题数量无效")
    supplemental: dict[str, str] = {}
    for item in questions:
        row = _object(item, "补充问题")
        question_id = row.get("id")
        _require(
            isinstance(question_id, str)
            and re.fullmatch(r"[a-z_]{2,64}", question_id) is not None
            and question_id not in supplemental,
            "补充问题标识无效",
        )
        supplemental[question_id] = _supplemental_answer(question_id)
    draft["supplemental_answers"] = supplemental


def _preview(client: Any, draft: dict[str, Any]) -> str:
    preview = _object(
        client.api("POST", "/api/onboarding/preview", draft).get("preview"),
        "角色预览",
    )
    fingerprint = preview.get("build_fingerprint")
    _require(
        isinstance(fingerprint, str) and _SHA256_PATTERN.fullmatch(fingerprint),
        "角色预览指纹无效",
    )
    validation = _object(preview.get("validation"), "角色预览验证")
    audit = _object(validation.get("audit"), "角色预览审计")
    issues = audit.get("issues") or []
    _require(isinstance(issues, list), "角色预览审计问题结构无效")
    _require(
        not any(
            isinstance(item, dict) and item.get("severity") == "blocking"
            for item in issues
        ),
        "角色预览仍有阻断冲突",
    )
    return fingerprint


def _accept_ai_consent(client: Any, catalog: dict[str, Any]) -> None:
    onboarding_ai = _object(catalog.get("onboarding_ai"), "初始化 AI 能力")
    current = _object(onboarding_ai.get("consent"), "初始化 AI 同意")
    version = current.get("version")
    revision = _strict_nonnegative_int(
        current.get("consent_revision"), "初始化 AI 同意 revision"
    )
    _require(isinstance(version, str) and bool(version), "初始化 AI 同意版本缺失")
    if current.get("accepted") is True:
        return
    _require(
        not str(current.get("revoked_at") or ""),
        "初始化 AI 同意曾被显式撤回，拒绝自动重新接受",
    )
    saved = _object(
        client.api(
            "POST",
            "/api/onboarding/ai-consent",
            {
                "version": version,
                "accepted": True,
                "expected_revision": revision,
            },
        ).get("consent"),
        "初始化 AI 同意结果",
    )
    saved_revision = _strict_nonnegative_int(
        saved.get("consent_revision"), "初始化 AI 同意结果 revision"
    )
    _require(
        saved.get("accepted") is True
        and saved.get("version") == version
        and saved_revision == revision + 1,
        "初始化 AI 同意未按服务端 revision 生效",
    )


def _string_ids(value: Any, label: str, minimum: int, maximum: int) -> list[str]:
    _require(isinstance(value, list) and minimum <= len(value) <= maximum, f"{label} 数量无效")
    ids: list[str] = []
    for item in value:
        _require(isinstance(item, str) and bool(item) and item not in ids, f"{label} 标识无效")
        ids.append(item)
    return ids


def _result_ids(
    audition: dict[str, Any], key: str, label: str, minimum: int, maximum: int
) -> list[str]:
    rows = audition.get(key)
    _require(isinstance(rows, list) and minimum <= len(rows) <= maximum, f"{label} 数量无效")
    ids: list[str] = []
    for item in rows:
        row = _object(item, label)
        scenario_id = row.get("scenario_id")
        _require(
            isinstance(scenario_id, str) and bool(scenario_id) and scenario_id not in ids,
            f"{label} 场景标识无效",
        )
        ids.append(scenario_id)
    return ids


def _validate_main_and_holdout(audition: dict[str, Any]) -> tuple[list[str], list[str]]:
    scenario_ids = _string_ids(audition.get("scenario_ids"), "主试镜场景", 10, 12)
    main_ids = _result_ids(audition, "main_results", "主试镜结果", 10, 12)
    holdout_ids = _string_ids(audition.get("holdout_scenario_ids"), "留出场景", 5, 5)
    holdout_result_ids = _result_ids(audition, "holdout_results", "留出结果", 5, 5)
    _require(main_ids == scenario_ids, "主试镜结果未完整覆盖服务端场景")
    _require(holdout_result_ids == holdout_ids, "留出结果未完整覆盖服务端场景")
    return main_ids, holdout_ids


def _audition(payload: dict[str, Any]) -> dict[str, Any]:
    result = _object(payload.get("audition"), "试镜结果")
    audition_id = result.get("audition_id")
    _require(
        isinstance(audition_id, str) and _AUDITION_ID_PATTERN.fullmatch(audition_id),
        "试镜标识无效",
    )
    return result


def _poll_audition(
    client: Any,
    audition_id: str,
    terminal_statuses: set[str],
    deadline: float,
) -> dict[str, Any]:
    while True:
        audition = _audition(
            client.api("GET", f"/api/onboarding/auditions/{audition_id}")
        )
        status = str(audition.get("status") or "")
        if status in terminal_statuses or status == "failed":
            return audition
        _require(
            status in {"queued", "running", "comparison_running"},
            f"试镜进入未知状态：{status}",
        )
        _require(time.monotonic() < deadline, "等待真实试镜超时")
        time.sleep(POLL_INTERVAL_SECONDS)


def _raise_failed_audition(audition: dict[str, Any]) -> None:
    code = re.sub(r"[^A-Za-z0-9_-]", "", str(audition.get("error_code") or ""))[:64]
    retryable = audition.get("retryable") is True
    raise PreparationError(f"真实试镜失败(code={code or 'unknown'}, retryable={retryable})")


def _validated_confirmed_audition(audition: dict[str, Any]) -> dict[str, Any]:
    _require(audition.get("status") == "confirmed", "真实试镜未确认通过")
    _validate_main_and_holdout(audition)
    holdout_receipt = _object(audition.get("holdout_receipt"), "留出审核收据")
    _require(
        _strict_nonnegative_int(holdout_receipt.get("accepted_count"), "留出认可数") == 5
        and _strict_nonnegative_int(holdout_receipt.get("total"), "留出总数") == 5
        and _strict_nonnegative_int(
            holdout_receipt.get("severe_violation_count"), "留出严重违例数"
        )
        == 0,
        "留出审核未达到全量通过且严重违例为零",
    )
    severe_receipt = audition.get("severe_violation_receipt")
    severe_count = 0
    if severe_receipt is not None:
        severe_count = _strict_nonnegative_int(
            _object(severe_receipt, "严重违例收据").get("severe_violation_count"),
            "严重违例数",
        )
    _require(severe_count == 0, "真实试镜存在严重违例")
    return audition


def _manual_review_material(
    audition: dict[str, Any], backend_revision: str
) -> tuple[dict[str, Any], dict[str, Any]]:
    _require(
        _REVISION_PATTERN.fullmatch(backend_revision) is not None,
        "锁定 backend revision 无效",
    )
    _main_ids, holdout_ids = _validate_main_and_holdout(audition)
    del _main_ids
    identity: dict[str, Any] = {
        "schema_version": "d050-holdout-review-v1",
        "backend_revision": backend_revision,
        "audition_id": str(audition.get("audition_id") or ""),
        "source_hash": str(audition.get("source_hash") or ""),
        "persona_hash": str(audition.get("persona_hash") or ""),
        "context_hash": str(audition.get("context_hash") or ""),
        "scenario_version": str(audition.get("scenario_version") or ""),
        "holdout_version": str(audition.get("holdout_version") or ""),
        "holdout_round": _strict_nonnegative_int(
            audition.get("holdout_round"), "留出轮次"
        ),
        "holdout_set_digest": str(audition.get("holdout_set_digest") or ""),
    }
    _require(
        _AUDITION_ID_PATTERN.fullmatch(identity["audition_id"]) is not None
        and all(
            _SHA256_PATTERN.fullmatch(identity[key]) is not None
            for key in (
                "source_hash",
                "persona_hash",
                "context_hash",
                "holdout_set_digest",
            )
        )
        and bool(identity["scenario_version"])
        and bool(identity["holdout_version"])
        and identity["holdout_round"] >= 1,
        "留出审核身份字段无效",
    )
    results = {
        str(item.get("scenario_id") or ""): item
        for item in audition.get("holdout_results") or []
        if isinstance(item, dict)
    }
    rows: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []
    for scenario_id in holdout_ids:
        result = _object(results.get(scenario_id), "留出场景结果")
        title = result.get("title")
        prompt = result.get("prompt")
        response = result.get("response")
        _require(
            isinstance(title, str)
            and bool(title)
            and isinstance(prompt, str)
            and bool(prompt)
            and isinstance(response, str)
            and bool(response),
            "留出场景缺少可人工审核的原文",
        )
        prompt_hash = _text_sha256(prompt)
        response_hash = _text_sha256(response)
        row_hash = _canonical_sha256(
            {
                **identity,
                "scenario_id": scenario_id,
                "title": title,
                "prompt_sha256": prompt_hash,
                "response_sha256": response_hash,
            }
        )
        rows.append(
            {
                "scenario_id": scenario_id,
                "title": title,
                "prompt": prompt,
                "response": response,
                "prompt_sha256": prompt_hash,
                "response_sha256": response_hash,
                "row_sha256": row_hash,
            }
        )
        decisions.append(
            {
                "scenario_id": scenario_id,
                "prompt_sha256": prompt_hash,
                "response_sha256": response_hash,
                "row_sha256": row_hash,
                "accepted": None,
                "severe_violation": None,
            }
        )
    review_set_hash = _canonical_sha256(
        {**identity, "row_sha256": [row["row_sha256"] for row in rows]}
    )
    request_payload = {
        **identity,
        "review_set_sha256": review_set_hash,
        "rows": rows,
    }
    decision_payload = {
        **identity,
        "review_set_sha256": review_set_hash,
        "reviews": decisions,
    }
    return request_payload, decision_payload


def _decode_manual_review(
    encoded: str, template: dict[str, Any]
) -> tuple[dict[str, dict[str, bool]], dict[str, Any], str]:
    _require(bool(encoded) and len(encoded) <= 32768, "缺少人工留出审核决定")
    try:
        raw = base64.b64decode(encoded, validate=True)
        decision = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as exc:
        raise PreparationError("人工留出审核决定格式无效") from exc
    decision = _object(decision, "人工留出审核决定")
    _require(set(decision) == set(template), "人工留出审核决定字段不闭合")
    for key, expected in template.items():
        if key != "reviews":
            _require(decision.get(key) == expected, f"人工留出审核字段漂移：{key}")
    expected_rows = template.get("reviews")
    actual_rows = decision.get("reviews")
    _require(
        isinstance(expected_rows, list)
        and isinstance(actual_rows, list)
        and len(expected_rows) == len(actual_rows) == 5,
        "人工留出审核条目数量无效",
    )
    reviews: dict[str, dict[str, bool]] = {}
    normalized_rows: list[dict[str, Any]] = []
    for expected, actual_value in zip(expected_rows, actual_rows, strict=True):
        actual = _object(actual_value, "人工留出审核条目")
        _require(set(actual) == set(expected), "人工留出审核条目字段不闭合")
        for key in (
            "scenario_id",
            "prompt_sha256",
            "response_sha256",
            "row_sha256",
        ):
            _require(actual.get(key) == expected.get(key), f"人工审核条目漂移：{key}")
        accepted = actual.get("accepted")
        severe = actual.get("severe_violation")
        _require(
            isinstance(accepted, bool) and isinstance(severe, bool),
            "人工审核结论必须是 JSON boolean",
        )
        _require(accepted and not severe, "人工审核未达到 5/5 通过且严重违例为零")
        scenario_id = str(actual["scenario_id"])
        _require(scenario_id not in reviews, "人工审核场景重复")
        reviews[scenario_id] = {
            "accepted": accepted,
            "severe_violation": severe,
        }
        normalized_rows.append(dict(actual))
    review_set_hash = str(template["review_set_sha256"])
    confirm_key = "d050-p6-load-a-confirm-" + review_set_hash.removeprefix(
        "sha256:"
    )[:24]
    confirmation = {
        **{key: value for key, value in template.items() if key != "reviews"},
        "confirm_key": confirm_key,
        "reviews": normalized_rows,
    }
    return reviews, confirmation, confirm_key


def _manual_review_audition_id(encoded: str) -> str:
    _require(bool(encoded) and len(encoded) <= 32768, "缺少人工留出审核决定")
    try:
        raw = base64.b64decode(encoded, validate=True)
        decision = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as exc:
        raise PreparationError("人工留出审核决定格式无效") from exc
    decision = _object(decision, "人工留出审核决定")
    audition_id = decision.get("audition_id")
    _require(
        isinstance(audition_id, str)
        and _AUDITION_ID_PATTERN.fullmatch(audition_id) is not None,
        "人工留出审核试镜标识无效",
    )
    return audition_id


def _verify_stored_manual_review(
    audition: dict[str, Any], reviews: dict[str, dict[str, bool]], confirm_key: str
) -> None:
    stored = audition.get("holdout_reviews")
    _require(isinstance(stored, list) and len(stored) == len(reviews), "服务端人工审核集漂移")
    stored_by_id: dict[str, dict[str, Any]] = {}
    for value in stored:
        item = _object(value, "服务端人工审核条目")
        scenario_id = item.get("scenario_id")
        _require(
            isinstance(scenario_id, str)
            and bool(scenario_id)
            and scenario_id not in stored_by_id,
            "服务端人工审核场景无效",
        )
        stored_by_id[scenario_id] = item
    _require(set(stored_by_id) == set(reviews), "服务端人工审核集漂移")
    for scenario_id, expected in reviews.items():
        actual = stored_by_id[scenario_id]
        _require(
            actual.get("accepted") is expected["accepted"]
            and actual.get("severe_violation") is expected["severe_violation"],
            "服务端人工审核结论漂移",
        )
    _require(audition.get("confirm_key") == confirm_key, "服务端人工审核确认键漂移")


def _run_audition(
    client: Any,
    draft: dict[str, Any],
    deadline: float,
    *,
    review_phase: str,
    review_decision_b64: str,
    backend_revision: str,
) -> tuple[dict[str, Any] | None, dict[str, Any], dict[str, Any]]:
    if review_phase == "confirm_review":
        audition_id = _manual_review_audition_id(review_decision_b64)
        started = _audition(
            client.api("GET", f"/api/onboarding/auditions/{audition_id}")
        )
    else:
        audition_key = os.environ.get("D050_AUDITION_KEY", AUDITION_KEY)
        _require(
            re.fullmatch(r"[A-Za-z0-9_-]{8,128}", audition_key) is not None,
            "试镜幂等键无效",
        )
        started = _audition(
            client.api(
                "POST",
                "/api/onboarding/auditions",
                {
                    "draft": draft,
                    "expected_revision": 0,
                    "idempotency_key": audition_key,
                },
                expected_statuses=(200, 202),
            )
        )
    audition_id = str(started["audition_id"])
    status = str(started.get("status") or "")
    if status in {"queued", "running"}:
        started = _poll_audition(
            client,
            audition_id,
            {"main_ready", "confirmed", "changes_required"},
            deadline,
        )
        status = str(started.get("status") or "")
    if status == "changes_required":
        raise PreparationError("既有试镜要求修改，拒绝自动覆盖审核结论")
    if status == "failed":
        _raise_failed_audition(started)
    _require(status in {"main_ready", "confirmed"}, "真实试镜未进入可人工审核状态")
    request_payload, decision_template = _manual_review_material(
        started, backend_revision
    )
    if review_phase == "prepare_review":
        _require(status == "main_ready", "待审试镜已被提前确认，拒绝覆盖人工审核来源")
        _require(not review_decision_b64, "准备审核阶段禁止携带审核决定")
        return None, request_payload, decision_template

    _require(review_phase == "confirm_review", "人工审核阶段无效")
    reviews, confirmation, confirm_key = _decode_manual_review(
        review_decision_b64, decision_template
    )
    if status == "confirmed":
        confirmed = _validated_confirmed_audition(started)
        _verify_stored_manual_review(confirmed, reviews, confirm_key)
        return confirmed, request_payload, confirmation
    confirmed = _audition(
        client.api(
            "POST",
            f"/api/onboarding/auditions/{audition_id}/confirm",
            {
                "draft": draft,
                "expected_revision": 0,
                "accept_uncontested": True,
                "reviews": {},
                "holdout_reviews": reviews,
                "idempotency_key": confirm_key,
            },
        )
    )
    confirmed = _validated_confirmed_audition(confirmed)
    _verify_stored_manual_review(confirmed, reviews, confirm_key)
    return confirmed, request_payload, confirmation


def _growth_notice(catalog: dict[str, Any]) -> tuple[str, str]:
    growth = _object(catalog.get("persona_growth"), "自主成长能力")
    consent = _object(growth.get("consent"), "自主成长披露")
    version = consent.get("notice_version")
    digest = consent.get("notice_hash")
    _require(isinstance(version, str) and bool(version), "自主成长披露版本缺失")
    _require(
        isinstance(digest, str) and _SHA256_PATTERN.fullmatch(digest),
        "自主成长披露摘要无效",
    )
    _require(
        not str(consent.get("withdrawn_at") or ""),
        "自主成长同意曾被显式撤回，拒绝自动重新接受",
    )
    return version, digest


def _complete(
    client: Any,
    draft: dict[str, Any],
    fingerprint: str,
    growth_notice: tuple[str, str],
) -> None:
    version, digest = growth_notice
    completed = client.api(
        "POST",
        "/api/onboarding/complete",
        {
            "draft": draft,
            "idempotency_key": COMPLETE_KEY,
            "preview_fingerprint": fingerprint,
            "growth_notice_version": version,
            "growth_notice_hash": digest,
            "growth_accepted": True,
            "confirm_explicit_unknowns": False,
        },
    )
    me = _object(completed.get("me"), "角色创建结果")
    _require(me.get("persist_id") == TARGET_PERSIST_ID, "角色创建结果身份错误")


def _resume_completion(client: Any, catalog: dict[str, Any]) -> None:
    recovery = _object(catalog.get("recovery"), "角色创建续做请求")
    _require(recovery.get("idempotency_key") == COMPLETE_KEY, "存在其他角色创建事务")
    payload = {
        key: recovery.get(key)
        for key in (
            "draft",
            "idempotency_key",
            "preview_fingerprint",
            "growth_notice_version",
            "growth_notice_hash",
            "growth_accepted",
        )
    }
    _require(isinstance(payload["draft"], dict), "角色创建续做草稿无效")
    _require(
        isinstance(payload["preview_fingerprint"], str)
        and _SHA256_PATTERN.fullmatch(payload["preview_fingerprint"]),
        "角色创建续做指纹无效",
    )
    _require(payload["growth_accepted"] is True, "角色创建续做未绑定成长同意")
    client.api("POST", "/api/onboarding/complete", payload)


def _verify_final(
    client: Any,
    *,
    reused_ready_state: bool,
    audition: dict[str, Any] | None = None,
) -> dict[str, Any]:
    me = client.api("GET", "/api/me")
    catalog = client.api("GET", "/api/onboarding")
    me_onboarding = _object(me.get("onboarding"), "最终身份初始化状态")
    catalog_onboarding = _object(catalog.get("onboarding"), "最终初始化状态")
    role = _object(me.get("role_choice"), "最终角色绑定")
    _require(
        me.get("persist_id") == TARGET_PERSIST_ID
        and me.get("persona_id") == _expected_persona_id()
        and role.get("mode") == "wizard"
        and role.get("preset_role_id") == "linxi",
        "最终私有 Persona 绑定不符合 custom_sha256(p6_load_a)",
    )
    _require(
        me_onboarding.get("completed") is True
        and me_onboarding.get("status") == "ready"
        and catalog_onboarding.get("completed") is True
        and catalog_onboarding.get("status") == "ready",
        "最终初始化状态不是 ready",
    )
    growth = _object(catalog.get("persona_growth"), "最终自主成长状态")
    growth_consent = _object(growth.get("consent"), "最终自主成长同意")
    _require(growth_consent.get("accepted") is True, "最终自主成长同意未接受")
    summary: dict[str, Any] = {
        "ok": True,
        "target": TARGET_PERSIST_ID,
        "persona_binding": "custom_sha256",
        "onboarding_status": "ready",
        "growth_accepted": True,
        "reused_ready_state": reused_ready_state,
    }
    if audition is not None:
        summary.update(
            {
                "audition_status": "confirmed",
                "main_result_count": len(audition.get("main_results") or []),
                "holdout_result_count": len(audition.get("holdout_results") or []),
                "severe_violation_count": 0,
            }
        )
    return summary


def prepare_synthetic(
    client: Any,
    identity: dict[str, Any],
    *,
    review_phase: str,
    review_decision_b64: str,
    backend_revision: str,
) -> dict[str, Any]:
    _require(
        identity.get("scope") == "user"
        and identity.get("persist_id") == TARGET_PERSIST_ID,
        "合成用户身份不符合任务边界",
    )
    _require(review_phase in {"prepare_review", "confirm_review"}, "人工审核阶段无效")
    _require(
        _REVISION_PATTERN.fullmatch(backend_revision) is not None,
        "锁定 backend revision 无效",
    )
    if review_phase == "prepare_review":
        _require(not review_decision_b64, "准备审核阶段禁止携带审核决定")
    else:
        _require(bool(review_decision_b64), "确认审核阶段缺少人工决定")
    initial_onboarding = _object(identity.get("onboarding"), "初始初始化状态")
    if initial_onboarding.get("completed") is True:
        _require(review_phase == "confirm_review", "ready 状态只允许绑定人工决定后复验")
        audition_id = _manual_review_audition_id(review_decision_b64)
        confirmed = _validated_confirmed_audition(
            _audition(client.api("GET", f"/api/onboarding/auditions/{audition_id}"))
        )
        _request_payload, decision_template = _manual_review_material(
            confirmed, backend_revision
        )
        reviews, confirmation, confirm_key = _decode_manual_review(
            review_decision_b64, decision_template
        )
        _verify_stored_manual_review(confirmed, reviews, confirm_key)
        summary = _verify_final(client, reused_ready_state=True, audition=confirmed)
        summary.update(
            {
                "phase": "confirm_review",
                "manual_holdout_review": True,
                "review_set_sha256": confirmation["review_set_sha256"],
                "confirm_key": confirmation["confirm_key"],
                "_review_confirmation": confirmation,
            }
        )
        return summary

    _accept_general_consent(client, identity)
    catalog = client.api("GET", "/api/onboarding")
    onboarding = _object(catalog.get("onboarding"), "初始化状态")
    status = onboarding.get("status")
    deadline = time.monotonic() + AUDITION_TIMEOUT_SECONDS
    if status == "creating":
        recovery = _object(catalog.get("recovery"), "角色创建续做请求")
        draft = _object(recovery.get("draft"), "角色创建续做草稿")
        audition, _request_payload, confirmation = _run_audition(
            client,
            draft,
            deadline,
            review_phase=review_phase,
            review_decision_b64=review_decision_b64,
            backend_revision=backend_revision,
        )
        _require(audition is not None, "creating 状态不能回到准备审核阶段")
        _resume_completion(client, catalog)
        summary = _verify_final(
            client, reused_ready_state=False, audition=audition
        )
        summary.update(
            {
                "phase": "confirm_review",
                "manual_holdout_review": True,
                "review_set_sha256": confirmation["review_set_sha256"],
                "confirm_key": confirmation["confirm_key"],
                "_review_confirmation": confirmation,
            }
        )
        return summary
    _require(status == "pending" and onboarding.get("completed") is False, "合成用户不在可初始化状态")

    growth_notice = _growth_notice(catalog)
    draft = _build_draft(catalog)
    _answer_questions(client, draft)
    fingerprint = _preview(client, draft)
    _accept_ai_consent(client, catalog)
    audition, request_payload, review_evidence = _run_audition(
        client,
        draft,
        deadline,
        review_phase=review_phase,
        review_decision_b64=review_decision_b64,
        backend_revision=backend_revision,
    )
    if review_phase == "prepare_review":
        _require(audition is None, "准备审核阶段意外确认了试镜")
        return {
            "ok": True,
            "phase": "prepare_review",
            "target": TARGET_PERSIST_ID,
            "audition_status": "main_ready",
            "review_set_sha256": review_evidence["review_set_sha256"],
            "_review_request": request_payload,
            "_review_decision": review_evidence,
        }
    _require(audition is not None, "确认审核阶段未得到已确认试镜")
    _complete(client, draft, fingerprint, growth_notice)
    summary = _verify_final(
        client,
        reused_ready_state=False,
        audition=audition,
    )
    summary.update(
        {
            "phase": "confirm_review",
            "manual_holdout_review": True,
            "review_set_sha256": review_evidence["review_set_sha256"],
            "confirm_key": review_evidence["confirm_key"],
            "_review_confirmation": review_evidence,
        }
    )
    return summary


def _fake_identity(status: str = "pending") -> dict[str, Any]:
    ready = status == "ready"
    return {
        "scope": "user",
        "persist_id": TARGET_PERSIST_ID,
        "persona_id": _expected_persona_id() if ready else "linxi",
        "role_choice": {
            "mode": "wizard" if ready else "preset",
            "preset_role_id": "linxi",
        },
        "consent": {
            "accepted": ready,
            "notice_version": "general-v1",
            "notice_hash": "sha256:" + "1" * 64,
        },
        "onboarding": {"completed": ready, "status": status},
    }


class _FakeApi:
    def __init__(self, mode: str = "fresh") -> None:
        self.mode = mode
        self.ready = mode == "ready"
        self.confirm_key = ""
        self.holdout_reviews: list[dict[str, Any]] = []
        self.calls: list[tuple[str, str, dict[str, Any] | None]] = []
        self.main_ids = [f"scenario_{index:02d}" for index in range(10)]
        self.holdout_ids = [f"holdout_{index:02d}" for index in range(5)]
        self.audition_id = "audition_" + "a" * 24
        self.draft = {
            "mode": "preset",
            "setup_mode": "quick",
            "preset_role_id": "linxi",
        }

    def _catalog(self) -> dict[str, Any]:
        if self.ready:
            return {
                "onboarding": {"completed": True, "status": "ready"},
                "persona_growth": {"consent": {"accepted": True}},
            }
        if self.mode == "recovery":
            return {
                "onboarding": {"completed": False, "status": "creating"},
                "recovery": {
                    "draft": self.draft,
                    "idempotency_key": COMPLETE_KEY,
                    "preview_fingerprint": "sha256:" + "2" * 64,
                    "growth_notice_version": "growth-v1",
                    "growth_notice_hash": "sha256:" + "3" * 64,
                    "growth_accepted": True,
                },
            }
        return {
            "onboarding": {"completed": False, "status": "pending"},
            "presets": [{"id": "linxi"}],
            "relationship_dimensions": [
                {"id": name, "default": 3}
                for name in (
                    "initiative",
                    "support_challenge",
                    "closeness_boundary",
                    "leadership",
                    "stability_growth",
                )
            ],
            "persona_growth": {
                "consent": {
                    "accepted": False,
                    "notice_version": "growth-v1",
                    "notice_hash": "sha256:" + "3" * 64,
                    "withdrawn_at": "",
                }
            },
            "onboarding_ai": {
                "consent": {
                    "version": "service-consent-v9",
                    "accepted": False,
                    "consent_revision": 7,
                    "revoked_at": "",
                }
            },
        }

    def _audition(self, status: str) -> dict[str, Any]:
        result: dict[str, Any] = {
            "audition_id": self.audition_id,
            "status": status,
            "source_hash": "sha256:" + "4" * 64,
            "persona_hash": "sha256:" + "5" * 64,
            "context_hash": "sha256:" + "6" * 64,
            "scenario_version": "persona-audition-scenarios-v1",
            "scenario_ids": self.main_ids,
            "main_results": [
                {
                    "scenario_id": scenario_id,
                    "title": f"主场景 {scenario_id}",
                    "prompt": f"主问题 {scenario_id}",
                    "response": f"主候选 {scenario_id}",
                }
                for scenario_id in self.main_ids
            ],
            "holdout_version": "persona-holdout-v1",
            "holdout_round": 1,
            "holdout_scenario_ids": self.holdout_ids,
            "holdout_set_digest": "sha256:" + "7" * 64,
            "holdout_results": [
                {
                    "scenario_id": scenario_id,
                    "title": f"留出场景 {scenario_id}",
                    "prompt": f"留出问题 {scenario_id}",
                    "response": f"留出候选 {scenario_id}",
                }
                for scenario_id in self.holdout_ids
            ],
            "comparison_results": [],
        }
        if status == "confirmed":
            result["confirm_key"] = self.confirm_key
            result["holdout_reviews"] = self.holdout_reviews
            result["holdout_receipt"] = {
                "accepted_count": 5,
                "total": 5,
                "severe_violation_count": 0,
            }
        return result

    def api(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        expected_statuses: tuple[int, ...] = (200,),
    ) -> dict[str, Any]:
        del expected_statuses
        self.calls.append((method, path, payload))
        if method == "GET" and path == "/api/me":
            return _fake_identity("ready" if self.ready else "pending")
        if method == "GET" and path == "/api/onboarding":
            return self._catalog()
        if method == "POST" and path == "/api/consent":
            _require(payload is not None and payload.get("accepted") is True, "自测通用同意载荷错误")
            return {"consent": {"accepted": True}}
        if method == "POST" and path == "/api/onboarding/questions":
            return {
                "questions": [
                    {"id": "life_context"},
                    {"id": "core_values_growth"},
                    {"id": "repair_boundaries"},
                ]
            }
        if method == "POST" and path == "/api/onboarding/preview":
            return {
                "preview": {
                    "build_fingerprint": "sha256:" + "2" * 64,
                    "validation": {"audit": {"issues": []}},
                }
            }
        if method == "POST" and path == "/api/onboarding/ai-consent":
            _require(
                payload
                == {
                    "version": "service-consent-v9",
                    "accepted": True,
                    "expected_revision": 7,
                },
                "自测 AI 同意未使用服务端版本与 revision",
            )
            return {
                "consent": {
                    "version": "service-consent-v9",
                    "accepted": True,
                    "consent_revision": 8,
                }
            }
        if method == "POST" and path == "/api/onboarding/auditions":
            _require(
                payload is not None and payload.get("idempotency_key") == AUDITION_KEY,
                "自测试镜键错误",
            )
            return {
                "audition": self._audition("confirmed")
                if self.mode == "confirmed"
                else {"audition_id": self.audition_id, "status": "queued"}
            }
        if method == "GET" and path == f"/api/onboarding/auditions/{self.audition_id}":
            return {
                "audition": self._audition(
                    "confirmed" if self.mode in {"ready", "confirmed"} else "main_ready"
                )
            }
        if method == "POST" and path.endswith("/confirm"):
            _require(
                payload is not None
                and str(payload.get("idempotency_key") or "").startswith(
                    "d050-p6-load-a-confirm-"
                )
                and payload.get("reviews") == {}
                and len(payload.get("holdout_reviews", {})) == 5
                and all(
                    item == {"accepted": True, "severe_violation": False}
                    for item in payload.get("holdout_reviews", {}).values()
                ),
                "自测试镜确认载荷错误",
            )
            self.confirm_key = str(payload["idempotency_key"])
            self.holdout_reviews = [
                {"scenario_id": scenario_id, **review}
                for scenario_id, review in payload["holdout_reviews"].items()
            ]
            return {"audition": self._audition("confirmed")}
        if method == "POST" and path == "/api/onboarding/complete":
            _require(payload is not None and payload.get("idempotency_key") == COMPLETE_KEY, "自测完成键错误")
            self.ready = True
            return {"me": _fake_identity("ready"), "idempotent": self.mode == "recovery"}
        raise AssertionError(f"自测收到未覆盖请求：{method} {path}")


def _self_test() -> None:
    secret = "self-test-sensitive-value"
    encoded = base64.b64encode(secret.encode("utf-8")).decode("ascii")
    _require(_decode_token(encoded) == secret, "自测 Base64 解码失败")
    try:
        _decode_token("not valid base64")
    except PreparationError:
        pass
    else:
        raise AssertionError("无效 Base64 未被拒绝")
    try:
        _production_base_url("https://example.invalid")
    except PreparationError:
        pass
    else:
        raise AssertionError("非生产来源未被拒绝")

    wrong_preset = _FakeApi()._catalog()
    wrong_preset["presets"] = [{"id": "unexpected"}]
    try:
        _build_draft(wrong_preset)
    except PreparationError:
        pass
    else:
        raise AssertionError("非 linxi 预设未被拒绝")

    withdrawn = _FakeApi()
    withdrawn_catalog = withdrawn._catalog()
    withdrawn_catalog["onboarding_ai"]["consent"]["revoked_at"] = "2026-07-31T00:00:00Z"
    try:
        _accept_ai_consent(withdrawn, withdrawn_catalog)
    except PreparationError:
        pass
    else:
        raise AssertionError("显式撤回的 AI 同意被自动重新接受")
    _require(not withdrawn.calls, "撤回态自测不应调用产品 API")

    growth_withdrawn = _FakeApi()._catalog()
    growth_withdrawn["persona_growth"]["consent"]["withdrawn_at"] = (
        "2026-07-31T00:00:00Z"
    )
    try:
        _growth_notice(growth_withdrawn)
    except PreparationError:
        pass
    else:
        raise AssertionError("显式撤回的自主成长同意被自动重新接受")

    backend_revision = "1" * 40
    fresh = _FakeApi()
    prepare_summary = prepare_synthetic(
        fresh,
        _fake_identity(),
        review_phase="prepare_review",
        review_decision_b64="",
        backend_revision=backend_revision,
    )
    _require(
        prepare_summary.get("phase") == "prepare_review"
        and len(prepare_summary["_review_request"]["rows"]) == 5
        and not any(
            path.endswith("/confirm") or path == "/api/onboarding/complete"
            for _method, path, _payload in fresh.calls
        ),
        "准备人工审核阶段越过确认边界",
    )
    review_material = json.dumps(prepare_summary, ensure_ascii=False)
    _require(
        secret not in review_material
        and encoded not in review_material
        and SESSION_COOKIE_NAME not in review_material,
        "人工审核材料泄漏敏感值",
    )
    decision = json.loads(
        json.dumps(prepare_summary["_review_decision"], ensure_ascii=False)
    )
    for item in decision["reviews"]:
        item["accepted"] = True
        item["severe_violation"] = False
    decision_b64 = base64.b64encode(
        json.dumps(decision, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
    ).decode("ascii")
    fresh.calls.clear()
    fresh_summary = prepare_synthetic(
        fresh,
        _fake_identity(),
        review_phase="confirm_review",
        review_decision_b64=decision_b64,
        backend_revision=backend_revision,
    )
    _require(
        fresh_summary.get("audition_status") == "confirmed"
        and fresh_summary.get("manual_holdout_review") is True
        and sum(path.endswith("/confirm") for _method, path, _payload in fresh.calls)
        == 1
        and sum(
            path == "/api/onboarding/complete"
            for _method, path, _payload in fresh.calls
        )
        == 1,
        "人工审核确认阶段未按契约完成",
    )
    public_summary = {
        key: value for key, value in fresh_summary.items() if not key.startswith("_")
    }
    serialized = json.dumps(public_summary, ensure_ascii=False)
    _require(
        secret not in serialized
        and encoded not in serialized
        and SESSION_COOKIE_NAME not in serialized,
        "脱敏摘要泄漏敏感值",
    )

    ready = _FakeApi("ready")
    ready.confirm_key = str(fresh_summary["confirm_key"])
    ready.holdout_reviews = [
        {"scenario_id": item["scenario_id"], "accepted": True, "severe_violation": False}
        for item in decision["reviews"]
    ]
    ready_summary = prepare_synthetic(
        ready,
        _fake_identity("ready"),
        review_phase="confirm_review",
        review_decision_b64=decision_b64,
        backend_revision=backend_revision,
    )
    _require(
        ready_summary.get("reused_ready_state") is True
        and not any(method != "GET" for method, _path, _payload in ready.calls),
        "ready 状态未按同一人工决定只读复验",
    )

    confirmed = _FakeApi("confirmed")
    try:
        prepare_synthetic(
            confirmed,
            _fake_identity(),
            review_phase="confirm_review",
            review_decision_b64=decision_b64,
            backend_revision=backend_revision,
        )
    except PreparationError:
        pass
    else:
        raise AssertionError("无法绑定人工决定的既有 confirmed 试镜被复用")
    _require(
        not any(path == "/api/onboarding/complete" for _method, path, _payload in confirmed.calls),
        "未证明人工审核来源时不应完成出生",
    )

    tampered = json.loads(json.dumps(decision, ensure_ascii=False))
    tampered["reviews"][0]["response_sha256"] = "sha256:" + "f" * 64
    tampered_b64 = base64.b64encode(
        json.dumps(tampered, ensure_ascii=False).encode("utf-8")
    ).decode("ascii")
    rejected = _FakeApi()
    try:
        prepare_synthetic(
            rejected,
            _fake_identity(),
            review_phase="confirm_review",
            review_decision_b64=tampered_b64,
            backend_revision=backend_revision,
        )
    except PreparationError:
        pass
    else:
        raise AssertionError("被篡改的人工审核决定未被拒绝")
    _require(
        not any(
            path.endswith("/confirm") or path == "/api/onboarding/complete"
            for _method, path, _payload in rejected.calls
        ),
        "篡改审核决定越过确认边界",
    )

    denied = json.loads(json.dumps(decision, ensure_ascii=False))
    denied["reviews"][0]["accepted"] = False
    denied_b64 = base64.b64encode(
        json.dumps(denied, ensure_ascii=False).encode("utf-8")
    ).decode("ascii")
    denied_api = _FakeApi()
    try:
        prepare_synthetic(
            denied_api,
            _fake_identity(),
            review_phase="confirm_review",
            review_decision_b64=denied_b64,
            backend_revision=backend_revision,
        )
    except PreparationError:
        pass
    else:
        raise AssertionError("人工拒绝的留出场景仍被确认")
    _require(
        not any(
            path.endswith("/confirm") or path == "/api/onboarding/complete"
            for _method, path, _payload in denied_api.calls
        ),
        "人工拒绝越过确认边界",
    )

    recovery = _FakeApi("recovery")
    recovery_identity = _fake_identity("pending")
    recovery_identity["consent"]["accepted"] = True
    recovery_identity["onboarding"] = {"completed": False, "status": "creating"}
    recovery_summary = prepare_synthetic(
        recovery,
        recovery_identity,
        review_phase="confirm_review",
        review_decision_b64=decision_b64,
        backend_revision=backend_revision,
    )
    _require(
        recovery_summary.get("onboarding_status") == "ready"
        and any(path.endswith("/confirm") for _method, path, _payload in recovery.calls)
        and any(
            path == "/api/onboarding/complete"
            for _method, path, _payload in recovery.calls
        ),
        "完成中断续做自测失败",
    )
    print("d050 synthetic preparation self-test OK")


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        _self_test()
        return 0
    if argv:
        raise SystemExit("用法：d050_prepare_synthetic.py | --self-test")
    try:
        base_url = _production_base_url(
            os.environ.get("D050_BASE_URL", PRODUCTION_BASE_URL)
        )
        token = _decode_token(os.environ.get("D050_PRIMARY_TOKEN_B64", ""))
        client = ProductionApi(base_url)
        identity = client.login(token)
        token = ""
        summary = prepare_synthetic(
            client,
            identity,
            review_phase=os.environ.get("D050_REVIEW_PHASE", ""),
            review_decision_b64=os.environ.get("D050_REVIEW_DECISION_B64", ""),
            backend_revision=os.environ.get("D050_EXPECTED_BACKEND_REVISION", ""),
        )
        request_payload = summary.pop("_review_request", None)
        decision_payload = summary.pop("_review_decision", None)
        confirmation = summary.pop("_review_confirmation", None)
        if request_payload is not None or decision_payload is not None:
            _require(
                isinstance(request_payload, dict) and isinstance(decision_payload, dict),
                "人工审核材料不完整",
            )
            REVIEW_REQUEST_PATH.write_text(
                json.dumps(request_payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            REVIEW_DECISION_PATH.write_text(
                json.dumps(decision_payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        if confirmation is not None:
            _require(isinstance(confirmation, dict), "人工审核确认凭据无效")
            REVIEW_CONFIRMATION_PATH.write_text(
                json.dumps(confirmation, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
    except PreparationError as exc:
        print(
            json.dumps(
                {"ok": False, "target": TARGET_PERSIST_ID, "error": str(exc)},
                ensure_ascii=False,
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 1
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "target": TARGET_PERSIST_ID,
                    "error": f"未预期错误：{type(exc).__name__}",
                },
                ensure_ascii=False,
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 1
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
