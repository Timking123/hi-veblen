#!/usr/bin/env python3
"""验证双站发布包的 Nginx 鉴权头边界。"""

from __future__ import annotations

import shlex
import sys
from pathlib import Path


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _tokens(source: str) -> list[str]:
    lexer = shlex.shlex(source, posix=True, punctuation_chars="{};")
    lexer.whitespace_split = True
    lexer.commenters = "#"
    return list(lexer)


def _blocks(items: list[str], prefix: list[str]) -> list[list[str]]:
    result: list[list[str]] = []
    index = 0
    while index + len(prefix) < len(items):
        if items[index : index + len(prefix)] != prefix or items[index + len(prefix)] != "{":
            index += 1
            continue
        start = index
        index += len(prefix)
        depth = 0
        while index < len(items):
            if items[index] == "{":
                depth += 1
            elif items[index] == "}":
                depth -= 1
                if depth == 0:
                    result.append(items[start : index + 1])
                    break
            index += 1
        _require(depth == 0, f"Nginx 块未闭合：{prefix}")
        index += 1
    return result


def _only_block(items: list[str], prefix: list[str]) -> list[str]:
    matches = _blocks(items, prefix)
    _require(len(matches) == 1, f"Nginx 块数量异常：{prefix}={len(matches)}")
    return matches[0]


def _directive_arguments(items: list[str], directive: str) -> list[list[str]]:
    result: list[list[str]] = []
    index = 0
    expected = directive.casefold()
    while index < len(items):
        if items[index] in ("{", "}", ";"):
            index += 1
            continue
        name = items[index]
        arguments: list[str] = []
        index += 1
        while index < len(items) and items[index] not in ("{", "}", ";"):
            arguments.append(items[index])
            index += 1
        if index < len(items) and items[index] == ";" and name.casefold() == expected:
            result.append(arguments)
        index += 1
    return result


def _header_arguments(items: list[str], header: str) -> list[list[str]]:
    expected = header.casefold()
    return [
        arguments[1:]
        for arguments in _directive_arguments(items, "proxy_set_header")
        if arguments and arguments[0].casefold() == expected
    ]


def validate_source(source: str) -> None:
    servers = _blocks(_tokens(source), ["server"])
    portal = next(
        (
            block
            for block in servers
            if _directive_arguments(block, "server_name") == [["hi-veblen.com"]]
        ),
        None,
    )
    lingxi = next(
        (
            block
            for block in servers
            if _directive_arguments(block, "server_name") == [["lingxi.hi-veblen.com"]]
        ),
        None,
    )
    _require(portal is not None, "缺少 hi-veblen.com HTTPS server")
    _require(lingxi is not None, "缺少 lingxi.hi-veblen.com HTTPS server")

    portal_api = _only_block(portal, ["location", "/api/"])
    _require(
        _directive_arguments(portal_api, "proxy_pass") == [["http://127.0.0.1:3001"]],
        "主域 /api/ 必须代理到 MyWeb 3001",
    )
    _require(not _directive_arguments(portal_api, "include"), "主域 /api/ 禁止隐藏 include")
    _require(
        _header_arguments(portal_api, "Authorization") in ([], [["$http_authorization"]]),
        "主域 /api/ 不得清空或改写 Authorization",
    )
    request_headers = [
        [value.casefold() for value in arguments]
        for arguments in _directive_arguments(portal_api, "proxy_pass_request_headers")
    ]
    _require(request_headers in ([], [["on"]]), "主域 /api/ 必须转发请求头")
    _require(
        _header_arguments(portal_api, "X-Brain-Gateway-Token") == [[""]],
        "主域 /api/ 必须清空内部网关头",
    )

    prefixes = (
        ["location", "=", "/api/session"],
        ["location", "/api/"],
        ["location", "/ws/"],
    )
    for prefix in prefixes:
        public_route = _only_block(lingxi, prefix)
        _require(not _directive_arguments(public_route, "include"), f"Lingxi 路由禁止隐藏 include：{prefix}")
        _require(
            _header_arguments(public_route, "Authorization") == [[""]],
            f"Lingxi 路由必须唯一清空 Authorization：{prefix}",
        )
        _require(
            _header_arguments(public_route, "X-Brain-Gateway-Token") == [[""]],
            f"Lingxi 路由必须唯一清空内部网关头：{prefix}",
        )


_FIXTURE = r'''
server {
    server_name hi-veblen.com;
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Brain-Gateway-Token "";
    }
}
server {
    server_name lingxi.hi-veblen.com;
    location = /api/session {
        proxy_set_header Authorization "";
        proxy_set_header X-Brain-Gateway-Token "";
    }
    location /api/ {
        proxy_set_header Authorization "";
        proxy_set_header X-Brain-Gateway-Token "";
    }
    location /ws/ {
        proxy_set_header Authorization "";
        proxy_set_header X-Brain-Gateway-Token "";
    }
}
'''


def _expect_rejected(source: str) -> None:
    try:
        validate_source(source)
    except ValueError:
        return
    raise AssertionError("危险 Nginx 变体未被拒绝")


def _self_test() -> None:
    validate_source(_FIXTURE)
    validate_source(
        _FIXTURE.replace(
            'proxy_set_header X-Brain-Gateway-Token "";',
            'proxy_set_header\tAUTHORIZATION\n            $http_authorization;\n'
            '        proxy_set_header X-Brain-Gateway-Token "";',
            1,
        )
    )
    _expect_rejected(
        _FIXTURE.replace(
            'proxy_set_header X-Brain-Gateway-Token "";',
            'proxy_set_header Authorization "";\n'
            '        proxy_set_header X-Brain-Gateway-Token "";',
            1,
        )
    )
    _expect_rejected(
        _FIXTURE.replace(
            'proxy_set_header X-Brain-Gateway-Token "";',
            'proxy_pass_request_headers off;\n'
            '        proxy_set_header X-Brain-Gateway-Token "";',
            1,
        )
    )
    _expect_rejected(
        _FIXTURE.replace('proxy_set_header Authorization "";', '# proxy_set_header Authorization "";', 1)
    )
    _expect_rejected(
        _FIXTURE.replace(
            'proxy_set_header Authorization "";',
            'proxy_set_header Authorization "";\n'
            '        proxy_set_header\tauthorization $http_authorization;',
            1,
        )
    )
    _expect_rejected(
        _FIXTURE.replace(
            'proxy_set_header X-Brain-Gateway-Token "";',
            'proxy_set_header X-Brain-Gateway-Token "";\n'
            '        proxy_set_header    x-brain-gateway-token\n'
            '            $http_x_brain_gateway_token;',
            2,
        )
    )
    print("release nginx auth routing self-test OK")


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        _self_test()
        return 0
    if len(argv) != 1:
        raise SystemExit("用法：validate_release_nginx.py <nginx.conf> | --self-test")
    validate_source(Path(argv[0]).read_text(encoding="utf-8"))
    print("release nginx auth routing OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
