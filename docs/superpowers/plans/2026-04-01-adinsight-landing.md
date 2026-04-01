# AdInsight 랜딩 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내부 브랜드 기획자를 위한 마케팅 성과 대시보드 도구(AdInsight) 소개용 랜딩 페이지를 구현한다.

**Architecture:** Next.js App Router + shadcn/ui 컴포넌트로 단일 페이지 구성. 샘플 JSON 데이터를 클라이언트에서 필터링하여 인터랙티브 데모를 제공한다. 모든 설정은 `config/` 디렉토리에 파라미터화하여 하드코딩을 최소화한다.

**Tech Stack:** Next.js 15 (App Router), shadcn/ui (Radix), Recharts (via shadcn charts), Tailwind CSS v4, Pretendard 폰트, TypeScript

**Skills 참조:**
- `shadcn` — 컴포넌트 설치, 스타일링 규칙, Card/Chart/Table/Select/Badge API
- `vercel-react-best-practices` — `bundle-barrel-imports` (직접 import), `rerender-no-inline-components` (인라인 컴포넌트 금지), `rendering-conditional-render` (삼항 연산자), `server-serialization` (클라이언트 데이터 최소화)
- `gws-sheets` — 추후 구글 시트 연동 시 참조 (이번 스코프 외)

---

## 파일 구조

```
D:/code/project-junwan/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # RootLayout: Pretendard 폰트, dark class, metadata
│   │   ├── page.tsx            # 랜딩 페이지 (Server Component — 조립만)
│   │   └── globals.css         # shadcn 테마 CSS 변수 + Pretendard import
│   ├── components/
│   │   ├── nav.tsx             # 네비게이션 바
│   │   ├── hero.tsx            # 히어로 섹션
│   │   ├── demo-section.tsx    # 인터랙티브 데모 컨테이너 ("use client")
│   │   ├── filter-bar.tsx      # 필터 바 (Select 3개)
│   │   ├── kpi-cards.tsx       # KPI 카드 4개
│   │   ├── area-chart.tsx      # ROAS 추이 Area Chart
│   │   ├── bar-chart.tsx       # 매체별 Bar Chart
│   │   ├── radial-chart.tsx    # 목표 달성률 Radial Chart
│   │   ├── data-table.tsx      # 상세 데이터 Table
│   │   ├── insights-card.tsx   # AI 인사이트 Card
│   │   └── footer.tsx          # 푸터
│   ├── config/
│   │   ├── countries.ts        # 국가 목록 + 통화 설정
│   │   ├── metrics.ts          # 지표 정의 + 포맷 규칙
│   │   ├── dashboard.ts        # KPI/차트/테이블 구성
│   │   └── content.ts          # 히어로 카피, 푸터 텍스트 등
│   ├── data/
│   │   └── sample.ts           # 샘플 데이터 (3개국 × 6개월 × 3매체)
│   └── lib/
│       ├── format.ts           # 통화/퍼센트/숫자 포맷 유틸
│       └── insights.ts         # 규칙 기반 인사이트 생성 로직
├── components.json             # shadcn 설정
├── tailwind.config.ts          # Tailwind 설정
└── package.json
```

---

## Task 1: 프로젝트 초기화 + shadcn 설정

**Files:**
- Create: `D:/code/project-junwan/package.json`, `D:/code/project-junwan/components.json`, `D:/code/project-junwan/src/app/globals.css`
- Modify: `D:/code/project-junwan/src/app/layout.tsx`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd D:/code/project-junwan
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: `src/app/layout.tsx`, `src/app/page.tsx`, `package.json` 등 생성

- [ ] **Step 2: shadcn/ui 초기화**

```bash
cd D:/code/project-junwan
npx shadcn@latest init --defaults
```

Expected: `components.json` 생성, `src/lib/utils.ts` 생성

- [ ] **Step 3: shadcn 컴포넌트 설치**

```bash
cd D:/code/project-junwan
npx shadcn@latest add card chart select table badge button
```

Expected: `src/components/ui/` 하위에 각 컴포넌트 파일 생성

- [ ] **Step 4: globals.css에 shadcn neutral 테마 + Pretendard 적용**

`src/app/globals.css`를 다음 내용으로 교체:

```css
@import "tailwindcss";
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

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

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: layout.tsx에 Pretendard + dark class 설정**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdInsight — 마케팅 성과 대시보드",
  description: "10개국 마케팅 성과를 한눈에 확인하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: 개발 서버 실행 확인**

```bash
cd D:/code/project-junwan
npm run dev
```

Expected: `http://localhost:3000` 에서 빈 페이지가 다크 배경으로 렌더링

- [ ] **Step 7: 커밋**

```bash
cd D:/code/project-junwan
git add -A
git commit -m "chore: init Next.js + shadcn/ui with neutral dark theme and Pretendard"
```

---

## Task 2: Config 파라미터 + 샘플 데이터

**Files:**
- Create: `src/config/countries.ts`, `src/config/metrics.ts`, `src/config/dashboard.ts`, `src/config/content.ts`, `src/data/sample.ts`, `src/lib/format.ts`

- [ ] **Step 1: 국가 설정 작성**

`src/config/countries.ts`:

