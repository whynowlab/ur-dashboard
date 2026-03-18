## ADDED Requirements

### Requirement: Panel-level graceful degradation
데이터 소스가 없는 패널은 에러 대신 안내 메시지를 표시해야 한다(SHALL).

#### Scenario: Orchestrator 없는 환경에서 Teams 패널
- **WHEN** orchestrator가 감지되지 않은 환경에서 Dashboard를 볼 때
- **THEN** Teams 패널은 "Orchestrator not configured" 메시지와 함께 설정 안내를 표시한다

#### Scenario: API 사용 데이터 없음
- **WHEN** usage JSONL 파일이 하나도 없을 때
- **THEN** API Usage 패널은 "No API usage data found" 메시지를 표시하고, 데이터 경로 설정 방법을 안내한다

#### Scenario: 스킬 데이터 없음
- **WHEN** `skill-usage.jsonl`이 없을 때
- **THEN** Skill Usage 패널은 "No skill usage recorded yet" 메시지를 표시한다

#### Scenario: 커밋 데이터 없음
- **WHEN** `timeline.jsonl`이 없을 때
- **THEN** Commit Log 패널은 "No commit history available" 메시지를 표시한다

### Requirement: Settings tab graceful degradation
Settings 탭의 각 섹션도 데이터 부재 시 적절한 fallback을 제공해야 한다(SHALL).

#### Scenario: 파일이 존재하지 않는 항목
- **WHEN** Settings에 표시할 파일이 존재하지 않을 때
- **THEN** 해당 항목은 "Not found" 상태와 함께 경로를 회색으로 표시한다

#### Scenario: 전체 섹션 데이터 없음
- **WHEN** 특정 섹션(예: Skills)의 모든 파일이 없을 때
- **THEN** 섹션 헤더는 유지하되, "No files detected" 메시지와 해당 기능 설명을 표시한다

### Requirement: Dashboard header environment indicator
Dashboard 헤더에 현재 감지된 환경 요약을 표시해야 한다(SHALL).

#### Scenario: Full environment 감지
- **WHEN** orchestrator, skills, settings 모두 감지되었을 때
- **THEN** 헤더에 "Full Setup" 배지를 표시한다

#### Scenario: Minimal environment 감지
- **WHEN** `~/.claude/` 디렉토리만 있고 orchestrator가 없을 때
- **THEN** 헤더에 "Minimal Setup" 배지를 표시한다

#### Scenario: 환경 미감지
- **WHEN** `~/.claude/` 디렉토리 자체가 없을 때
- **THEN** 헤더에 "No Claude environment detected" 경고를 표시한다
