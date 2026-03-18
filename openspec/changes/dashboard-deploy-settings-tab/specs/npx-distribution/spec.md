## ADDED Requirements

### Requirement: npx executable entry point
패키지는 `npx jarvis-dashboard` 명령으로 즉시 실행 가능해야 한다(SHALL). 별도 빌드 단계 없이 pre-built 상태로 배포한다.

#### Scenario: npx로 첫 실행
- **WHEN** 사용자가 `npx jarvis-dashboard`를 실행할 때
- **THEN** `~/.claude/` 환경을 스캔하고, 기본 config를 생성(없으면)한 뒤, 대시보드 서버를 시작한다

#### Scenario: 포트 지정 실행
- **WHEN** `npx jarvis-dashboard --port 8080`으로 실행할 때
- **THEN** 포트 8080에서 서버가 시작된다

#### Scenario: 커스텀 경로 지정 실행
- **WHEN** `npx jarvis-dashboard --claude-home /custom/path`로 실행할 때
- **THEN** `/custom/path/`를 기준으로 환경을 스캔하고 대시보드를 시작한다

### Requirement: Zero-config bootstrap
사용자 환경에 `dashboard.config.json`이 없어도 합리적인 기본값으로 시작해야 한다(SHALL).

#### Scenario: Config 파일 없이 실행
- **WHEN** 현재 디렉토리와 `~/.claude/`에 `dashboard.config.json`이 없을 때
- **THEN** 기본값(`port: 3000`, `refresh_interval: 5000`, 자동 탐지 경로)으로 서버를 시작한다

#### Scenario: 자동 탐지된 경로 사용
- **WHEN** config 파일이 없고 `~/.claude/orchestrator/state/`가 존재할 때
- **THEN** 해당 경로를 자동으로 `data_path`로 사용한다

### Requirement: Package metadata for npm publish
`package.json`에 npm 배포에 필요한 메타데이터가 포함되어야 한다(SHALL).

#### Scenario: bin 필드 설정
- **WHEN** 패키지가 설치될 때
- **THEN** `jarvis-dashboard` 명령이 PATH에 등록되어 CLI로 실행 가능하다

#### Scenario: files 필드로 배포 크기 최소화
- **WHEN** npm publish될 때
- **THEN** 빌드 결과물, bin, config 템플릿만 포함되고 소스/테스트는 제외된다
