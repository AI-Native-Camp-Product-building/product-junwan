# AdInsight 랜딩 페이지 디자인 스펙

## 개요

내부 브랜드 기획자를 위한 마케팅 성과 대시보드 도구(AdInsight)의 소개용 랜딩 페이지.
10개국에 산발된 광고 성과 데이터를 자동 취합하고, 시각화하며, AI 인사이트를 제공하는 도구의 가치를 전달하고 대시보드 접속을 유도한다.

## 프로덕트 컨텍스트

### 배경

- 브랜드 기획자들이 마케팅 소재로 광고를 집행하면, 마케팅 팀이 성과 지표를 국가별 구글 시트에 기입
- 약 10개 국가, 국가별로 별도 구글 시트 URL 존재
- 대부분의 국가가 동일 스키마, 2-3개 국가만 약간 상이
- 첫째주 지표 기입 → 둘째주 수요일경 기획자가 취합/확인/인사이트 메모

### 사용자

- **주 사용자**: 브랜드 기획자 (콘텐츠 제작자)
- **목적**: 본인이 만든 콘텐츠의 광고 성과를 직접 확인하고 인사이트 정리

### 데이터 컬럼

| 컬럼명 | 설명 |
|--------|------|
| 월별 | 데이터 기준 월 |
| 일자 | 데이터 기준 일 |
| 매체 | 광고 매체 (Meta, Google, TikTok 등) |
| 목표 | 캠페인 목표 |
| 소재종류 | 광고 소재 유형 |
| 소재(작품명) | 광고에 사용된 콘텐츠/작품명 |
| 광고비 | 집행된 광고 비용 |
| 원화(외화일경우) | 외화 광고비의 원화 환산액 |
| 노출수 | 광고 노출 횟수 |
| 클릭 | 클릭 횟수 |
| CTR | 클릭률 (클릭/노출) |
| 회원가입 | 회원가입 전환 수 |
| 가입CPA | 가입당 비용 |
| 결제전환 | 결제 전환 수 |
| 결제금액 | 총 결제 금액 |
| ROAS | 광고 수익률 (결제금액/광고비) |

## 랜딩 페이지 구성

### 접근 방식

인터랙티브 데모 포함 원페이지 — 샘플 데이터로 대시보드를 미리 체험할 수 있는 구성.

### 페이지 섹션 (위→아래)

#### 1. 네비게이션

- 좌측: 프로덕트명 "AdInsight"
- 우측: 앵커 링크 (기능, 데모) + CTA 버튼 (시작하기)
- shadcn 스타일: `border-bottom: 1px solid hsl(var(--border))`

#### 2. 히어로 (중앙 정렬)

- **레이블**: "INTERNAL TOOL" (letter-spacing 1.5px, muted-foreground)
- **헤드카피**: "10개국 마케팅 성과, 한눈에 확인하세요"
- **서브카피**: "국가별 산발된 광고 데이터를 자동 취합하고, 시각화하고, AI 인사이트까지"
- **CTA**: "대시보드 바로가기 →" (primary 버튼)
- **핵심 수치 3개**: 10 국가 / 16 지표 항목 / AI 인사이트

#### 3. 인터랙티브 데모 (풀 구성)

한 화면에 아래 요소를 모두 배치:

**3-1. 필터 바**
- 국가 선택 (전체 / 개별 국가)
- 기간 선택 (월 단위)
- 매체 선택 (전체 / Meta / Google / TikTok 등)
- shadcn `Select` 컴포넌트 사용

**3-2. KPI 카드 4개**
- 총 광고비, 총 결제금액, 평균 ROAS, 총 회원가입
- 각 카드에 전주 대비 변화율 표시
- shadcn `Card` 컴포넌트 사용
- 상승: `hsl(var(--chart-2))` (초록), 하락: `hsl(var(--destructive))`

**3-3. 차트 영역**
- **메인 차트**: Area Chart (Stacked) — 국가별 ROAS 6개월 추이, 부드러운 곡선(smooth curves), 그라데이션 area fill
- **보조 차트 (2열)**:
  - Bar Chart — 매체별 광고비 비교
  - Radial Chart — 목표 달성률
- 모든 차트는 shadcn/ui charts 컴포넌트 사용 (Recharts 기반)
- 차트 컬러: `--chart-1` ~ `--chart-5` CSS 변수 사용

**3-4. 상세 테이블**
- 국가별 핵심 지표 요약 (광고비, 결제금액, ROAS, 가입CPA)
- shadcn `Table` 컴포넌트 사용
- 헤더: `muted-foreground`, 데이터: `foreground`

