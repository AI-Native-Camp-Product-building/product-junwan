@AGENTS.md

# AdInsight — 프로젝트 인수인계 문서

## 프로젝트 개요

내부 브랜드 기획자를 위한 **마케팅 성과 대시보드 도구(AdInsight)** 소개용 랜딩 페이지.
10개국에 산발된 광고 성과 데이터를 자동 취합하고, 시각화하며, AI 인사이트를 제공하는 도구.

## 현재 상태

### 완료된 작업

- [x] Next.js 15 + shadcn/ui + Tailwind CSS v4 프로젝트 초기화
- [x] shadcn neutral dark 테마 적용 (사용자 제공 HSL 변수)
- [x] Pretendard 폰트 적용 (`layout.tsx`의 `<link>` 태그)
- [x] Config 파라미터화 (`src/config/` — countries, metrics, dashboard, content)
- [x] 샘플 데이터 (`src/data/sample.ts` — 3개국 × 6개월 × 2-3매체)
- [x] 랜딩 페이지 전체 구현 (네비 → 히어로 → 필터 → KPI → 차트3종 → 테이블 → 인사이트 → 푸터)
- [x] shadcn 스킬 설치 (`.agents/skills/shadcn`)
- [x] Vercel React Best Practices 스킬 설치
- [x] Google Sheets 스킬 설치 (`gws-sheets`)
- [x] Service Account JSON 배치 (`credentials/service-account.json`)
- [x] 시트 URL 목록 작성 (`credentials/sheets.json` — 9개 시트)

### 진행 중 (다음 단계)

- [ ] **Google Sheets API 연동** — 샘플 데이터 → 실제 시트 데이터로 전환
  - 방식: Next.js API Route 프록시 (`/api/sheets`)
  - 인증: Service Account (`credentials/service-account.json`)
  - 시트 목록: `credentials/sheets.json`에 9개 시트 등록 완료
  - **중요**: 각 시트에서 서비스 계정 이메일을 뷰어로 공유해야 함
    - `pat-n8n@gen-lang-client-0537880120.iam.gserviceaccount.com`

### 알려진 이슈

- 차트 컬러: HSL 변수 → `hsl()` 래핑 필요 (수정 완료, `hsl(var(--chart-N))` 형태)
- CSS `@import` 순서: Pretendard CDN을 `globals.css`의 `@import`로 넣으면 PostCSS 빌드 에러 → `layout.tsx`의 `<link>` 태그로 해결
- shadcn v4가 `@base-ui/react` 사용 (Radix가 아님) → `Button asChild` 대신 `buttonVariants()` 사용

## 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16.2.2 (App Router) | Turbopack |
| UI | shadcn/ui (base-ui) | Card, Chart, Select, Table, Badge, Button |
| 차트 | Recharts (via shadcn charts) | Area, Bar, Radial |
| 스타일 | Tailwind CSS v4 | shadcn 테마 시스템 |
| 폰트 | Pretendard Variable | CDN, `<link>` 태그 |
| 언어 | TypeScript | strict |

## 파일 구조

```
D:/code/project-junwan/
├── credentials/
│   ├── service-account.json    # GCP Service Account 키 (git 제외)
│   └── sheets.json             # 구글 시트 URL 목록 (git 제외)
├── docs/superpowers/
│   ├── specs/
│   │   └── 2026-04-01-adinsight-landing-design.md   # 디자인 스펙
│   └── plans/
│       └── 2026-04-01-adinsight-landing.md           # 구현 계획
├── src/
│   ├── app/
│   │   ├── layout.tsx          # RootLayout: dark class, Pretendard <link>
│   │   ├── page.tsx            # 랜딩 페이지 (Nav + Hero + Demo + Footer)
│   │   └── globals.css         # shadcn neutral 테마 (HSL), Tailwind v4
│   ├── components/
│   │   ├── ui/                 # shadcn 컴포넌트 (자동 생성)
│   │   ├── nav.tsx             # 네비게이션 바
│   │   ├── hero.tsx            # 히어로 섹션 (중앙 정렬 + 수치)
│   │   ├── demo-section.tsx    # 인터랙티브 데모 컨테이너 ("use client", 필터 상태)
│   │   ├── filter-bar.tsx      # 국가/기간/매체 Select 3개
│   │   ├── kpi-cards.tsx       # KPI 카드 4개 (광고비/결제금액/ROAS/회원가입)
│   │   ├── area-chart.tsx      # ROAS 추이 Area Chart (곡선 + 그라데이션)
│   │   ├── bar-chart.tsx       # 매체별 Bar Chart (탭 전환)
│   │   ├── radial-chart.tsx    # 목표 달성률 Radial Chart
│   │   ├── data-table.tsx      # 국가별 상세 데이터 Table
│   │   ├── insights-card.tsx   # AI 인사이트 Card
│   │   └── footer.tsx          # 푸터 (데모버전 안내)
│   ├── config/
│   │   ├── countries.ts        # Country 타입 + 3개국 (KR, JP, US)
│   │   ├── metrics.ts          # Metric 타입 + 9개 지표 정의
│   │   ├── dashboard.ts        # KPI/차트/테이블 레이아웃 설정
│   │   └── content.ts          # 히어로 카피, 푸터 텍스트, 통계 수치
│   ├── data/
│   │   └── sample.ts           # 샘플 데이터 36행 + getMonths(), getMediums()
│   └── lib/
│       ├── utils.ts            # shadcn cn() 유틸
│       ├── format.ts           # 통화/퍼센트/숫자/변화율 포맷
│       └── insights.ts         # 규칙 기반 인사이트 생성 로직
└── .agents/skills/             # 설치된 스킬
    ├── shadcn/                 # shadcn 컴포넌트 관리 + 스타일 규칙
    ├── vercel-react-best-practices/  # React/Next.js 최적화 68규칙
    ├── gws-sheets/             # Google Sheets API 스킬
    └── find-skills/            # 스킬 검색
```

