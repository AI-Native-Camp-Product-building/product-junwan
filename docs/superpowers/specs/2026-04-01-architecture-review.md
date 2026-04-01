# AdInsight 아키텍처 통합 리뷰

> PM 통합 리뷰 | 2026-04-01
> 데이터 전문가 + 프론트엔드 개발자 + UI 디자이너 + 백엔드 개발자 결과물 종합

---

## 1. 산출물 요약

| 역할 | 산출물 | 위치 |
|------|--------|------|
| 데이터 전문가 | Supabase 스키마 SQL (6 테이블 + 2 뷰) | `supabase/schema.sql` |
| 프론트엔드 개발자 | 대시보드 컴포넌트 스펙 (9 컴포넌트) | `docs/superpowers/specs/2026-04-01-dashboard-component-spec.md` |
| UI 디자이너 | 글래스모피즘 UI 스펙 (레이아웃/색상/애니메이션) | 에이전트 출력 (본문 내 정리) |
| 백엔드 개발자 | API 라우트 + 동기화 파이프라인 설계 | `docs/superpowers/specs/2026-04-01-backend-architecture.md` |

---

## 2. 전체 데이터 흐름

```
[Google Sheets 8개국]
        │
        ▼ (POST /api/sync)
[sheets-parser.ts]  ←── 헤더 매핑 + 통화 정규화 + 월별 형식 통일
        │
        ▼
[Supabase: ad_raw]  ←── 원본 그대로 저장 (불변)
        │
        ▼ (LEFT JOIN)
[Supabase: ad_normalized 뷰]  ←── medium_map + goal_map + creative_type_map
        │
        ▼ (GET /api/dashboard)
[Next.js API Route]  ←── 필터 적용 (국가/기간/매체/목표)
        │
        ▼
[DashboardShell]  ←── useMemo로 KPI/차트/테이블 데이터 파생
        │
        ├── KpiCards (4개 요약)
        ├── RoasAreaChart (추이)
        ├── MediumBarChart (매체별)
        └── DataTable (상세)
```

---

## 3. 각 파트 리뷰

### 3.1 데이터 스키마 (데이터 전문가)

**강점:**
- raw 데이터 불변 원칙 철저 — `ad_raw`는 append-only, 정규화는 뷰에서만
- `sheet_source` 테이블로 시트 메타정보 관리 — 새 국가 추가 시 DDL 변경 불필요
- mapping 테이블 3종의 `raw_value → normalized` 구조가 심플하고 효과적
- `ad_normalized` 뷰의 월별 형식 정규화 regex가 정확
- RLS 정책이 적절 (anon read, service_role write)

**고도화 포인트:**
- [ ] `ad_raw`에 `date_raw::date` 캐스팅은 잘못된 날짜에서 뷰 쿼리 실패 가능 → `NULLIF` + `TRY` 처리 필요
- [ ] `sheet_sync_log.duration_ms`의 generated column에서 `*1000` 대신 정밀 밀리초 계산 필요
- [ ] 인덱스에 `(month_raw, sheet_source_id)` 복합 인덱스 추가 고려 (대시보드의 주요 쿼리 패턴)
- [ ] `roas_krw_computed` 필드가 %인지 배율인지 명시 필요 (원본 ROAS와 단위 통일)

### 3.2 프론트엔드 컴포넌트 (프론트엔드 개발자)

**강점:**
- Server Component(page.tsx) → Client Component(DashboardShell) 분리가 적절
- `DashboardShell`이 필터 상태를 단일 소유하고 하위로 전달 — 데이터 흐름 명확
- Multi-select를 Popover+Command+Checkbox로 설계 — shadcn Select의 한계 적절 우회
- 컬럼 가시성 토글이 있는 테이블 — 14컬럼 중 6개만 기본 표시, 사용자가 확장