```typescript
export type Country = {
  code: string;
  name: string;
  currency: string;
  locale: string;
  sheetUrl: string;
};

export const countries: Country[] = [
  { code: "KR", name: "한국", currency: "KRW", locale: "ko-KR", sheetUrl: "" },
  { code: "JP", name: "일본", currency: "JPY", locale: "ja-JP", sheetUrl: "" },
  { code: "US", name: "미국", currency: "USD", locale: "en-US", sheetUrl: "" },
];
```

- [ ] **Step 2: 지표 정의 작성**

`src/config/metrics.ts`:

```typescript
export type MetricFormat = "currency" | "percentage" | "number";

export type Metric = {
  key: string;
  label: string;
  format: MetricFormat;
  currencyAware: boolean;
};

export const metrics: Metric[] = [
  { key: "adSpend", label: "광고비", format: "currency", currencyAware: true },
  { key: "revenue", label: "결제금액", format: "currency", currencyAware: true },
  { key: "roas", label: "ROAS", format: "percentage", currencyAware: false },
  { key: "signups", label: "회원가입", format: "number", currencyAware: false },
  { key: "signupCpa", label: "가입CPA", format: "currency", currencyAware: true },
  { key: "impressions", label: "노출수", format: "number", currencyAware: false },
  { key: "clicks", label: "클릭", format: "number", currencyAware: false },
  { key: "ctr", label: "CTR", format: "percentage", currencyAware: false },
  { key: "conversions", label: "결제전환", format: "number", currencyAware: false },
];
```

- [ ] **Step 3: 대시보드 구성 작성**

`src/config/dashboard.ts`:

```typescript
export const dashboardConfig = {
  kpiCards: ["adSpend", "revenue", "roas", "signups"] as const,
  mainChart: {
    type: "area" as const,
    metric: "roas",
    period: 6,
  },
  subCharts: [
    { type: "bar" as const, metric: "adSpend", title: "매체별 성과" },
    { type: "radial" as const, metric: "roas", title: "목표 달성률" },
  ],
  table: {
    columns: ["adSpend", "revenue", "roas", "signupCpa"] as const,
    sortBy: "roas",
  },
};
```

- [ ] **Step 4: 랜딩 콘텐츠 작성**

`src/config/content.ts`:

```typescript
export const landingContent = {
  productName: "AdInsight",
  hero: {
    label: "INTERNAL TOOL",
    headline: "10개국 마케팅 성과,\n한눈에 확인하세요",
    subheadline: "국가별 산발된 광고 데이터를 자동 취합하고, 시각화하고, AI 인사이트까지",
    ctaText: "대시보드 바로가기 →",
    ctaUrl: "#demo",
  },
  stats: [
    { value: "10", label: "국가" },
    { value: "16", label: "지표 항목" },
    { value: "AI", label: "인사이트" },
  ],
  footer: "이 웹사이트는 데모버전입니다. 외부에 공유하지 말아주세요.",
};
```

- [ ] **Step 5: 포맷 유틸 작성**

`src/lib/format.ts`:

```typescript
import { type Country } from "@/config/countries";

export function formatCurrency(value: number, country: Country): string {
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    maximumFractionDigits: 0,
    notation: value >= 100_000_000 ? "compact" : "standard",
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatChangeRate(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const rate = ((current - previous) / previous) * 100;
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}
```

- [ ] **Step 6: 샘플 데이터 작성**

`src/data/sample.ts`:

