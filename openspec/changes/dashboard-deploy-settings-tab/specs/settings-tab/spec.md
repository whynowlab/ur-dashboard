## ADDED Requirements

### Requirement: Tab navigation between Dashboard and Settings
시스템은 Dashboard와 Settings & Environment 두 개의 탭을 제공해야 한다(SHALL). 탭 전환은 클라이언트 사이드에서 처리하며, SSE 연결을 유지한 채 렌더링만 전환한다.

#### Scenario: 기본 탭은 Dashboard
- **WHEN** 사용자가 대시보드에 접속할 때
- **THEN** Dashboard 탭이 활성 상태로 표시되고, 기존 4개 패널이 렌더링된다

#### Scenario: Settings 탭으로 전환
- **WHEN** 사용자가 Settings & Environment 탭을 클릭할 때
- **THEN** Dashboard 패널이 숨겨지고 Settings 뷰가 표시되며, SSE 연결은 유지된다

#### Scenario: Dashboard 탭으로 복귀
- **WHEN** Settings 탭에서 Dashboard 탭을 클릭할 때
- **THEN** SSE로 수신 중인 최신 데이터로 Dashboard가 즉시 렌더링된다

### Requirement: Settings page — Agents section
Settings 탭의 Agents 섹션은 에이전트/팀 관련 파일의 상태와 수정일을 표시해야 한다(SHALL).

#### Scenario: 팀 설정 파일 표시
- **WHEN** Settings 탭이 활성화되고 orchestrator가 감지된 환경일 때
- **THEN** `teams.json` 파일 경로, 마지막 수정일, 등록된 팀 수를 표시한다

#### Scenario: Pipeline 상태 파일 표시
- **WHEN** `pipeline.json`이 존재할 때
- **THEN** 파일 경로, 마지막 수정일, 현재 활성 파이프라인 수를 표시한다

#### Scenario: Active agent PIDs 표시
- **WHEN** `agents/` 디렉토리에 `.pid` 파일이 있을 때
- **THEN** 활성 에이전트 수와 마지막 PID 파일의 수정일을 표시한다

### Requirement: Settings page — Skills section
Settings 탭의 Skills 섹션은 스킬 관련 파일의 수정일과 상태를 표시해야 한다(SHALL).

#### Scenario: 스킬 라우터/체인 파일 표시
- **WHEN** `skill-router.md`, `skill-chains.md` 파일이 존재할 때
- **THEN** 각 파일의 경로와 마지막 수정일을 표시한다

#### Scenario: 스킬 사용 로그 표시
- **WHEN** `skill-usage.jsonl`이 존재할 때
- **THEN** 파일 크기, 마지막 수정일, 총 기록 수를 표시한다

### Requirement: Settings page — Environment section
Settings 탭의 Environment 섹션은 Claude Code 환경 설정 파일의 수정일을 표시해야 한다(SHALL).

#### Scenario: CLAUDE.md 표시
- **WHEN** 프로젝트 루트 또는 홈 디렉토리에 `CLAUDE.md`가 존재할 때
- **THEN** 파일 경로와 마지막 수정일을 표시한다

#### Scenario: settings.json 표시
- **WHEN** `~/.claude/settings.json`이 존재할 때
- **THEN** 파일 경로와 마지막 수정일을 표시한다

#### Scenario: orchestrator 디렉토리 표시
- **WHEN** `~/.claude/orchestrator/` 디렉토리가 존재할 때
- **THEN** 디렉토리 경로, 하위 파일 수, 가장 최근 수정일을 표시한다

### Requirement: Settings page — Config section
Settings 탭의 Config 섹션은 대시보드 자체 설정과 런타임 정보를 표시해야 한다(SHALL).

#### Scenario: 대시보드 설정 표시
- **WHEN** Settings 탭이 활성화될 때
- **THEN** `dashboard.config.json` 경로, 수정일, 현재 refresh interval을 표시한다

#### Scenario: 런타임 정보 표시
- **WHEN** Settings 탭이 활성화될 때
- **THEN** Node.js 버전, 패키지 매니저 버전, 대시보드 버전을 표시한다

#### Scenario: 가격 설정 표시
- **WHEN** 가격 설정 파일(pricing.json)이 존재할 때
- **THEN** 설정된 모델 수, 파일 경로, 마지막 수정일을 표시한다