**고도화 포인트:**
- [ ] 프론트엔드 스펙은 "No sidebar" vs UI 디자이너는 "Collapsible Sidebar" → **사이드바 채택 권장** (대시보드는 네비게이션이 필요)
- [ ] `useSWR` or `useTransition` 선택 미확정 → SWR 추천 (캐싱 + revalidation 내장)
- [ ] 테이블에 "요약/상세" 토글 있지만 집계 로직 미정의 → `dashboard-queries.ts`에서 GROUP BY 쿼리 추가 필요
- [ ] 작품명(creative_name) 필터 미설계 — 기획자가 "내 작품 성과"를 보고 싶을 때 필요

### 3.3 UI 디자인 (UI 디자이너)

**강점:**
- 랜딩 페이지와의 디자인 연속성 우수 — 동일한 glass 토큰 (`bg-white/[0.03]`, `border-white/[0.08]`)
- Cornflower Blue 스케일(50~900)이 체계적 — 차트/배지/포커스 등 용도별 매핑
- 반응형 와이어프레임 3단계 (Desktop/Tablet/Mobile) 상세 제공
- 진입 애니메이션 시퀀스가 구체적 (stagger 타이밍까지 명시)
- `.glass-card`, `.glass-select-trigger` 유틸리티 클래스 제안 — 재사용성 확보

**고도화 포인트:**
- [ ] 사이드바 glassmorphism에 `blur(24px)` — 성능 부담 가능. `blur(12px)` 권장
- [ ] KPI 카드 hover에 `translateY(-1px)` — 모바일에서 tap 시 어색할 수 있음, `@media (hover: hover)` 감싸기
- [ ] 다크모드 전용이라 `from-primary/5 to-card` 그래디언트가 미묘할 수 있음 — 실제 구현 후 미세 조정 필요
- [ ] AI Insights 카드의 블루 보더 (`border-[rgba(100,149,237,0.12)]`)가 다른 카드와 달라 시각적 불일치 가능

### 3.4 백엔드 아키텍처 (백엔드 개발자)

**강점:**
- 동기화 파이프라인의 에러 격리 우수 — 시트 레벨 + 행 레벨 분리
- 헤더 파서의 퍼지 매칭으로 시트별 컬럼명 차이 처리
- CSV 내보내기에 UTF-8 BOM 포함 — 한국어 엑셀 호환성 고려
- 필터 프리셋의 URL 인코딩 → 팀원 간 공유 가능
- CDN 캐싱 전략 (dashboard 5분, filters 1시간) 적절

**고도화 포인트:**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경변수 추가 필요 (아직 .env.local에 없음)
- [ ] 동기화 트리거: 수동(POST /api/sync)만 있음 → 크론 스케줄 고려 (Supabase Edge Functions or Vercel Cron)
- [ ] 50K행 초과 시 서버사이드 집계로 마이그레이션 경로 명시되었으나, RPC 함수 사전 설계 필요
- [ ] dry-run 모드는 좋지만, 실제 데이터 검증(preview sync) UI도 필요

---

## 4. 충돌 사항 + 해결 방안

| 항목 | 프론트엔드 | UI 디자이너 | 해결 |
|------|-----------|-----------|------|
| 사이드바 | No sidebar (v1) | Collapsible sidebar | **사이드바 채택** — 대시보드에 네비 필수, glass 처리로 랜딩과 연결 |
| 글래스 토큰 | `bg-card/80 backdrop-blur-xl` | `rgba(255,255,255,0.03) blur(12px)` | **디자이너 안 채택** — 구체적이고 랜딩과 일관 |
| 차트 라이브러리 | Recharts (shadcn chart) | Recharts | **일치** |
| 데이터 fetch | `useSWR` or `useTransition` | 미언급 | **SWR 채택** — 캐싱, dedup, revalidation |

---

## 5. 기획자를 위한 쉬운 쿼리 시스템

### 5.1 비주얼 필터 빌더 (No-Code 쿼리)

기획자가 SQL이나 코드 없이 원하는 데이터를 찾을 수 있는 시스템:

