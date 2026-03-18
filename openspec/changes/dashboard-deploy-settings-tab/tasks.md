## 1. 환경 자동 탐지 (env-auto-detect)

- [x] 1.1 `lib/env-detector.ts` 생성 — `~/.claude/` 스캔하여 EnvironmentProfile 반환 (hasOrchestrator, hasSkillRouter, paths 등)
- [x] 1.2 `CLAUDE_HOME` 환경변수 + `dashboard.config.json` 경로 오버라이드 지원
- [x] 1.3 서버 시작 시 1회 스캔 + 메모리 캐시, `/api/environment`에서 캐시 활용
- [x] 1.4 `/api/environment` 엔드포인트 생성 — 환경 프로파일 + 각 파일의 실시간 mtime 반환

## 2. 가격 설정 외부화

- [x] 2.1 `pricing.ts` 하드코딩 → `pricing.json` 파일로 분리, 기존 값을 기본값으로 유지
- [x] 2.2 `JARVIS_PRICING_PATH` 환경변수로 커스텀 경로 지원
- [x] 2.3 `pricing.json` 없으면 내장 기본값 fallback

## 3. Graceful Degradation

- [x] 3.1 `lib/data-reader.ts`에서 파일 미존재 시 빈 배열/null 반환 (에러 대신)
- [x] 3.2 각 패널 컴포넌트에 "Not configured" fallback UI 추가 (ApiUsage, Teams, Skills, Commits)
- [x] 3.3 Dashboard 헤더에 환경 배지 표시 (Full Setup / Minimal Setup / No Environment)

## 4. 탭 내비게이션

- [x] 4.1 `app/page.tsx`에 탭 상태(useState) + 탭 바 UI 추가 (Dashboard / Settings & Environment)
- [x] 4.2 탭 전환 시 SSE 연결 유지, 렌더링만 조건부 전환

## 5. Settings & Environment 탭

- [x] 5.1 `components/panels/SettingsView.tsx` 메인 컨테이너 생성
- [x] 5.2 Agents 섹션 — teams.json, pipeline.json, agent PIDs 파일 상태 + 수정일 카드
- [x] 5.3 Skills 섹션 — skill-router.md, skill-chains.md, skill-usage.jsonl 파일 상태 + 수정일 카드
- [x] 5.4 Environment 섹션 — CLAUDE.md, settings.json, orchestrator/ 디렉토리 상태 + 수정일 카드
- [x] 5.5 Config 섹션 — dashboard.config.json, pricing.json 상태 + Node/pnpm 버전 + 대시보드 버전
- [x] 5.6 Settings 탭 진입 시 `/api/environment` fetch + 수동 새로고침 버튼

## 6. Dashboard 탭 디테일 보강

- [x] 6.1 Dashboard 헤더에 환경 요약 배지 (감지된 구성요소 수 표시)
- [x] 6.2 SSE 스트림에 환경 프로파일 요약 포함 (hasOrchestrator, 활성 패널 수)

## 7. npx 배포 준비

- [x] 7.1 `bin/jarvis-dashboard.js` CLI 엔트리포인트 생성 (--port, --claude-home 옵션)
- [x] 7.2 `next.config.ts`에 `output: 'standalone'` 설정
- [x] 7.3 `package.json`에 `bin`, `files`, `description`, `keywords`, `repository` 필드 추가
- [x] 7.4 zero-config bootstrap — config 없으면 기본값 생성 후 서버 시작
- [x] 7.5 DD 환경에서 `npx .` 로컬 테스트로 regression 확인

## 8. 검증 및 마무리

- [x] 8.1 DD 환경에서 전체 기능 동작 확인 (기존 Dashboard + Settings 탭)
- [x] 8.2 orchestrator 없는 환경 시뮬레이션 테스트 (CLAUDE_HOME=/tmp/empty-claude)
- [x] 8.3 README.md 작성 — Quick Start, Configuration, Screenshots