**3-5. AI 인사이트**
- 규칙 기반 요약 (전주 대비 변화율, 상/하위 국가)
- AI 추가 인사이트 (LLM 기반 분석)
- shadcn `Card` 컴포넌트 사용

#### 4. 푸터

- 텍스트: "이 웹사이트는 데모버전입니다. 외부에 공유하지 말아주세요."
- `border-top: 1px solid hsl(var(--border))`, `muted-foreground`

## 기술 스택

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | React 기반 |
| UI 라이브러리 | shadcn/ui | Radix UI 기반 컴포넌트 |
| 차트 | shadcn/ui charts | Recharts 래핑, Area/Bar/Radial |
| 스타일 | Tailwind CSS | shadcn 테마 시스템 연동 |
| 폰트 | Pretendard | 한글/영문 통합 폰트 |
| 데이터 | 샘플 JSON | 정적 샘플 데이터로 데모 동작 |
| 스킬 | shadcn skill 설치 완료 | `.agents/skills/shadcn` |

## 디자인 시스템

### 테마: shadcn neutral (dark mode)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

### 타이포그래피

- **폰트**: Pretendard (한글/영문 통합)
- font-family: `'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### 파라미터화 설계 원칙

하드코딩을 최소화하고 다음 항목을 설정으로 분리:

#### 데이터 파라미터

```typescript
// config/countries.ts
type Country = {
  code: string;       // "KR", "JP", "US" 등
  name: string;       // "한국", "일본", "미국" 등
  currency: string;   // "KRW", "JPY", "USD" 등
  sheetUrl: string;   // 구글 시트 URL (추후 연동용)
};

// config/metrics.ts
type Metric = {
  key: string;        // "adSpend", "revenue", "roas" 등
  label: string;      // "광고비", "결제금액", "ROAS" 등
  format: "currency" | "percentage" | "number";
  currencyAware: boolean;  // 국가별 통화 포맷 적용 여부
};
```

#### UI 파라미터

```typescript
// config/dashboard.ts
type DashboardConfig = {
  kpiCards: MetricKey[];              // KPI 카드에 표시할 지표 목록
  mainChart: {
    type: "area" | "line" | "bar";
    metric: MetricKey;                // 차트에 표시할 지표
    period: number;                   // 표시 기간 (월)
  };
  subCharts: {
    type: "bar" | "radial" | "pie" | "radar";
    metric: MetricKey;
    title: string;
  }[];                                // 보조 차트 설정
  table: {
    columns: MetricKey[];             // 테이블 컬럼 목록
    sortBy: MetricKey;                // 기본 정렬 기준
  };
};
```

#### 컨텐츠 파라미터

```typescript
// config/content.ts
type LandingContent = {
  productName: string;                // "AdInsight"
  hero: {
    label: string;                    // "INTERNAL TOOL"
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaUrl: string;
  };
  stats: { value: string; label: string }[];
  footer: string;
};
```

## 샘플 데이터

데모용 정적 JSON 파일로 제공. 실제 구글 시트 연동은 대시보드 본체에서 처리.

```typescript
// data/sample.ts
// 3개국(KR, JP, US) × 6개월 × 주요 지표 데이터
// 필터 변경 시 클라이언트에서 필터링

type SampleDataRow = {
  month: string;        // "2025-10", "2025-11", ...
  date: string;         // "2025-10-01"
  country: string;      // "KR", "JP", "US"
  medium: string;       // "Meta", "Google", "TikTok"
  goal: string;         // 캠페인 목표
  creativeType: string; // 소재종류
  creativeName: string; // 소재(작품명)
  adSpend: number;      // 광고비 (원화 기준)
  impressions: number;  // 노출수
  clicks: number;       // 클릭
  ctr: number;          // CTR (%)
  signups: number;      // 회원가입
  signupCpa: number;    // 가입 CPA
  conversions: number;  // 결제전환
  revenue: number;      // 결제금액
  roas: number;         // ROAS (%)
};

// 최소 3개국 × 6개월 × 2-3개 매체 = 약 36-54개 행
```

## 인사이트 로직

### 규칙 기반 (데모에서 구현)

- 전주/전월 대비 변화율 자동 계산
- ROAS 상위/하위 국가 식별
- CPA 개선/악화 국가 하이라이트

### AI 기반 (추후 확장)

- LLM API 연동하여 데이터 기반 자연어 인사이트 생성
- 데모에서는 미리 작성된 샘플 인사이트 표시

## 범위 외 (Not in Scope)

- 실제 구글 시트 API 연동 (대시보드 본체에서 구현)
- 사용자 인증/권한 관리
- 데이터 입력/수정 기능
- 라이트 모드 (다크 모드 단일)
- 모바일 반응형 (데스크톱 우선)
