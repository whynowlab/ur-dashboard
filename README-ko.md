<p align="right">
  <a href="README.md">English</a> · <a href="README-ko.md">한국어</a>
</p>

<div align="center">
  <img src="public/icon.svg" width="64" height="64" alt="ur-dashboard" />
  <h1>ur-dashboard</h1>
  <p><strong>Claude Code AI 에이전트를 위한 실시간 모니터링 대시보드</strong><br/>
  <em>당신의 AI 에이전트, 한눈에. 명령어 하나로.</em></p>
  <p>
    <a href="https://www.npmjs.com/package/ur-dashboard">
      <img src="https://img.shields.io/npm/v/ur-dashboard?style=flat-square&label=npm&color=6366f1" alt="npm version" />
    </a>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square" alt="macOS and Windows" />
  </p>
</div>

<p align="center">
  <img src="docs/assets/hero-dashboard.png" alt="ur-dashboard - 에이전트 활동, 사용량 지표, 팀 패널, 스킬 추적" width="100%" style="max-width: 960px;" />
</p>

---

## 빠른 시작

```bash
npm install -g ur-dashboard
ur-dashboard
```

[http://localhost:3000](http://localhost:3000)을 열면 끝입니다.

```bash
# 설치 없이 바로 실행
npx ur-dashboard

# 옵션
ur-dashboard --port 8080              # 포트 변경
ur-dashboard --claude-home /path/to   # Claude 홈 디렉토리 지정
```

---

## 이런 분에게 추천합니다

- 여러 에이전트와 스킬을 관리하는 **Claude Code 파워 유저**
- AI 에이전트가 무엇을 하는지 한눈에 보고 싶은 **AI 개발자**
- 멀티 에이전트 워크플로를 운영하며 공유 모니터링이 필요한 **팀**
- OpenAI, Gemini 등 **API 비용을 실시간으로 추적**하고 싶은 분

## 왜 ur-dashboard인가?

- **설정이 필요 없습니다** — 명령어 하나면 바로 시작
- **한 화면에 모든 것** — 에이전트, 비용, 스킬, 커밋을 한눈에
- **에이전트를 팀으로 구성** — 그룹화하고 저장
- **실시간 스트리밍** — 항상 최신 데이터, 새로고침 불필요
- **어디서든 동작** — macOS, Windows, 오케스트레이터 유무 무관

---

## 주요 기능

- Claude Code 에이전트 활동을 실시간으로 확인
- API 사용량과 비용을 한눈에 추적
- 멀티 에이전트 환경의 팀/스킬 그룹화
- 설정 없이 바로 시작 — 어떤 Claude Code 환경에서든 동작
- 프로그래밍 방식의 에이전트 실행을 위한 내장 Dispatch API

### Dashboard 탭

| 패널 | 설명 |
|------|------|
| **API Usage** | OpenAI, Gemini, Tripo3D 비용 추적 |
| **Teams / Agents** | 팀 또는 자동 감지된 에이전트 그룹 모니터링 |
| **Skill Usage** | 스킬 호출 빈도 및 최근 사용 추적 |
| **Recent Commits** | 타임라인 데이터 기반 Git 커밋 |
| **Components** | `~/.claude/` 디렉토리 구조 시각화 |
| **Recent Activity** | 환경 내 최근 수정 파일 |

### Settings 탭

| 섹션 | 설명 |
|------|------|
| **Team Configuration** | 에이전트-팀 그룹 편집, 팀 생성, 재스캔 |
| **Discovered Components** | 스캔된 디렉토리 및 파일 수 |
| **Config Files** | 설정 파일 및 마지막 수정 날짜 |
| **Runtime** | Node.js 버전, 플랫폼, 대시보드 버전 |

모든 섹션은 접기/펼치기 가능합니다.

---

## 작동 방식

1. `~/.claude/`를 **스캔**하여 환경을 자동 감지
2. SSE를 통해 5초마다 데이터를 **스트리밍** — 폴링 불필요
3. 사용 가능한 데이터에 따라 패널을 **자동 조정**
4. 팀 구성을 `~/.claude/agents/teams.json`에 **저장**

**macOS**와 **Windows** 모두 지원. 커스텀 오케스트레이터 유무와 관계없이 동작합니다.

---

## 경쟁 비교

| 도구 | 무설정 | Claude Code 전용 | 오픈소스 | `npx` 설치 |
|------|:------:|:----------------:|:--------:|:----------:|
| Langfuse | ❌ | ❌ | ✅ | ❌ |
| Helicone | ❌ | ❌ | ❌ | ❌ |
| LangSmith | ❌ | ❌ | ❌ | ❌ |
| **ur-dashboard** | **✅** | **✅** | **✅** | **✅** |

---

## 설정

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CLAUDE_HOME` | `~/.claude` | Claude 데이터 디렉토리 |
| `JARVIS_PRICING_PATH` | 내장 기본값 | 커스텀 가격 설정 파일 경로 |

<details>
<summary><strong>고급 설정</strong></summary>

### dashboard.config.json

```json
{
  "refresh_interval": 5000,
  "data_path": "~/.claude/orchestrator/state",
  "teams_path": "~/.claude/orchestrator/agents/teams.json",
  "port": 3000
}
```

### pricing.json

```json
{
  "models": {
    "gpt-5.4": [2.5, 15.0],
    "claude-sonnet-4-6": [3.0, 15.0]
  },
  "tripo_price_per_task": 0.3,
  "default_price": [1.0, 3.0]
}
```

</details>

---

## Dispatch API

<details>
<summary><strong>프로그래밍 방식 에이전트 실행</strong></summary>

```bash
# 에이전트 실행
curl -X POST http://localhost:3000/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{"agent": "my-agent", "prompt": "작업 수행", "permissionMode": "plan"}'

# 출력 스트리밍
curl -N http://localhost:3000/api/dispatch/{jobId}/stream

# 취소
curl -X DELETE http://localhost:3000/api/dispatch/{jobId}
```

`claude` CLI가 PATH에 있어야 합니다. 최대 3개 동시 실행. 기본 타임아웃: 300초.

</details>

---

## 기술 스택

- **Next.js 16** — App Router, Standalone
- **React 19** — Server & Client 컴포넌트
- **Tailwind CSS 4** — Glassmorphism UI
- **Recharts** — 비용 시각화
- **SSE** — 실시간 스트리밍

## 개발

```bash
git clone https://github.com/whynowlab/ur-dashboard.git
cd ur-dashboard
npm install
npm run dev
```

## 라이선스

[MIT](LICENSE) — 자유롭게 사용, 수정, 배포할 수 있습니다.
