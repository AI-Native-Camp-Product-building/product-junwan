# Phase 0: 데이터 파이프라인 안정화 — 상세 설계

**작성일**: 2026-04-02
**접근법**: B안 (스캔 선행 → 백엔드+프론트엔드 병렬)
**동기화 대상**: 8개 시트 (레진KR, 봄툰KR, US, DE, FR, TH, TW, ES)
**제외**: 종합 시트 (대시보드가 대체), 레진JP/벨툰 (데이터 미비, 기획자 합의)

---

## 목표

> 8개 시트 전체에서 실데이터가 Supabase `ad_normalized` 뷰를 통해 정상 조회되고, 대시보드 UI에 표시되는 상태를 만든다.

---

## 현재 상태 요약

### 구현 완료 (재사용)

| 모듈 | 파일 | 역할 |
|------|------|------|
| Sheets API 클라이언트 | `src/lib/sheets-client.ts` | Service Account JWT 인증, `readSheet()` |
| 헤더 파서 | `src/lib/sheets-parser.ts` | 17개 필드 매핑, 한국어 헤더 변형 처리 |
| 동기화 파이프라인 | `src/lib/sheets-sync.ts` | `syncAllSheets()`, 배치 upsert 500행 단위 |
| Sync API Route | `src/app/api/sync/route.ts` | POST, Bearer 토큰 인증, dryRun 지원 |
| Supabase 스키마 | `supabase/schema.sql` | `ad_raw` + 3개 매핑 테이블 + `ad_normalized` 뷰 |
| 쿼리 빌더 | `src/lib/dashboard-queries.ts` | `fetchDashboardData()`, `fetchFilterOptions()` |
| 타입 시스템 | `src/types/sync.ts`, `dashboard.ts` | `AdRawInsert`, `AdRow`, `ColumnMapping` 등 |
| `sheet_source` 시드 | `supabase/schema.sql` | 8개 시트 등록 완료 |

### 미검증 (Phase 0에서 해결)

- 실제 8개 시트 동기화 실행 결과
- 시트별 헤더 매핑 커버리지
- `medium_map` / `goal_map` / `creative_type_map` 완성도
- `tab_name` / `header_row` 정확성
- 대시보드 UI 실데이터 표시

---

## 실행 구조

```
Phase 0 실행 흐름
═══════════════════════════════════════════════════════

[Agent 1: Data Engineer]        ← 선행
  시트 스캔 & 데이터 검증
  산출물: 스캔 리포트
          │
          ├─────────────────────────────────────┐
          ▼                                     ▼
[Agent 2: Backend Architect]    [Agent 3: Frontend Developer]
  파서/동기화 보강                대시보드 연결 & 검증 UI
  (스캔 리포트 기반)              (동기화 상태 UI 추가)
          │                                     │
          └─────────────┬───────────────────────┘
                        ▼
              [통합 검증]
              전체 동기화 + UI 확인
```

---

## Agent 1: 시트 스캔 & 데이터 검증

**에이전트 타입**: Data Engineer
**실행 시점**: 선행 (단독)

### 작업 목록

1. **8개 시트 헤더 행 전수 수집**
   - `sheet_source` 테이블의 `header_row` 값 기준으로 각 시트의 실제 헤더 행을 Google Sheets API로 읽기
   - 각 시트의 탭 목록도 확인하여 `tab_name`이 실제 존재하는지 검증

2. **현재 파서 매핑 vs 실제 헤더 비교**
   - `sheets-parser.ts`의 `HEADER_PATTERNS`에 정의된 패턴으로 매핑 시뮬레이션
   - 각 시트별로: 매핑 성공 컬럼 / 매핑 실패 컬럼 / 시트에 없는 컬럼 분류

3. **데이터 샘플 수집**
   - 시트당 헤더 이후 5행 샘플
   - 날짜 포맷 (2026-01-15 vs 2026.01.15 vs 1/15/2026 등), 숫자 포맷 (쉼표 유무), 빈 셀 비율 확인

4. **매핑 테이블 gap 분석**
   - 실데이터의 `medium_raw` 고유값 → `medium_map.raw_value` 대조
   - 실데이터의 `goal_raw` 고유값 → `goal_map.raw_value` 대조
   - 실데이터의 `creative_type_raw` 고유값 → `creative_type_map.raw_value` 대조
   - 미매핑 값 목록 산출

5. **종합 리포트 작성**
   - 시트별: 접근 OK/FAIL, 헤더 매핑률, 데이터 행수, 날짜 범위, 발견된 이슈
   - 전체: 누락 헤더 패턴 목록, 누락 매핑 값 목록, 권장 수정 사항

### 산출물

```
docs/superpowers/specs/시트별-데이터-스캔-결과.md

내용:
- 시트별 상태 테이블 (접근/헤더/데이터/매핑)
- 누락 헤더 패턴 목록 (Agent 2가 추가할 것)
- 누락 매핑 값 목록 (Agent 2가 SQL 시드 추가할 것)
- tab_name / header_row 수정 필요 목록
```

---

## Agent 2: 백엔드 파서/동기화 보강

**에이전트 타입**: Backend Architect
**실행 시점**: Agent 1 완료 후 (Agent 3과 병렬)
**입력**: Agent 1의 스캔 리포트

### 작업 목록

1. **`sheets-parser.ts` 헤더 패턴 보강**
   - Agent 1 리포트에서 "미매핑 헤더" 목록을 가져와 `HEADER_PATTERNS`에 추가
   - 예: 해외 시트에서 "Spend", "Revenue", "Impressions" 등 영문 헤더 변형