## shadcn 스타일 규칙 (필수 준수)

- `space-y-*` / `space-x-*` 금지 → `flex gap-*` 또는 `grid gap-*`
- raw color (`bg-blue-500`) 금지 → semantic tokens (`bg-primary`, `text-muted-foreground`)
- `dark:` 수동 오버라이드 금지 → CSS 변수가 자동 처리
- 차트 컬러는 `hsl(var(--chart-1))` ~ `hsl(var(--chart-5))` 사용
- Card는 full composition (`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`)
- Chart는 `Card > CardHeader > CardContent > ChartContainer` 구조 필수

## 구글 시트 연동 (다음 작업)

### 등록된 시트 (credentials/sheets.json)

| name | 시트 ID |
|------|---------|
| 레진 KR | `1HMyzye86YxhgdZ0bG1vYHb7QeJBi-oI_CGYacxXh2hE` |
| 봄툰 KR | `1rr45aW4SP3Dqwd6grMVpDZohNw0RXfXtjWbfKXEUouU` |
| US | `1xGGd_TY6iFCiyqEoVwMrYzACfpcBMSc8hnBd_qN6vjg` |
| DE | `1eUMAADMhoRt5eZBq4iyIElgDTGxiPW9LFqyNl0VJ0t0` |
| FR | `1lirrJfP6duAPJB36-ybXR4_tLTFJwPylg6SwdAizc2w` |
| TH | `1CCisdkklYhSFRhEe1HvN-j9U6bWHAINqyEcP1hfnK0U` |
| TW | `1zH-WAZyx_DGs9_8KykiVHWN-BCNvmODuTP_ean4cGdc` |
| ES | `1V_EpN-LfmKNnIuxJfRf8MJz304uZch4L27D-HCHezbw` |
| 종합 | `1sejHVZBYOHyPsPVHODvchgJwt4TBYESWwd5CPV3B75s` |

### 서비스 계정 이메일 (시트 공유 필요)

```
pat-n8n@gen-lang-client-0537880120.iam.gserviceaccount.com
```

### 연동 구현 계획

1. `googleapis` npm 패키지 설치
2. `src/lib/sheets.ts` — Google Sheets API 클라이언트 (Service Account 인증)
3. `src/app/api/sheets/route.ts` — API Route (서버사이드에서 시트 fetch → JSON)
4. `demo-section.tsx` — 샘플 데이터 대신 API Route에서 실시간 데이터 fetch
5. **선행 작업**: 각 시트에 서비스 계정 이메일을 뷰어로 공유

### 데이터 컬럼 (스펙 기준)

월별, 일자, 매체, 목표, 소재종류, 소재(작품명), 광고비, 원화(외화일경우), 노출수, 클릭, CTR, 회원가입, 가입CPA, 결제전환, 결제금액, ROAS

## 실행 명령

```bash
cd D:/code/project-junwan
npm run dev          # http://localhost:1004
npm run build        # 프로덕션 빌드
```

## Git 이력

```
e1a4071 feat: add AI insights card
d89157f feat: add data table with country aggregation
dd2fe4e feat: add area, bar, and radial charts
5e57cf0 feat: add KPI cards with change rate badges
3fbe095 feat: add filter bar, demo section container, and insights logic
d090b16 fix: use buttonVariants for hero CTA anchor (base-ui compat)
6f66de5 feat: add nav, hero, and footer sections
2b053d5 feat: add config parameters and sample data
037f8bd chore: init Next.js + shadcn/ui with neutral dark theme and Pretendard
```
