## Why

Jarvis Dashboard는 현재 DD 개인 환경(`~/.claude/orchestrator/`)에 하드코딩되어 있어 다른 사용자가 사용할 수 없다. AI 에이전트 오케스트레이션 모니터링은 Claude Code 파워유저들에게 보편적 수요가 있으며, `npx jarvis-dashboard` 한 줄로 누구나 자신의 환경에 맞는 대시보드를 띄울 수 있도록 배포 준비가 필요하다.

또한 현재 단일 페이지 구성에서는 에이전트, 스킬, 환경 설정의 상세 정보(수정일, 파일 경로 등)를 확인할 수 없어, Settings & Environment 탭을 추가하여 운영 가시성을 높인다.

## What Changes

- **환경 자동 탐지**: `~/.claude/` 하위 구조를 스캔하여 orchestrator, 스킬, 설정 파일 유무를 자동 감지
- **Graceful degradation**: 데이터가 없는 패널은 "Not configured" 안내와 함께 스킵
- **탭 내비게이션 추가**: Dashboard(기존) ↔ Settings & Environment(신규) 2탭 구조
- **Settings & Environment 탭**: 에이전트/스킬/환경/설정 파일의 마지막 수정 날짜 + 상태 표시
- **npx 실행 지원**: `bin` entry point + zero-config 부트스트랩으로 글로벌 설치 없이 실행
- **가격 설정 외부화**: `pricing.ts` 하드코딩을 설정 파일/환경변수로 전환
- **Dashboard 탭 디테일 보강**: 1페이지에도 기본적인 환경 정보 요약 표시

## Capabilities

### New Capabilities
- `env-auto-detect`: 사용자 환경 자동 스캔 — `~/.claude/` 구조 탐지, orchestrator/스킬/설정 유무 판별, 경로 자동 매핑
- `settings-tab`: Settings & Environment 2페이지 탭 — 에이전트, 스킬, 환경, 설정 파일별 수정일/상태 카드 그리드
- `npx-distribution`: npx 배포 지원 — bin entry, zero-config bootstrap, package.json 배포 메타데이터
- `graceful-degradation`: 데이터 부재 시 패널별 fallback UI — "Not configured" 상태 안내, 설정 가이드 링크

### Modified Capabilities
<!-- 기존 스펙 없음 — 신규 프로젝트 -->

## Impact

- **Frontend**: `app/page.tsx` → 탭 라우팅 추가, 신규 Settings 페이지/컴포넌트 생성
- **Backend**: 신규 `/api/environment` 엔드포인트 (파일 수정일 + 환경 정보 수집)
- **Config**: `dashboard.config.json` 스키마 확장, `pricing.json` 신규 파일 분리
- **Package**: `package.json`에 `bin` 필드, `files` 필드, npm 배포 메타데이터 추가
- **Dependencies**: 추가 의존성 없음 (Node.js `fs.stat` + 기존 스택으로 충분)
