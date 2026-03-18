## ADDED Requirements

### Requirement: Auto-detect Claude Code environment
시스템은 서버 시작 시 `~/.claude/` 하위 디렉토리를 스캔하여 환경 프로파일을 자동 생성해야 한다(SHALL). 스캔 대상: orchestrator, skills, settings, CLAUDE.md.

#### Scenario: Orchestrator가 있는 환경
- **WHEN** `~/.claude/orchestrator/` 디렉토리가 존재하고 `state/`, `agents/teams.json`이 있을 때
- **THEN** `hasOrchestrator: true`로 설정하고, `paths.orchestrator`에 해당 경로를 매핑한다

#### Scenario: Orchestrator가 없는 환경
- **WHEN** `~/.claude/orchestrator/` 디렉토리가 존재하지 않을 때
- **THEN** `hasOrchestrator: false`로 설정하고, orchestrator 의존 패널은 비활성화한다

#### Scenario: 부분적 환경 (스킬만 존재)
- **WHEN** `~/.claude/orchestrator/`는 없지만 스킬 관련 파일(`~/.claude/settings.json` 등)이 존재할 때
- **THEN** 존재하는 항목만 프로파일에 포함하고, 나머지는 `null`로 설정한다

### Requirement: Environment profile caching
시스템은 환경 프로파일을 서버 시작 시 1회 생성하고 메모리에 캐시해야 한다(SHALL). `/api/environment` 호출 시 캐시된 프로파일을 반환하되, 파일 수정일(`mtime`)은 호출 시점에 실시간 조회한다.

#### Scenario: 서버 시작 시 캐시 생성
- **WHEN** 서버가 시작될 때
- **THEN** `~/.claude/` 스캔 결과를 메모리에 캐시하고, 이후 API 호출은 캐시를 사용한다

#### Scenario: 파일 수정일은 실시간 조회
- **WHEN** `/api/environment` 가 호출될 때
- **THEN** 캐시된 경로 목록의 각 파일에 대해 `fs.stat`으로 현재 `mtime`을 조회하여 반환한다

### Requirement: Custom path override
사용자는 `dashboard.config.json` 또는 환경변수(`CLAUDE_HOME`)로 기본 탐지 경로를 오버라이드할 수 있어야 한다(SHALL).

#### Scenario: CLAUDE_HOME 환경변수 설정
- **WHEN** `CLAUDE_HOME=/custom/path`가 설정되어 있을 때
- **THEN** `~/.claude/` 대신 `/custom/path/`를 기준으로 환경을 스캔한다

#### Scenario: dashboard.config.json의 경로가 우선
- **WHEN** `dashboard.config.json`에 `data_path`가 명시되어 있을 때
- **THEN** 자동 탐지 결과보다 config 파일의 경로를 우선 사용한다
