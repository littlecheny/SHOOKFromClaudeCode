#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any, TextIO

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_PREDICT_BTC_PYTHON = Path('/opt/homebrew/Caskroom/miniconda/base/envs/Shook/bin/python')

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def send_message(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + '\n')
    sys.stdout.flush()


def send_response(request_id: str, ok: bool, result: Any = None, error: str | None = None) -> None:
    payload: dict[str, Any] = {
        'type': 'response',
        'id': request_id,
        'ok': ok,
    }
    if ok:
        payload['result'] = result if result is not None else {}
    else:
        payload['error'] = error or 'Unknown worker error'
    send_message(payload)


def get_tool_registry():
    from langgraph.tools.registry import get_default_registry

    return get_default_registry()


def load_runway_projects() -> list[dict[str, str]]:
    config_path = PROJECT_ROOT / 'runway_projects.json'
    if not config_path.exists():
        return []

    try:
        data = json.loads(config_path.read_text(encoding='utf-8'))
    except Exception:
        return []

    if not isinstance(data, list):
        return []

    projects: list[dict[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        name = item.get('name')
        path = item.get('path')
        if isinstance(name, str) and isinstance(path, str):
            projects.append({'name': name, 'path': path})
    return projects


def resolve_predict_btc_python() -> str:
    configured = os.getenv('SHOOK_PREDICT_BTC_PYTHON')
    if configured:
        return configured
    if LEGACY_PREDICT_BTC_PYTHON.exists():
        return str(LEGACY_PREDICT_BTC_PYTHON)
    return sys.executable


def build_builtin_command(command: str, args: list[str]) -> list[str]:
    if command == 'predict_btc':
        return [resolve_predict_btc_python(), str(PROJECT_ROOT / 'scripts' / 'btc_predictor' / 'main.py'), *args]
    if command == 'Runway':
        return [sys.executable, str(PROJECT_ROOT / 'scripts' / 'runway.py'), *args]
    raise ValueError(f'Unknown builtin command: {command}')


def forward_pipe(request_id: str, stream_name: str, pipe: TextIO) -> None:
    try:
        for raw_line in iter(pipe.readline, ''):
            line = raw_line.rstrip('\r\n')
            send_message({
                'type': 'stream',
                'id': request_id,
                'stream': stream_name,
                'line': line,
            })
    finally:
        pipe.close()


def run_process(request_id: str, command: list[str]) -> dict[str, Any]:
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'

    process = subprocess.Popen(
        command,
        cwd=PROJECT_ROOT,
        env=env,
        text=True,
        bufsize=1,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    threads: list[threading.Thread] = []
    for stream_name, pipe in (('stdout', process.stdout), ('stderr', process.stderr)):
        if pipe is None:
            continue
        thread = threading.Thread(target=forward_pipe, args=(request_id, stream_name, pipe), daemon=True)
        thread.start()
        threads.append(thread)

    exit_code = process.wait()
    for thread in threads:
        thread.join()

    return {'exitCode': exit_code}


def handle_handshake(request_id: str) -> None:
    send_response(
        request_id,
        True,
        {
            'projectRoot': str(PROJECT_ROOT),
            'commands': ['getNews', 'predict_btc', 'Runway', 'help', 'exit'],
            'runwayProjects': load_runway_projects(),
            'pythonExecutable': sys.executable,
            'workerScript': str(Path(__file__).resolve()),
        },
    )


def handle_run_builtin(request_id: str, params: dict[str, Any]) -> None:
    command = params.get('command')
    args = params.get('args', [])

    if not isinstance(command, str):
        raise ValueError('Missing builtin command name')
    if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
        raise ValueError('Builtin command args must be a string array')

    result = run_process(request_id, build_builtin_command(command, args))
    if command == 'Runway':
        result['runwayProjects'] = load_runway_projects()
    send_response(request_id, True, result)


def handle_run_shell(request_id: str, params: dict[str, Any]) -> None:
    command_line = params.get('commandLine')
    if not isinstance(command_line, str) or not command_line.strip():
        raise ValueError('commandLine is required')

    result = run_process(request_id, ['/bin/zsh', '-i', '-c', command_line])
    send_response(request_id, True, result)


def handle_list_tools(request_id: str) -> None:
    registry = get_tool_registry()
    tools: list[dict[str, Any]] = []
    for tool in registry:
        schema = tool.get_schema()
        tools.append(
            {
                'name': schema.name,
                'description': schema.description,
                'input_schema': schema.input_schema,
            }
        )
    send_response(request_id, True, tools)


def handle_call_tool(request_id: str, params: dict[str, Any]) -> None:
    tool_name = params.get('tool')
    arguments = params.get('arguments', {})
    if not isinstance(tool_name, str) or not tool_name:
        raise ValueError('tool is required')
    if not isinstance(arguments, dict):
        raise ValueError('arguments must be an object')

    registry = get_tool_registry()
    tool = registry.get(tool_name)
    if tool is None:
        raise ValueError(f'Tool not found: {tool_name}')

    result = tool.execute(**arguments)
    send_response(request_id, True, result.to_dict())


def main() -> int:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        request: dict[str, Any] | None = None
        request_id = 'unknown'

        try:
            request = json.loads(line)
            request_id = request['id']
            method = request['method']
            params = request.get('params', {})

            if not isinstance(request_id, str):
                raise ValueError('Request id must be a string')
            if not isinstance(method, str):
                raise ValueError('Request method must be a string')
            if not isinstance(params, dict):
                raise ValueError('Request params must be an object')

            if method == 'handshake':
                handle_handshake(request_id)
                continue
            if method == 'run_builtin':
                handle_run_builtin(request_id, params)
                continue
            if method == 'run_shell':
                handle_run_shell(request_id, params)
                continue
            if method == 'list_tools':
                handle_list_tools(request_id)
                continue
            if method == 'call_tool':
                handle_call_tool(request_id, params)
                continue
            if method == 'shutdown':
                send_response(request_id, True, {'status': 'bye'})
                return 0

            raise ValueError(f'Unknown method: {method}')
        except Exception as error:
            if request and isinstance(request.get('id'), str):
                request_id = request['id']
            send_response(request_id, False, error=str(error))

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