```typescript
export type SampleDataRow = {
  month: string;
  country: string;
  medium: string;
  adSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  signups: number;
  signupCpa: number;
  conversions: number;
  revenue: number;
  roas: number;
};

export const sampleData: SampleDataRow[] = [
  // KR - Meta
  { month: "2025-10", country: "KR", medium: "Meta", adSpend: 12000000, impressions: 850000, clicks: 42500, ctr: 5.0, signups: 2100, signupCpa: 5714, conversions: 420, revenue: 38000000, roas: 316.7 },
  { month: "2025-11", country: "KR", medium: "Meta", adSpend: 13500000, impressions: 920000, clicks: 48300, ctr: 5.25, signups: 2400, signupCpa: 5625, conversions: 510, revenue: 46000000, roas: 340.7 },
  { month: "2025-12", country: "KR", medium: "Meta", adSpend: 15000000, impressions: 1050000, clicks: 55650, ctr: 5.3, signups: 2700, signupCpa: 5556, conversions: 580, revenue: 54000000, roas: 360.0 },
  { month: "2026-01", country: "KR", medium: "Meta", adSpend: 14200000, impressions: 980000, clicks: 51940, ctr: 5.3, signups: 2550, signupCpa: 5569, conversions: 540, revenue: 51000000, roas: 359.2 },
  { month: "2026-02", country: "KR", medium: "Meta", adSpend: 16000000, impressions: 1120000, clicks: 60480, ctr: 5.4, signups: 2950, signupCpa: 5424, conversions: 640, revenue: 61000000, roas: 381.3 },
  { month: "2026-03", country: "KR", medium: "Meta", adSpend: 15500000, impressions: 1080000, clicks: 58320, ctr: 5.4, signups: 2850, signupCpa: 5439, conversions: 620, revenue: 59000000, roas: 380.6 },
  // KR - Google
  { month: "2025-10", country: "KR", medium: "Google", adSpend: 8000000, impressions: 620000, clicks: 27900, ctr: 4.5, signups: 1200, signupCpa: 6667, conversions: 280, revenue: 25000000, roas: 312.5 },
  { month: "2025-11", country: "KR", medium: "Google", adSpend: 8500000, impressions: 660000, clicks: 30360, ctr: 4.6, signups: 1350, signupCpa: 6296, conversions: 310, revenue: 28000000, roas: 329.4 },
  { month: "2025-12", country: "KR", medium: "Google", adSpend: 9200000, impressions: 720000, clicks: 33840, ctr: 4.7, signups: 1500, signupCpa: 6133, conversions: 350, revenue: 32000000, roas: 347.8 },
  { month: "2026-01", country: "KR", medium: "Google", adSpend: 9000000, impressions: 700000, clicks: 32900, ctr: 4.7, signups: 1450, signupCpa: 6207, conversions: 340, revenue: 31000000, roas: 344.4 },
  { month: "2026-02", country: "KR", medium: "Google", adSpend: 10000000, impressions: 780000, clicks: 37440, ctr: 4.8, signups: 1650, signupCpa: 6061, conversions: 390, revenue: 36000000, roas: 360.0 },
  { month: "2026-03", country: "KR", medium: "Google", adSpend: 9800000, impressions: 770000, clicks: 36960, ctr: 4.8, signups: 1620, signupCpa: 6049, conversions: 380, revenue: 35500000, roas: 362.2 },
  // JP - Meta
  { month: "2025-10", country: "JP", medium: "Meta", adSpend: 9500000, impressions: 700000, clicks: 31500, ctr: 4.5, signups: 1400, signupCpa: 6786, conversions: 300, revenue: 28000000, roas: 294.7 },
  { month: "2025-11", country: "JP", medium: "Meta", adSpend: 10200000, impressions: 750000, clicks: 34500, ctr: 4.6, signups: 1550, signupCpa: 6581, conversions: 340, revenue: 32000000, roas: 313.7 },
  { month: "2025-12", country: "JP", medium: "Meta", adSpend: 11000000, impressions: 810000, clicks: 38070, ctr: 4.7, signups: 1700, signupCpa: 6471, conversions: 380, revenue: 36000000, roas: 327.3 },
  { month: "2026-01", country: "JP", medium: "Meta", adSpend: 10800000, impressions: 790000, clicks: 37130, ctr: 4.7, signups: 1650, signupCpa: 6545, conversions: 370, revenue: 35000000, roas: 324.1 },
  { month: "2026-02", country: "JP", medium: "Meta", adSpend: 11500000, impressions: 850000, clicks: 40800, ctr: 4.8, signups: 1800, signupCpa: 6389, conversions: 410, revenue: 39000000, roas: 339.1 },
  { month: "2026-03", country: "JP", medium: "Meta", adSpend: 11200000, impressions: 830000, clicks: 39840, ctr: 4.8, signups: 1750, signupCpa: 6400, conversions: 400, revenue: 38000000, roas: 339.3 },
  // JP - Google
  { month: "2025-10", country: "JP", medium: "Google", adSpend: 6500000, impressions: 480000, clicks: 19200, ctr: 4.0, signups: 900, signupCpa: 7222, conversions: 200, revenue: 18000000, roas: 276.9 },
  { month: "2025-11", country: "JP", medium: "Google", adSpend: 7000000, impressions: 520000, clicks: 21320, ctr: 4.1, signups: 1000, signupCpa: 7000, conversions: 230, revenue: 21000000, roas: 300.0 },
  { month: "2025-12", country: "JP", medium: "Google", adSpend: 7500000, impressions: 560000, clicks: 23520, ctr: 4.2, signups: 1100, signupCpa: 6818, conversions: 260, revenue: 24000000, roas: 320.0 },
  { month: "2026-01", country: "JP", medium: "Google", adSpend: 7300000, impressions: 540000, clicks: 22680, ctr: 4.2, signups: 1050, signupCpa: 6952, conversions: 250, revenue: 23000000, roas: 315.1 },
  { month: "2026-02", country: "JP", medium: "Google", adSpend: 8000000, impressions: 600000, clicks: 25800, ctr: 4.3, signups: 1200, signupCpa: 6667, conversions: 290, revenue: 27000000, roas: 337.5 },
  { month: "2026-03", country: "JP", medium: "Google", adSpend: 7800000, impressions: 580000, clicks: 25520, ctr: 4.4, signups: 1180, signupCpa: 6610, conversions: 280, revenue: 26500000, roas: 339.7 },
  // US - Meta
  { month: "2025-10", country: "US", medium: "Meta", adSpend: 7200000, impressions: 550000, clicks: 27500, ctr: 5.0, signups: 1300, signupCpa: 5538, conversions: 350, revenue: 30000000, roas: 416.7 },
  { month: "2025-11", country: "US", medium: "Meta", adSpend: 7800000, impressions: 600000, clicks: 30600, ctr: 5.1, signups: 1450, signupCpa: 5379, conversions: 390, revenue: 34000000, roas: 435.9 },
  { month: "2025-12", country: "US", medium: "Meta", adSpend: 8500000, impressions: 660000, clicks: 34320, ctr: 5.2, signups: 1600, signupCpa: 5313, conversions: 430, revenue: 38000000, roas: 447.1 },
  { month: "2026-01", country: "US", medium: "Meta", adSpend: 8200000, impressions: 640000, clicks: 33280, ctr: 5.2, signups: 1550, signupCpa: 5290, conversions: 420, revenue: 37000000, roas: 451.2 },
  { month: "2026-02", country: "US", medium: "Meta", adSpend: 9000000, impressions: 700000, clicks: 37100, ctr: 5.3, signups: 1700, signupCpa: 5294, conversions: 470, revenue: 42000000, roas: 466.7 },
  { month: "2026-03", country: "US", medium: "Meta", adSpend: 8800000, impressions: 690000, clicks: 36570, ctr: 5.3, signups: 1680, signupCpa: 5238, conversions: 460, revenue: 41000000, roas: 465.9 },
  // US - TikTok
  { month: "2025-10", country: "US", medium: "TikTok", adSpend: 3500000, impressions: 420000, clicks: 18900, ctr: 4.5, signups: 700, signupCpa: 5000, conversions: 150, revenue: 12000000, roas: 342.9 },
  { month: "2025-11", country: "US", medium: "TikTok", adSpend: 4000000, impressions: 480000, clicks: 22080, ctr: 4.6, signups: 820, signupCpa: 4878, conversions: 180, revenue: 14500000, roas: 362.5 },
  { month: "2025-12", country: "US", medium: "TikTok", adSpend: 4500000, impressions: 540000, clicks: 25380, ctr: 4.7, signups: 950, signupCpa: 4737, conversions: 210, revenue: 17000000, roas: 377.8 },
  { month: "2026-01", country: "US", medium: "TikTok", adSpend: 4200000, impressions: 510000, clicks: 23970, ctr: 4.7, signups: 900, signupCpa: 4667, conversions: 200, revenue: 16000000, roas: 381.0 },
  { month: "2026-02", country: "US", medium: "TikTok", adSpend: 5000000, impressions: 600000, clicks: 28800, ctr: 4.8, signups: 1050, signupCpa: 4762, conversions: 240, revenue: 20000000, roas: 400.0 },
  { month: "2026-03", country: "US", medium: "TikTok", adSpend: 4800000, impressions: 580000, clicks: 27840, ctr: 4.8, signups: 1020, signupCpa: 4706, conversions: 230, revenue: 19500000, roas: 406.3 },
];

export function getMonths(): string[] {
  return [...new Set(sampleData.map((d) => d.month))].sort();
}

export function getMediums(): string[] {
  return [...new Set(sampleData.map((d) => d.medium))].sort();
}
```