2. **매핑 테이블 SQL 시드 보강**
   - `schema.sql`의 `medium_map` INSERT에 새로 발견된 raw 값 추가
   - `goal_map`, `creative_type_map` 동일 처리
   - normalized 값은 기존 패턴에 맞춰 결정 (예: "Facebook" → "Meta")

3. **`sheet_source` 시드 수정**
   - Agent 1이 발견한 `tab_name` / `header_row` 불일치 수정
   - `schema.sql` UPDATE 또는 시드 수정

4. **동기화 에러 핸들링 강화**
   - `sheets-parser.ts`의 `parseRow`에서 필드별 파싱 실패 시 어떤 필드가 문제인지 로그
   - `sheets-sync.ts`에서 시트별 매핑 성공률 (매핑된 행수 / 전체 행수) 반환

5. **전체 동기화 실행 & 검증**
   - `syncAllSheets()` 실행하여 8개 시트 전체 결과 확인
   - `ad_normalized` 뷰에서 8개 시트 데이터 조회 검증
   - 미매핑 medium/goal/creative_type 행이 0인지 확인

### 수정 대상 파일

```
src/lib/sheets-parser.ts      — HEADER_PATTERNS 보강
supabase/schema.sql            — 매핑 테이블 시드 보강, sheet_source 수정
src/lib/sheets-sync.ts         — 에러 핸들링 강화 (필요 시)
```

---

## Agent 3: 프론트엔드 연결 & 검증 UI

**에이전트 타입**: Frontend Developer
**실행 시점**: Agent 1 완료 후 (Agent 2와 병렬)

### 작업 목록

1. **동기화 상태 표시**
   - 대시보드 사이드바 하단 또는 헤더에 "마지막 동기화: YYYY-MM-DD HH:mm" 표시
   - 데이터 소스: Supabase `sheet_sync_latest` 뷰에서 가장 최근 `finished_at` 조회
   - 컴포넌트: `SyncStatus` (간단한 텍스트 + 아이콘)

2. **수동 Sync 버튼**
   - 사이드바 또는 설정 영역에 "데이터 동기화" 버튼
   - 클릭 시 내부 API proxy 경로 (예: `POST /api/sync-trigger`)를 호출하고, 이 서버사이드 route가 `SYNC_API_SECRET`을 사용하여 `/api/sync`를 호출
   - 프론트엔드에 시크릿 노출하지 않음
   - 로딩 상태 → 성공/실패 표시 → 자동 새로고침

3. **시트별 동기화 상태 패널**
   - 8개 시트 각각의 상태 표시: 이름 + 상태 아이콘(성공/실패/미동기화) + 행수 + 마지막 동기화 시각
   - 데이터 소스: `sheet_sync_latest` 뷰 전체 조회
   - 위치: 사이드바 하단의 접기 가능 패널 또는 별도 설정 페이지

4. **빈 데이터 상태 처리**
   - KPI 카드: 값이 0 또는 null이면 "데이터 없음" 표시 (회색 톤)
   - 차트: 데이터 없으면 빈 차트 + "동기화를 실행해주세요" 안내 메시지
   - 테이블: 빈 행이면 "데이터가 없습니다" 중앙 표시

5. **실데이터 바인딩 확인**
   - 대시보드 페이지에서 `/api/dashboard` 데이터가 정상 표시되는지 확인
   - 필터(국가/월/매체) 변경 시 데이터 정상 갱신 확인

### 수정/생성 대상 파일

```
src/components/dashboard/sync-status.tsx       — 신규: 동기화 상태 표시
src/components/dashboard/sync-panel.tsx        — 신규: 시트별 상태 + Sync 버튼
src/components/dashboard/dashboard-sidebar.tsx — 수정: sync-status/panel 배치
src/components/dashboard/kpi-cards.tsx         — 수정: 빈 상태 처리
src/components/dashboard/chart-section.tsx     — 수정: 빈 상태 처리
src/components/dashboard/dashboard-data-table.tsx — 수정: 빈 상태 처리
```

### UI 디자인 원칙

- shadcn/ui 컴포넌트 활용 (`Badge`, `Button`, `Card`, `Collapsible`)
- 시맨틱 컬러 사용 (`text-muted-foreground`, `bg-destructive` 등)
- 다크 테마 CSS 변수 준수 (raw color 사용 금지)

---

## 통합 검증 (Agent 2 + 3 완료 후)

| # | 검증 항목 | 방법 | 기대 결과 |
|---|----------|------|----------|
| 1 | 8개 시트 전체 동기화 | `POST /api/sync` 실행 | status: 200, failed: 0 |
| 2 | `ad_normalized` 뷰 조회 | Supabase 쿼리 | 8개 sheet_name 존재 |
| 3 | 매핑 누락 없음 | `medium = medium_raw`인 행 카운트 | 0 (전부 정규화됨) |
| 4 | 대시보드 KPI 표시 | 브라우저 확인 | 실수치 표시 |
| 5 | 대시보드 차트 표시 | 브라우저 확인 | 실데이터 차트 렌더링 |
| 6 | 동기화 상태 UI | 브라우저 확인 | 시트별 상태 + 시각 표시 |
| 7 | 필터 동작 | 국가/월/매체 필터 변경 | 데이터 정상 갱신 |

---

## 완료 기준 (Exit Criteria)

1. 8개 시트 모두 `syncAllSheets()` 실행 시 `success` 상태
2. `ad_normalized` 뷰에서 8개 플랫폼 데이터 정상 조회
3. 매핑 테이블 gap 0 (모든 raw 값이 정규화됨)
4. 대시보드 UI에 실데이터 KPI/차트/테이블 표시
5. 동기화 상태 UI에서 시트별 상태 확인 가능
6. 수동 Sync 버튼으로 재동기화 가능