```
┌─────────────────────────────────────────────────┐
│  🔍 필터 빌더                                    │
│                                                  │
│  국가:    [🇰🇷 레진 KR] [🇰🇷 봄툰 KR] [🇺🇸 US]  │
│  기간:    [2026-01] ~ [2026-03]                  │
│  매체:    [Meta ▼] [YouTube ▼]                   │
│  목표:    [결제 ▼]                               │
│  작품명:  [검색...]                               │
│                                                  │
│  📋 현재 필터: "한국 Meta 2026년 1분기 결제"       │
│  💾 이 필터 저장  |  🔗 링크 복사  |  📥 CSV      │
└─────────────────────────────────────────────────┘
```

### 5.2 핵심 기능

**1. 한국어 자연어 필터 요약**
- 선택한 필터를 사람이 읽을 수 있는 문장으로 표시
- "전체 국가 / 2026년 1~3월 / Meta / 결제 목표"
- 필터가 없으면 "전체 데이터"

**2. 필터 프리셋 (즐겨찾기)**
- 자주 쓰는 필터 조합을 이름 붙여 저장
- localStorage 기반 (v1), 추후 Supabase 테이블로 업그레이드 가능
- 예시 프리셋:
  - "KR 전체 월간 리포트" → countries=[레진KR, 봄툰KR], period=latest
  - "US Meta 결제 성과" → countries=[US], mediums=[Meta], goals=[결제]
  - "전체 국가 ROAS 비교" → countries=all, metrics=roas

**3. URL 기반 필터 공유**
- 필터 상태가 URL query params에 인코딩됨
- `/dashboard?c=KR_레진,US&m=Meta&g=결제&p=2026-01,2026-03`
- 링크를 슬랙/메일로 공유하면 같은 화면을 바로 볼 수 있음

**4. CSV 내보내기**
- 현재 필터가 적용된 데이터를 CSV로 다운로드
- UTF-8 BOM 포함 (한국어 엑셀 호환)
- 파일명: `adinsight_KR_Meta_2026Q1.csv` (필터 기반 자동 생성)

**5. 작품명 검색**
- 기획자의 핵심 니즈: "내 작품의 광고 성과"
- 소재(작품명) 필드에 대한 자동완성 검색
- Supabase의 `ilike` + `trigram` 인덱스로 퍼지 검색

### 5.3 구현 우선순위

| 순서 | 기능 | 난이도 | 가치 |
|------|------|--------|------|
| 1 | URL 필터 공유 | 낮음 | 높음 — 팀 간 소통 |
| 2 | CSV 내보내기 | 낮음 | 높음 — 기존 워크플로우 대체 |
| 3 | 자연어 필터 요약 | 낮음 | 중간 — UX 개선 |
| 4 | 작품명 검색 | 중간 | 높음 — 기획자 핵심 니즈 |
| 5 | 필터 프리셋 저장 | 중간 | 중간 — 반복 작업 절감 |

---

## 6. 구현 로드맵 (권장)

### Phase 1: 인프라 (1일)
1. Supabase에 스키마 실행 (`schema.sql`)
2. `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` + `SYNC_API_SECRET` 추가
3. `supabase-admin.ts` + `sheets-client.ts` 구현

### Phase 2: 데이터 파이프라인 (1일)
4. `sheets-parser.ts` 구현 (헤더 매핑 + 행 정규화)
5. `sheets-sync.ts` 구현 (동기화 오케스트레이터)
6. `POST /api/sync` 라우트
7. **첫 동기화 실행 + 데이터 검증** ← 마일스톤

### Phase 3: API (0.5일)
8. `GET /api/dashboard` (필터 쿼리)
9. `GET /api/filters` (필터 옵션)
10. `GET /api/export` (CSV)

### Phase 4: 대시보드 UI (2일)
11. shadcn 컴포넌트 설치 (9개)
12. `dashboard/layout.tsx` + 사이드바
13. `DashboardShell` + `FilterBar`
14. `KpiCards`
15. `RoasAreaChart` + `MediumBarChart`
16. `DataTable`
17. URL 필터 공유 + CSV 내보내기