- [ ] **Step 7: 커밋**

```bash
cd D:/code/project-junwan
git add src/config src/data src/lib/format.ts
git commit -m "feat: add config parameters and sample data"
```

---

## Task 3: 네비게이션 + 히어로 + 푸터 (정적 섹션)

**Files:**
- Create: `src/components/nav.tsx`, `src/components/hero.tsx`, `src/components/footer.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 네비게이션 컴포넌트 작성**

`src/components/nav.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { landingContent } from "@/config/content";

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border">
      <span className="text-sm font-semibold tracking-tight">
        {landingContent.productName}
      </span>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <a href="#demo" className="hover:text-foreground transition-colors">
          데모
        </a>
        <Button size="sm">{landingContent.hero.ctaText.replace(" →", "")}</Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 히어로 컴포넌트 작성**

`src/components/hero.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { landingContent } from "@/config/content";

export function Hero() {
  const { hero, stats } = landingContent;

  return (
    <section className="flex flex-col items-center px-6 pt-16 pb-10 text-center">
      <span className="text-xs text-muted-foreground tracking-widest font-medium mb-4">
        {hero.label}
      </span>
      <h1 className="text-3xl font-bold tracking-tight leading-tight mb-3 whitespace-pre-line">
        {hero.headline}
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
        {hero.subheadline}
      </p>
      <Button asChild>
        <a href={hero.ctaUrl}>{hero.ctaText}</a>
      </Button>
      <div className="flex items-center gap-10 mt-10">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 푸터 컴포넌트 작성**

`src/components/footer.tsx`:

```tsx
import { landingContent } from "@/config/content";

export function Footer() {
  return (
    <footer className="py-6 text-center border-t border-border">
      <p className="text-xs text-muted-foreground">{landingContent.footer}</p>
    </footer>
  );
}
```

- [ ] **Step 4: page.tsx에 조립**

`src/app/page.tsx`:

```tsx
import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1">
        <Hero />
        {/* Task 4에서 DemoSection 추가 */}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: 브라우저에서 히어로/네비/푸터 렌더링 확인**

```bash
cd D:/code/project-junwan
npm run dev
```

Expected: 다크 배경에 중앙 정렬된 히어로, 상단 네비, 하단 푸터 표시

- [ ] **Step 6: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/nav.tsx src/components/hero.tsx src/components/footer.tsx src/app/page.tsx
git commit -m "feat: add nav, hero, and footer sections"
```

---

## Task 4: 인사이트 로직 + 필터 상태 관리

**Files:**
- Create: `src/lib/insights.ts`, `src/components/demo-section.tsx`, `src/components/filter-bar.tsx`

- [ ] **Step 1: 규칙 기반 인사이트 로직 작성**

`src/lib/insights.ts`:

```typescript
import { type SampleDataRow } from "@/data/sample";

export type Insight = {
  id: string;
  text: string;
};

