## Why

ur-dashboard는 현재 읽기 전용 모니터링 도구다. 사용자가 에이전트/팀 현황을 보고도 대시보드 내에서 작업을 지시할 수 없어서, 별도 터미널을 열어 `claude` CLI를 직접 실행해야 한다. 대시보드에서 직접 에이전트를 실행할 수 있으면 모니터링+실행이 통합된 "Claude Code Team Console"이 된다.

## What Changes

- Settings 탭에 Team Configuration 섹션 추가 — 자동 스캔된 에이전트 목록을 팀으로 그룹화/편집/저장
- Teams 패널에 Dispatch 버튼 추가 — 팀/에이전트 선택 + 자연어 작업 입력 UI
- `/api/dispatch` POST 엔드포인트 — `claude -p --agent <name> --output-format stream-json` 실행
- `/api/dispatch/[jobId]` GET 엔드포인트 — 실행 중인 작업의 stdout/stderr SSE 스트리밍
- `/api/teams-config` GET/POST 엔드포인트 — `~/.claude/agents/teams.json` 읽기/쓰기
- CLI capability detection — `claude` 명령어 존재 여부 확인, 없으면 dispatch UI 비활성화
- 작업 히스토리 — 실행한 작업 목록 (in-memory, 세션 내)

## Capabilities

### New Capabilities
- `team-config`: Settings 탭에서 에이전트를 팀으로 그룹화/편집/저장하는 기능
- `agent-dispatch`: 대시보드 UI에서 에이전트를 선택하고 자연어 작업을 실행하는 기능
- `dispatch-streaming`: 실행 중인 에이전트의 출력을 실시간 SSE로 스트리밍하는 기능
- `cli-capability-detection`: claude CLI 설치 여부를 감지하여 dispatch 기능 활성/비활성화

### Modified Capabilities

## Impact

- `lib/` — 새 모듈: `job-manager.ts` (프로세스 관리), `cli-detector.ts` (CLI 감지)
- `app/api/` — 새 라우트: `dispatch/`, `teams-config/`
- `components/panels/` — `TeamStatusPanel.tsx` 수정 (dispatch 버튼), `SettingsView.tsx` 수정 (team config)
- `lib/types.ts` — `DispatchJob`, `TeamConfig` 타입 추가
- 외부 의존성 없음 — Node.js `child_process.spawn` 사용
- 보안: 사용자 입력이 CLI 인자로 전달되므로 `spawn(file, args, {shell: false})` 강제