### Phase 5: 폴리시 (0.5일)
18. 진입 애니메이션
19. 작품명 검색
20. 필터 프리셋
21. AI Insights (규칙 기반)

---

## 7. 선행 작업 (지금 필요)

| 항목 | 담당 | 상태 |
|------|------|------|
| Supabase `service_role` key를 `.env.local`에 추가 | 사용자 | ⏳ 필요 |
| Supabase SQL Editor에서 `schema.sql` 실행 | 자동화 가능 | ⏳ 필요 |
| `SYNC_API_SECRET` 생성 (랜덤 32자) | 자동화 가능 | ⏳ 필요 |

---

## 8. 최종 파일 구조 (전체)

```
src/
├── app/
│   ├── page.tsx                        # 랜딩 (완료)
│   ├── login/page.tsx                  # 로그인 (완료)
│   ├── dashboard/
│   │   ├── layout.tsx                  # SidebarProvider 래퍼
│   │   └── page.tsx                    # 서버 컴포넌트 (데이터 fetch)
│   ├── api/
│   │   ├── auth/route.ts               # 로컬 인증 (완료)
│   │   ├── sync/route.ts               # 시트 동기화
│   │   ├── dashboard/route.ts          # 필터 쿼리
│   │   ├── filters/route.ts            # 필터 옵션
│   │   └── export/route.ts             # CSV 내보내기
│   └── globals.css                     # 테마 + 키프레임 (완료)
├── components/
│   ├── nav.tsx                         # 랜딩 네비 (완료)
│   ├── hero-section.tsx                # 랜딩 히어로 (완료)
│   ├── chart-showcase.tsx              # 랜딩 차트 (완료)
│   ├── cta-section.tsx                 # 랜딩 CTA (완료)
│   ├── footer.tsx                      # 푸터 (완료)
│   ├── dashboard/
│   │   ├── dashboard-nav.tsx           # 사이드바
│   │   ├── dashboard-header.tsx        # 상단 헤더
│   │   ├── dashboard-shell.tsx         # 클라이언트 셸 (상태 관리)
│   │   ├── filter-bar.tsx              # 필터 바
│   │   ├── multi-select.tsx            # 멀티셀렉트 컴포넌트
│   │   ├── kpi-cards.tsx               # KPI 4종
│   │   ├── roas-area-chart.tsx         # ROAS 추이 차트
│   │   ├── medium-bar-chart.tsx        # 매체별 차트
│   │   ├── dashboard-data-table.tsx    # 상세 테이블
│   │   └── dashboard-insights.tsx      # AI 인사이트
│   └── ui/                             # shadcn 컴포넌트
├── hooks/
│   └── use-scroll-reveal.ts            # 스크롤 감지 (완료)
├── lib/
│   ├── supabase.ts                     # anon 클라이언트 (완료)
│   ├── supabase-admin.ts               # service_role 클라이언트
│   ├── sheets-client.ts                # Google Sheets API
│   ├── sheets-parser.ts                # 헤더 매핑 + 행 정규화
│   ├── sheets-sync.ts                  # 동기화 오케스트레이터
│   ├── dashboard-queries.ts            # Supabase 쿼리 빌더
│   └── filter-presets.ts               # 프리셋 + URL 인코딩
├── types/
│   ├── dashboard.ts                    # AdRow, DashboardFilters, KpiSummary
│   └── sync.ts                         # SyncResult, SheetSource
├── config/
│   └── content.ts                      # 랜딩 텍스트 (완료)
└── data/
    └── sample.ts                       # 샘플 데이터 (레거시, 삭제 가능)

supabase/
└── schema.sql                          # DDL 전체
credentials/
├── service-account.json                # GCP SA 키 (git 제외)
├── sheets.json                         # 시트 URL 목록 (git 제외)
└── users.json                          # 로컬 계정 (git 제외)
```