export function generateInsights(
  data: SampleDataRow[],
  currentMonth: string,
): Insight[] {
  const months = [...new Set(data.map((d) => d.month))].sort();
  const currentIdx = months.indexOf(currentMonth);
  const previousMonth = currentIdx > 0 ? months[currentIdx - 1] : null;

  const currentData = data.filter((d) => d.month === currentMonth);
  const previousData = previousMonth
    ? data.filter((d) => d.month === previousMonth)
    : [];

  const insights: Insight[] = [];

  // 국가별 ROAS 집계
  const countryRoas = aggregateByCountry(currentData, "roas");
  const sortedByRoas = Object.entries(countryRoas).sort(([, a], [, b]) => b - a);

  if (sortedByRoas.length > 0) {
    const [topCountry, topRoas] = sortedByRoas[0];
    insights.push({
      id: "top-roas",
      text: `${topCountry} 지역 ROAS ${topRoas.toFixed(1)}%로 전체 1위`,
    });
  }

  // 전월 대비 CPA 변화
  if (previousData.length > 0) {
    const currentCpa = aggregateByCountry(currentData, "signupCpa");
    const previousCpa = aggregateByCountry(previousData, "signupCpa");

    for (const [country, current] of Object.entries(currentCpa)) {
      const previous = previousCpa[country];
      if (previous) {
        const change = ((current - previous) / previous) * 100;
        if (change < -10) {
          insights.push({
            id: `cpa-improve-${country}`,
            text: `${country} 가입CPA ${Math.abs(change).toFixed(1)}% 개선 — 효율 상승`,
          });
        } else if (change > 10) {
          insights.push({
            id: `cpa-warn-${country}`,
            text: `${country} 가입CPA ${change.toFixed(1)}% 상승 — 매체 전략 점검 필요`,
          });
        }
      }
    }
  }

  // 최소 3개 인사이트 보장 (부족 시 매체 성과 추가)
  if (insights.length < 3) {
    const mediumSpend = aggregateByField(currentData, "medium", "adSpend");
    const topMedium = Object.entries(mediumSpend).sort(([, a], [, b]) => b - a)[0];
    if (topMedium) {
      insights.push({
        id: "top-medium",
        text: `${topMedium[0]} 매체 광고비 집중 — 전체 지출의 주요 채널`,
      });
    }
  }

  return insights.slice(0, 5);
}

function aggregateByCountry(
  data: SampleDataRow[],
  key: keyof SampleDataRow,
): Record<string, number> {
  const result: Record<string, { sum: number; count: number }> = {};
  for (const row of data) {
    if (!result[row.country]) result[row.country] = { sum: 0, count: 0 };
    result[row.country].sum += row[key] as number;
    result[row.country].count += 1;
  }
  const avg: Record<string, number> = {};
  for (const [k, v] of Object.entries(result)) {
    avg[k] = v.sum / v.count;
  }
  return avg;
}

function aggregateByField(
  data: SampleDataRow[],
  groupKey: keyof SampleDataRow,
  valueKey: keyof SampleDataRow,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of data) {
    const group = row[groupKey] as string;
    result[group] = (result[group] ?? 0) + (row[valueKey] as number);
  }
  return result;
}
```

- [ ] **Step 2: 필터 바 컴포넌트 작성**

`src/components/filter-bar.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries } from "@/config/countries";
import { getMonths, getMediums } from "@/data/sample";

type FilterBarProps = {
  country: string;
  month: string;
  medium: string;
  onCountryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onMediumChange: (value: string) => void;
};

