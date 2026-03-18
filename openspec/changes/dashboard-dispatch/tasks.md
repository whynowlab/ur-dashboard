## 1. CLI Detection + Types

- [x] 1.1 `lib/cli-detector.ts` 생성 — `which claude`/`where claude` 실행, 버전 파싱, 결과 캐시
- [x] 1.2 `lib/types.ts`에 `DispatchJob`, `TeamConfig`, `Capabilities` 타입 추가
- [x] 1.3 `app/api/stream/route.ts`에 `capabilities: { canDispatch, cliVersion }` 필드 추가

## 2. Job Manager

- [x] 2.1 `lib/job-manager.ts` 생성 — `Map<string, DispatchJob>`, spawn/cancel/timeout/cleanup 로직
- [x] 2.2 spawn 시 `child_process.spawn('claude', args, {shell: false})` 강제, 프롬프트를 단일 인자로 전달
- [x] 2.3 timeout (기본 300초) + SIGTERM→SIGKILL 체인 구현
- [x] 2.4 `process.on('exit')` / `process.on('SIGINT')` 에서 모든 활성 프로세스 cleanup
- [x] 2.5 동시 실행 제한 (기본 max 3)

## 3. Dispatch API

- [x] 3.1 `app/api/dispatch/route.ts` — POST (작업 실행) + GET (작업 목록)
- [x] 3.2 `app/api/dispatch/[jobId]/route.ts` — DELETE (작업 취소)
- [x] 3.3 `app/api/dispatch/[jobId]/stream/route.ts` — GET SSE (실시간 출력 스트리밍)

## 4. Team Config API

- [x] 4.1 `app/api/teams-config/route.ts` — GET (읽기: teams.json 또는 auto-detect fallback) + POST (저장)
- [x] 4.2 `lib/agent-scanner.ts` 수정 — `teams.json` 존재 시 해당 파일 기준으로 TeamStatus 반환
- [x] 4.3 `app/api/stream/route.ts` 수정 — teams 로딩에 teams.json 우선 적용

## 5. Dispatch UI

- [x] 5.1 `components/panels/DispatchPanel.tsx` 생성 — 에이전트 선택 + 프롬프트 입력 + 실행 버튼 + 권한 모드 선택
- [x] 5.2 `components/panels/JobOutputView.tsx` 생성 — 터미널 스타일 실시간 출력 뷰 + 취소 버튼
- [x] 5.3 `components/panels/TeamStatusPanel.tsx` 수정 — canDispatch 시 팀/에이전트 카드에 Dispatch 버튼 추가, CLI 미설치 시 안내 배너

## 6. Team Config UI

- [x] 6.1 `components/panels/SettingsView.tsx`에 Team Configuration 섹션 추가 — 현재 팀 목록 표시, 에이전트 추가/제거/이동, Save 버튼
- [x] 6.2 auto-detect 상태일 때 "Teams auto-detected — Save to customize" 배너 표시

## 7. Dashboard Integration

- [x] 7.1 `app/page.tsx`에 dispatch 상태 관리 (activeJobId, showDispatch) + DispatchPanel/JobOutputView 연동
- [x] 7.2 `lib/types.ts`의 `DashboardData`에 `capabilities` 필드 추가

## 8. Cross-platform + Safety

- [x] 8.1 Windows `taskkill` fallback 구현 (SIGTERM 미지원 대응)
- [x] 8.2 프롬프트 인자 안전성 테스트 — shell 메타캐릭터가 literal로 전달되는지 확인
