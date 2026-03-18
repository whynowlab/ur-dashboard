## Context

ur-dashboard(v0.2.7)는 Next.js 16 standalone 모드로 동작하는 npm 패키지다. 현재 SSE 기반 실시간 모니터링만 제공하고, `~/.claude/agents/` 스캔으로 에이전트 목록을 표시한다. `claude` CLI는 `-p --agent <name> --output-format stream-json` 플래그로 비대화형 에이전트 실행 + JSON 스트리밍을 네이티브 지원한다.

기존 코드베이스:
- `app/api/stream/route.ts` — SSE ReadableStream 패턴 확립
- `bin/ur-dashboard.js` — `child_process.spawn` 이미 사용 중
- `lib/agent-scanner.ts` — 에이전트 파일 파싱 + 팀 그룹화 로직
- `lib/types.ts` — TeamStatus, AgentMeta 등 타입 정의

## Goals / Non-Goals

**Goals:**
- 대시보드 UI에서 에이전트 선택 + 자연어 작업 입력 → 실행
- 실행 중인 작업의 stdout를 실시간 스트리밍
- Settings 탭에서 에이전트→팀 그룹화 편집/저장 (`~/.claude/agents/teams.json`)
- `claude` CLI 미설치 환경에서 dispatch UI 비활성화 + 안내
- 작업 취소(cancel), timeout, orphan process 정리

**Non-Goals:**
- 복수 에이전트 병렬 fan-out (Phase 2)
- 에이전트 간 의존성/파이프라인 실행
- 원격/멀티유저 서버 배포
- `--dangerously-skip-permissions` 기본 사용
- 작업 결과의 영구 저장 (디스크)

## Decisions

### 1. 프로세스 실행: `spawn(file, args, {shell: false})`
`exec`가 아닌 `spawn`으로 실행하여 shell injection을 원천 차단한다. 사용자 입력(프롬프트)은 `--` 뒤의 인자로만 전달하거나 stdin으로 pipe한다.

대안: `exec` + escaping → shell escaping은 OS별 차이가 크고 우회 가능성이 있어 `spawn`이 안전.

### 2. Job 관리: In-memory Map
`Map<string, DispatchJob>`으로 활성 작업을 관리한다. 서버 재시작 시 초기화되며, 디스크 영구 저장은 하지 않는다. 각 Job은 jobId(UUID), status, ChildProcess ref, 로그 버퍼를 포함한다.

대안: SQLite/파일 기반 → 이 단계에서는 over-engineering. 로컬 단일 사용자 도구이므로 in-memory로 충분.

### 3. 스트리밍: SSE per job
`GET /api/dispatch/[jobId]/stream` — 개별 작업의 stdout/stderr를 SSE로 스트리밍한다. 기존 `/api/stream` 패턴을 재사용하되, `request.signal.abort` 시 프로세스 kill까지 연결한다.

대안: WebSocket → Next.js App Router에서 WebSocket 지원이 제한적. SSE가 기존 패턴과 일치.

### 4. CLI 감지: startup 시 `which claude` / `where claude`
서버 시작 시 1회 감지하여 결과를 캐시. `/api/stream` 데이터에 `capabilities.canDispatch` 포함하여 UI에서 활성/비활성 결정.

### 5. 팀 설정 파일: `~/.claude/agents/teams.json`
orchestrator의 `teams.json`과 호환되는 간소화 형식:
```json
{
  "teams": {
    "engineering": {
      "description": "Engineering team",
      "agents": ["engineering-ai-engineer", "engineering-backend-architect", ...]
    }
  }
}
```
이 파일이 존재하면 prefix 자동 그룹화 대신 이 정의를 사용한다.

### 6. 권한 모드: 기본 `default`, 사용자 선택 가능
dispatch 시 `--permission-mode` 옵션을 UI에서 선택할 수 있게 하되, 기본값은 `default` (안전). `bypassPermissions`는 UI에서 경고 표시 후 선택 가능.

### 7. Timeout 및 정리
- 기본 timeout: 5분 (설정 가능)
- timeout 시 SIGTERM → 5초 후 SIGKILL
- 서버 종료 시 모든 활성 프로세스 cleanup (`process.on('exit')`)
- SSE 연결 끊김 시 프로세스는 계속 실행 (background 작업)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| CLI 권한 프롬프트로 프로세스 hang | timeout + SIGTERM/SIGKILL 체인 |
| Shell injection | `spawn(file, args, {shell:false})`, 프롬프트를 single argument로 전달 |
| Orphan process (서버 크래시) | `process.on('exit', cleanup)`, `process.on('SIGINT', cleanup)` |
| 대량 동시 실행으로 리소스 폭주 | 동시 실행 제한 (기본 max 3) |
| CLI 버전별 플래그 차이 | `claude --version` 체크 + 최소 버전 명시 |
| Windows 프로세스 시그널 차이 | `process.kill(pid)` 대신 `taskkill` fallback |