export function FilterBar({
  country,
  month,
  medium,
  onCountryChange,
  onMonthChange,
  onMediumChange,
}: FilterBarProps) {
  const months = getMonths();
  const mediums = getMediums();

  return (
    <div className="flex items-center gap-3">
      <Select value={country} onValueChange={onCountryChange}>
        <SelectTrigger className="w-[140px] rounded-lg">
          <SelectValue placeholder="전체 국가" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="rounded-lg">전체 국가</SelectItem>
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.code} className="rounded-lg">
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[130px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {months.map((m) => (
            <SelectItem key={m} value={m} className="rounded-lg">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={medium} onValueChange={onMediumChange}>
        <SelectTrigger className="w-[130px] rounded-lg">
          <SelectValue placeholder="전체 매체" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="rounded-lg">전체 매체</SelectItem>
          {mediums.map((m) => (
            <SelectItem key={m} value={m} className="rounded-lg">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 3: 데모 섹션 컨테이너 작성 (필터 상태 관리)**

`src/components/demo-section.tsx`:

```tsx
"use client";

import * as React from "react";
import { FilterBar } from "@/components/filter-bar";
import { sampleData, getMonths } from "@/data/sample";

export function DemoSection() {
  const months = getMonths();
  const [country, setCountry] = React.useState("all");
  const [month, setMonth] = React.useState(months[months.length - 1]);
  const [medium, setMedium] = React.useState("all");

  const filteredData = React.useMemo(() => {
    return sampleData.filter((row) => {
      if (country !== "all" && row.country !== country) return false;
      if (medium !== "all" && row.medium !== medium) return false;
      return true;
    });
  }, [country, medium]);

  const currentMonthData = React.useMemo(() => {
    return filteredData.filter((row) => row.month === month);
  }, [filteredData, month]);

  return (
    <section id="demo" className="px-6 pb-10">
      <p className="text-sm text-muted-foreground font-medium mb-4">라이브 데모</p>
      <FilterBar
        country={country}
        month={month}
        medium={medium}
        onCountryChange={setCountry}
        onMonthChange={setMonth}
        onMediumChange={setMedium}
      />
      <div className="mt-6 grid gap-6">
        {/* Task 5: KpiCards */}
        {/* Task 6: Charts */}
        {/* Task 7: DataTable */}
        {/* Task 8: InsightsCard */}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: page.tsx에 DemoSection 추가**

`src/app/page.tsx`의 `{/* Task 4에서 DemoSection 추가 */}` 를 다음으로 교체:

```tsx
import { DemoSection } from "@/components/demo-section";
// ...
<DemoSection />
```

- [ ] **Step 5: 브라우저에서 필터 드롭다운 동작 확인**

Expected: 3개 Select가 렌더링되고 국가/기간/매체 선택 가능

- [ ] **Step 6: 커밋**

```bash
cd D:/code/project-junwan
git add src/lib/insights.ts src/components/filter-bar.tsx src/components/demo-section.tsx src/app/page.tsx
git commit -m "feat: add filter bar with state management and insights logic"
```

---

## Task 5: KPI 카드

**Files:**
- Create: `src/components/kpi-cards.tsx`
- Modify: `src/components/demo-section.tsx`

- [ ] **Step 1: KPI 카드 컴포넌트 작성**

`src/components/kpi-cards.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type SampleDataRow } from "@/data/sample";
import { dashboardConfig } from "@/config/dashboard";
import { metrics } from "@/config/metrics";
import { formatNumber, formatPercentage, formatChangeRate } from "@/lib/format";

type KpiCardsProps = {
  currentData: SampleDataRow[];
  previousData: SampleDataRow[];
};

function computeKpi(data: SampleDataRow[], metricKey: string): number {
  if (data.length === 0) return 0;
  const values = data.map((d) => d[metricKey as keyof SampleDataRow] as number);
  const metric = metrics.find((m) => m.key === metricKey);
  if (metric?.format === "percentage") {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  return values.reduce((a, b) => a + b, 0);
}

function formatKpiValue(value: number, metricKey: string): string {
  const metric = metrics.find((m) => m.key === metricKey);
  if (!metric) return String(value);
  switch (metric.format) {
    case "currency":
      return `₩${(value / 100000000).toFixed(1)}억`;
    case "percentage":
      return formatPercentage(value);
    case "number":
      return formatNumber(value);
  }
}

export function KpiCards({ currentData, previousData }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {dashboardConfig.kpiCards.map((key) => {
        const metric = metrics.find((m) => m.key === key);
        if (!metric) return null;
        const current = computeKpi(currentData, key);
        const previous = computeKpi(previousData, key);
        const change = formatChangeRate(current, previous);
        const isPositive = change.startsWith("+");

        return (
          <Card key={key}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {formatKpiValue(current, key)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{change}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: demo-section.tsx에 KpiCards 추가**

`demo-section.tsx`에서 `{/* Task 5: KpiCards */}` 를 다음으로 교체:

```tsx
import { KpiCards } from "@/components/kpi-cards";

// filteredData와 동일 레벨에 previousData 추가:
const previousMonthData = React.useMemo(() => {
  const months = getMonths();
  const currentIdx = months.indexOf(month);
  const prevMonth = currentIdx > 0 ? months[currentIdx - 1] : null;
  if (!prevMonth) return [];
  return filteredData.filter((row) => row.month === prevMonth);
}, [filteredData, month]);

// JSX 내:
<KpiCards currentData={currentMonthData} previousData={previousMonthData} />
```

- [ ] **Step 3: 브라우저에서 KPI 카드 렌더링 확인**

Expected: 4개 카드가 가로로 나열, 각각 지표명/값/변화율 표시

- [ ] **Step 4: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/kpi-cards.tsx src/components/demo-section.tsx
git commit -m "feat: add KPI cards with change rate badges"
```

---

## Task 6: 차트 영역 (Area + Bar + Radial)

**Files:**
- Create: `src/components/area-chart.tsx`, `src/components/bar-chart.tsx`, `src/components/radial-chart.tsx`
- Modify: `src/components/demo-section.tsx`

- [ ] **Step 1: Area Chart 컴포넌트 작성**

`src/components/area-chart.tsx`:

```tsx
"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";
import { countries } from "@/config/countries";

type RoasAreaChartProps = {
  data: SampleDataRow[];
};

const chartConfig = Object.fromEntries(
  countries.map((c, i) => [
    c.code.toLowerCase(),
    { label: c.name, color: `var(--chart-${i + 1})` },
  ]),
) as Record<string, { label: string; color: string }> satisfies ChartConfig;

function pivotByMonth(data: SampleDataRow[]) {
  const grouped: Record<string, Record<string, number>> = {};
  for (const row of data) {
    if (!grouped[row.month]) grouped[row.month] = {};
    const key = row.country.toLowerCase();
    if (!grouped[row.month][key]) grouped[row.month][key] = 0;
    grouped[row.month][key] =
      (grouped[row.month][key] * 0 + row.roas + (grouped[row.month][key] || 0)) / 1;
    // 간단 평균: 같은 월/국가의 매체별 평균
    const entries = data.filter((d) => d.month === row.month && d.country === row.country);
    grouped[row.month][key] =
      entries.reduce((sum, e) => sum + e.roas, 0) / entries.length;
  }
  return Object.entries(grouped)
    .map(([month, values]) => ({ month, ...values }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function RoasAreaChart({ data }: RoasAreaChartProps) {
  const chartData = pivotByMonth(data);
  const countryKeys = countries.map((c) => c.code.toLowerCase());

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>ROAS 추이</CardTitle>
          <CardDescription>국가별 ROAS 6개월 트렌드</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={chartData}>
            <defs>
              {countryKeys.map((key) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {countryKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                stackId="a"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Bar Chart 컴포넌트 작성**

`src/components/bar-chart.tsx`:

```tsx
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";

type MediumBarChartProps = {
  data: SampleDataRow[];
};

const chartConfig = {
  adSpend: { label: "광고비", color: "var(--chart-1)" },
  revenue: { label: "결제금액", color: "var(--chart-2)" },
} satisfies ChartConfig;

function aggregateByMedium(data: SampleDataRow[]) {
  const grouped: Record<string, { adSpend: number; revenue: number }> = {};
  for (const row of data) {
    if (!grouped[row.medium]) grouped[row.medium] = { adSpend: 0, revenue: 0 };
    grouped[row.medium].adSpend += row.adSpend;
    grouped[row.medium].revenue += row.revenue;
  }
  return Object.entries(grouped).map(([medium, values]) => ({ medium, ...values }));
}

export function MediumBarChart({ data }: MediumBarChartProps) {
  const [activeMetric, setActiveMetric] =
    React.useState<"adSpend" | "revenue">("adSpend");
  const chartData = aggregateByMedium(data);

  const totals = React.useMemo(() => ({
    adSpend: chartData.reduce((sum, d) => sum + d.adSpend, 0),
    revenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
  }), [chartData]);

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3">
          <CardTitle>매체별 성과</CardTitle>
          <CardDescription>매체별 광고비/결제금액 비교</CardDescription>
        </div>
        <div className="flex">
          {(["adSpend", "revenue"] as const).map((key) => (
            <button
              key={key}
              data-active={activeMetric === key}
              className="relative flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-6 sm:py-4"
              onClick={() => setActiveMetric(key)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold">
                ₩{(totals[key] / 100000000).toFixed(1)}억
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="medium" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={activeMetric} fill={`var(--color-${activeMetric})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Radial Chart 컴포넌트 작성**

`src/components/radial-chart.tsx`:

```tsx
"use client";

import {
  Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart,
} from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, type ChartConfig,
} from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";

type GoalRadialChartProps = {
  data: SampleDataRow[];
};

const TARGET_ROAS = 400;

const chartConfig = {
  roas: { label: "ROAS", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function GoalRadialChart({ data }: GoalRadialChartProps) {
  const avgRoas =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.roas, 0) / data.length
      : 0;
  const achievementRate = Math.min((avgRoas / TARGET_ROAS) * 100, 100);
  const endAngle = (achievementRate / 100) * 360;

  const chartData = [{ roas: achievementRate, fill: "var(--color-roas)" }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>목표 달성률</CardTitle>
        <CardDescription>ROAS 목표: {TARGET_ROAS}%</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={endAngle}
            innerRadius={80}
            outerRadius={90}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[90, 80]}
            />
            <RadialBar dataKey="roas" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          {achievementRate.toFixed(0)}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-sm">
                          달성률
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: demo-section.tsx에 차트 추가**

`demo-section.tsx`에서 `{/* Task 6: Charts */}` 를 다음으로 교체:

```tsx
import { RoasAreaChart } from "@/components/area-chart";
import { MediumBarChart } from "@/components/bar-chart";
import { GoalRadialChart } from "@/components/radial-chart";

// JSX 내:
<RoasAreaChart data={filteredData} />
<div className="grid grid-cols-2 gap-4">
  <MediumBarChart data={currentMonthData} />
  <GoalRadialChart data={currentMonthData} />
</div>
```

- [ ] **Step 5: 브라우저에서 3개 차트 렌더링 확인**

Expected: Area Chart(부드러운 곡선 + 그라데이션), Bar Chart(탭 전환), Radial Chart(달성률 %) 모두 표시

- [ ] **Step 6: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/area-chart.tsx src/components/bar-chart.tsx src/components/radial-chart.tsx src/components/demo-section.tsx
git commit -m "feat: add area, bar, and radial charts with shadcn chart components"
```

---

## Task 7: 상세 데이터 테이블

**Files:**
- Create: `src/components/data-table.tsx`
- Modify: `src/components/demo-section.tsx`

- [ ] **Step 1: 데이터 테이블 컴포넌트 작성**

`src/components/data-table.tsx`:

```tsx
"use client";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { type SampleDataRow } from "@/data/sample";
import { countries } from "@/config/countries";
import { dashboardConfig } from "@/config/dashboard";
import { metrics } from "@/config/metrics";
import { formatNumber, formatPercentage } from "@/lib/format";

type DataTableProps = {
  data: SampleDataRow[];
};

function aggregateByCountry(data: SampleDataRow[]) {
  const grouped: Record<string, Record<string, number>> = {};
  for (const row of data) {
    if (!grouped[row.country]) grouped[row.country] = {};
    for (const col of dashboardConfig.table.columns) {
      const value = row[col as keyof SampleDataRow] as number;
      if (!grouped[row.country][col]) grouped[row.country][col] = 0;
      grouped[row.country][col] += value;
    }
    grouped[row.country]._count = (grouped[row.country]._count ?? 0) + 1;
  }
  // 평균이 필요한 지표 처리
  for (const [, values] of Object.entries(grouped)) {
    const count = values._count ?? 1;
    for (const col of dashboardConfig.table.columns) {
      const metric = metrics.find((m) => m.key === col);
      if (metric?.format === "percentage") {
        values[col] = values[col] / count;
      }
    }
  }
  return grouped;
}

function formatValue(value: number, metricKey: string): string {
  const metric = metrics.find((m) => m.key === metricKey);
  if (!metric) return String(value);
  switch (metric.format) {
    case "currency":
      return `₩${formatNumber(Math.round(value))}`;
    case "percentage":
      return formatPercentage(value);
    case "number":
      return formatNumber(value);
  }
}

export function DataTable({ data }: DataTableProps) {
  const aggregated = aggregateByCountry(data);
  const tableColumns = dashboardConfig.table.columns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>상세 데이터</CardTitle>
        <CardDescription>국가별 핵심 지표 요약</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>국가</TableHead>
              {tableColumns.map((col) => {
                const metric = metrics.find((m) => m.key === col);
                return (
                  <TableHead key={col} className="text-right">
                    {metric?.label ?? col}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((c) => {
              const values = aggregated[c.code];
              if (!values) return null;
              return (
                <TableRow key={c.code}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  {tableColumns.map((col) => (
                    <TableCell key={col} className="text-right text-muted-foreground">
                      {formatValue(values[col] ?? 0, col)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: demo-section.tsx에 DataTable 추가**

`{/* Task 7: DataTable */}` 를 다음으로 교체:

```tsx
import { DataTable } from "@/components/data-table";
// JSX:
<DataTable data={currentMonthData} />
```

- [ ] **Step 3: 브라우저에서 테이블 렌더링 확인**

Expected: 국가별 행, 4개 컬럼(광고비/결제금액/ROAS/가입CPA) 표시

- [ ] **Step 4: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/data-table.tsx src/components/demo-section.tsx
git commit -m "feat: add data table with country aggregation"
```

---

## Task 8: AI 인사이트 카드

**Files:**
- Create: `src/components/insights-card.tsx`
- Modify: `src/components/demo-section.tsx`

- [ ] **Step 1: 인사이트 카드 컴포넌트 작성**

`src/components/insights-card.tsx`:

```tsx
"use client";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { type Insight } from "@/lib/insights";

type InsightsCardProps = {
  insights: Insight[];
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 인사이트</CardTitle>
        <CardDescription>데이터 기반 자동 분석</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm text-muted-foreground">
          {insights.map((insight) => (
            <p key={insight.id}>• {insight.text}</p>
          ))}
          {insights.length === 0 && (
            <p>선택한 조건에 해당하는 인사이트가 없습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: demo-section.tsx에 InsightsCard 추가**

`{/* Task 8: InsightsCard */}` 를 다음으로 교체:

```tsx
import { InsightsCard } from "@/components/insights-card";
import { generateInsights } from "@/lib/insights";

// useMemo 추가:
const insights = React.useMemo(
  () => generateInsights(filteredData, month),
  [filteredData, month],
);

// JSX:
<InsightsCard insights={insights} />
```

- [ ] **Step 3: 브라우저에서 인사이트 카드 렌더링 확인**

Expected: 3-5개 인사이트 텍스트가 카드 안에 표시, 필터 변경 시 인사이트 갱신

- [ ] **Step 4: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/insights-card.tsx src/components/demo-section.tsx
git commit -m "feat: add AI insights card with rule-based analysis"
```

---

## Task 9: 최종 통합 + 빌드 확인

**Files:**
- Modify: `src/components/demo-section.tsx` (최종 정리), `src/app/page.tsx`

- [ ] **Step 1: demo-section.tsx 최종 통합 확인**

`src/components/demo-section.tsx`가 모든 하위 컴포넌트를 올바르게 import하고 있는지 확인. 전체 파일이 하나의 완성된 컴포넌트인지 검증.

- [ ] **Step 2: 프로덕션 빌드 확인**

```bash
cd D:/code/project-junwan
npm run build
```

Expected: 빌드 성공, 에러 없음

- [ ] **Step 3: 프로덕션 서버 확인**

```bash
cd D:/code/project-junwan
npm run start
```

Expected: `http://localhost:3000`에서 전체 랜딩 페이지가 정상 렌더링:
- 네비게이션
- 히어로 (중앙 정렬, 핵심 수치)
- 필터 바 (국가/기간/매체)
- KPI 카드 4개
- Area Chart (부드러운 곡선 + 그라데이션)
- Bar Chart + Radial Chart (2열)
- 상세 테이블
- AI 인사이트
- 푸터

- [ ] **Step 4: .gitignore 확인 및 최종 커밋**

`.superpowers/` 가 `.gitignore`에 포함되어 있는지 확인하고 추가.

```bash
cd D:/code/project-junwan
echo ".superpowers/" >> .gitignore
git add -A
git commit -m "feat: complete AdInsight landing page with interactive demo"
```
