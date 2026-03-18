## Context

Jarvis Dashboard는 Next.js 16 기반 단일 페이지 대시보드로, `~/.claude/orchestrator/state/`에서 JSONL/JSON 파일을 읽어 SSE로 프론트엔드에 실시간 전송한다. 현재 884줄 규모이며, 4개 패널(API Usage, Teams, Commits, Skills)로 구성되어 있다.

주요 데이터 소스:
- `openai-usage.jsonl`, `gemini-usage.jsonl`, `tripo3d-usage.jsonl` → API 비용
- `pipeline.json` + `agents/*.pid` → 팀 상태
- `timeline.jsonl` → 커밋 로그
- `skill-usage.jsonl` → 스킬 사용량
- `teams.json` → 팀 정의

설정은 `dashboard.config.json`에 일부 분리되어 있으나, `pricing.ts`의 모델 가격, 데이터 파싱 로직은 하드코딩 상태.

## Goals / Non-Goals

**Goals:**
- 다른 사용자가 `npx jarvis-dashboard`로 자기 환경에 맞는 대시보드를 즉시 실행
- Settings 탭에서 에이전트/스킬/환경/설정의 수정일 + 상태를 한눈에 파악
- orchestrator가 없는 사용자도 graceful하게 사용 가능 (있는 패널만 표시)
- 기존 DD 환경에서의 동작은 100% 유지 (regression 없음)

**Non-Goals:**
- 원격 서버 배포 / 클라우드 호스팅 (로컬 전용)
- 사용자 인증/멀티유저 지원
- 대시보드 커스텀 테마/스킨
- orchestrator 시스템 자체의 배포 (대시보드만 배포)
- 모바일 반응형 (데스크톱 전용 유지)

## Decisions

### 1. 탭 구현: Next.js App Router + Client State (URL 파라미터 불필요)

클라이언트 사이드 탭 전환으로 구현. `useState`로 활성 탭을 관리하고, SSE 연결은 유지한 채 렌더링만 전환한다.

**대안 고려:**
- App Router 별도 route (`/settings`) → SSE 재연결 필요, 불필요한 복잡성
- URL search params (`?tab=settings`) → 대시보드 특성상 딥링크 불필요

**선택 이유:** SSE 연결을 끊지 않고 탭만 전환하는 것이 UX 최적. 단일 페이지 상태 유지.

### 2. 환경 탐지: 서버사이드 스캔 + 캐시

서버 시작 시 `~/.claude/` 하위를 스캔하여 환경 프로파일을 생성한다:
```
{
  hasOrchestrator: boolean,
  hasSkillRouter: boolean,
  hasClaude MD: boolean,
  paths: { orchestrator?, skills?, settings? }
}
```

**대안 고려:**
- 매 SSE 사이클마다 스캔 → 파일 I/O 과다
- 환경변수로 모든 경로 지정 → 사용자 부담 과중

**선택 이유:** 시작 시 1회 스캔 + `fs.watch`로 변경 감지. 자동이면서 부하 없음.

### 3. Settings 탭 데이터: 별도 API 엔드포인트 `/api/environment`

SSE 스트림에 합치지 않고 별도 REST 엔드포인트로 분리. Settings 탭 진입 시 1회 fetch + 수동 새로고침.

**대안 고려:**
- SSE에 environment 데이터 포함 → 5초마다 불필요한 `fs.stat` 호출
- SSE 별도 채널 → 복잡성 대비 이점 없음

**선택 이유:** 파일 수정일은 실시간성이 불필요. 탭 전환 시 fetch가 적절.

### 4. npx 배포: Next.js standalone + bin wrapper

`next build`의 standalone output을 활용하고, `bin/jarvis-dashboard.js` 엔트리포인트에서:
1. `~/.claude/` 존재 여부 확인
2. 기본 `dashboard.config.json` 생성 (없으면)
3. `next start` 실행

**대안 고려:**
- Docker 이미지 → 진입장벽 높음
- Electron 앱 → 과한 오버엔지니어링

**선택 이유:** npm 생태계 내에서 가장 간단한 배포 경로.

### 5. 가격 설정: `pricing.json` 외부 파일 + 환경변수 오버라이드

`pricing.ts` 하드코딩을 `pricing.json` 파일로 분리하고, 환경변수 `JARVIS_PRICING_PATH`로 커스텀 경로 지정 가능.

**선택 이유:** 모델 가격은 자주 바뀌므로 코드 수정 없이 업데이트 가능해야 함.

## Risks / Trade-offs

- **[환경 다양성]** 사용자마다 `~/.claude/` 구조가 다를 수 있음 → 탐지 로직에 fallback 계층 추가, 최소 요구사항은 `~/.claude/` 디렉토리 존재만
- **[Next.js standalone 크기]** standalone 빌드가 무거울 수 있음 → `output: 'standalone'` 설정으로 최소화, node_modules 트리쉐이킹
- **[Breaking change 없음]** 기존 DD 환경에서 동작이 바뀌면 안 됨 → 자동 탐지 결과가 기존 config와 같으면 config 우선
- **[npx 첫 실행 속도]** Next.js 빌드 포함 시 느림 → pre-built 패키지로 배포, 빌드 단계 없이 즉시 실행

## Migration Plan

1. 기존 `dashboard.config.json` 호환 유지 — 새 필드 추가만, 기존 필드 삭제 없음
2. `pricing.ts` → `pricing.json` 전환 시 기존 하드코딩 값을 기본값으로 유지
3. npm publish 전 DD 환경에서 `npx .` 로컬 테스트
4. README에 quick start 가이드 작성

## Open Questions

- npm 패키지 이름: `jarvis-dashboard` vs `claude-dashboard` vs `ai-orchestrator-dashboard`
- 라이선스: MIT vs Apache 2.0
- Anthropic 브랜딩/상표 사용 가능 여부 (Claude 이름 포함 시)
