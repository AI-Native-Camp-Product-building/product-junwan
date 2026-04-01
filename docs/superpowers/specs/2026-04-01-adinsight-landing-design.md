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

한 화면에 아래 요소를 모두 배치. 모든 컴포넌트는 shadcn/ui 공식 블록/컴포넌트를 사용하며, shadcn 스타일링 규칙(semantic colors, `gap-*` 레이아웃, full Card composition)을 준수한다.

**3-1. 필터 바**

컴포넌트: `Select` + `SelectTrigger` + `SelectContent` + `SelectItem`

```tsx
// 패턴: chart-area-interactive의 Select 패턴 기반
<div className="flex items-center gap-3">
  <Select value={country} onValueChange={setCountry}>
    <SelectTrigger className="w-[160px] rounded-lg">
      <SelectValue placeholder="전체 국가" />
    </SelectTrigger>
    <SelectContent className="rounded-xl">
      <SelectItem value="all" className="rounded-lg">전체 국가</SelectItem>
      {countries.map(c => (
        <SelectItem key={c.code} value={c.code} className="rounded-lg">{c.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  {/* 동일 패턴으로 기간/매체 Select */}
</div>
```

- 필터 상태 변경 시 클라이언트에서 샘플 데이터 필터링
- 필터 옵션은 `config/countries.ts`, `config/metrics.ts`에서 파라미터화

**3-2. KPI 카드 4개**

컴포넌트: `Card` + `CardHeader` + `CardTitle` + `CardContent` + `Badge`

```tsx
// shadcn Card full composition 준수
<Card>
  <CardHeader>
    <CardDescription>총 광고비</CardDescription>
    <CardTitle className="text-2xl font-bold">₩2.4억</CardTitle>
  </CardHeader>
  <CardContent>
    <Badge variant="secondary">+12%</Badge>
  </CardContent>
</Card>
```

- KPI 항목 4개: 총 광고비, 총 결제금액, 평균 ROAS, 총 회원가입
- 변화율: `Badge variant="secondary"` 사용 (raw color 금지)
- KPI 항목 목록은 `config/dashboard.ts`의 `kpiCards`로 파라미터화
- 그리드: `className="grid grid-cols-4 gap-4"` (`space-*` 금지)

**3-3. 차트 영역**

모든 차트는 반드시 `Card` > `CardHeader`/`CardContent` > `ChartContainer` 구조를 따른다.
모든 차트 데이터 키는 `ChartConfig` 타입으로 레이블/컬러 매핑한다.
컬러는 반드시 `var(--chart-1)` ~ `var(--chart-5)` CSS 변수를 사용한다.

**메인 차트: Area Chart (Interactive + Gradient)**

기반 블록: `@shadcn/chart-area-interactive` + `@shadcn/chart-area-gradient`

```tsx
// ChartConfig 정의 — 국가별 매핑
const chartConfig = {
  kr: { label: "한국", color: "var(--chart-1)" },
  jp: { label: "일본", color: "var(--chart-2)" },
  us: { label: "미국", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Card 구조
<Card className="pt-0">
  <CardHeader className="flex items-center gap-2 border-b py-5 sm:flex-row">
    <div className="grid flex-1 gap-1">
      <CardTitle>ROAS 추이</CardTitle>
      <CardDescription>국가별 ROAS 6개월 트렌드</CardDescription>
    </div>
    <Select value={period} onValueChange={setPeriod}>
      {/* 기간 필터 — chart-area-interactive 패턴 */}
    </Select>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <AreaChart data={filteredData}>
        <defs>
          {/* 국가별 linearGradient — chart-area-gradient 패턴 */}
          <linearGradient id="fillKr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-kr)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-kr)" stopOpacity={0.1} />
          </linearGradient>
          {/* jp, us도 동일 패턴 */}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Area dataKey="kr" type="natural" fill="url(#fillKr)" stroke="var(--color-kr)" stackId="a" />
        <Area dataKey="jp" type="natural" fill="url(#fillJp)" stroke="var(--color-jp)" stackId="a" />
        <Area dataKey="us" type="natural" fill="url(#fillUs)" stroke="var(--color-us)" stackId="a" />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  </CardContent>
</Card>
```

핵심: `type="natural"` → 부드러운 곡선, `linearGradient` → 그라데이션 area fill

**보조 차트 1: Bar Chart (Interactive)**

기반 블록: `@shadcn/chart-bar-interactive`

```tsx
// 탭 전환으로 지표(광고비/결제금액) 변경 — chart-bar-interactive 패턴
<Card className="py-0">
  <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
    <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3">
      <CardTitle>매체별 성과</CardTitle>
      <CardDescription>매체별 광고비 비교</CardDescription>
    </div>
    {/* 탭 전환 버튼 (광고비/결제금액) — data-active 패턴 */}
  </CardHeader>
  <CardContent>
    <ChartContainer config={barConfig} className="aspect-auto h-[200px] w-full">
      <BarChart data={barData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="medium" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={activeMetric} fill={`var(--color-${activeMetric})`} />
      </BarChart>
    </ChartContainer>
  </CardContent>
</Card>
```

**보조 차트 2: Radial Chart (Text)**

기반 블록: `@shadcn/chart-radial-text`

```tsx
// 목표 달성률 — chart-radial-text 패턴
<Card className="flex flex-col">
  <CardHeader className="items-center pb-0">
    <CardTitle>목표 달성률</CardTitle>
    <CardDescription>이번 달 목표 대비</CardDescription>
  </CardHeader>
  <CardContent className="flex-1 pb-0">
    <ChartContainer config={radialConfig} className="mx-auto aspect-square max-h-[200px]">
      <RadialBarChart data={radialData} startAngle={0} endAngle={302} innerRadius={80} outerRadius={90}>
        <PolarGrid gridType="circle" radialLines={false} stroke="none"
          className="first:fill-muted last:fill-background" polarRadius={[90, 80]} />
        <RadialBar dataKey="value" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label content={/* 중앙에 달성률 % 표시 */} />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  </CardContent>
</Card>
```

**보조 차트 레이아웃**: `className="grid grid-cols-2 gap-4"` (`space-*` 금지)

**3-4. 상세 테이블**

컴포넌트: `Table` + `TableHeader` + `TableRow` + `TableHead` + `TableBody` + `TableCell`

```tsx
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
          <TableHead className="text-right">광고비</TableHead>
          <TableHead className="text-right">결제금액</TableHead>
          <TableHead className="text-right">ROAS</TableHead>
          <TableHead className="text-right">가입CPA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* 데이터 행 — config/countries.ts 기반 동적 렌더링 */}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

- 테이블 컬럼은 `config/dashboard.ts`의 `table.columns`로 파라미터화
- semantic class만 사용 (`text-muted-foreground` 등)

**3-5. AI 인사이트**

컴포넌트: `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent`

```tsx
<Card>
  <CardHeader>
    <CardTitle>AI 인사이트</CardTitle>
    <CardDescription>데이터 기반 자동 분석</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid gap-3 text-sm text-muted-foreground">
      {insights.map(insight => (
        <p key={insight.id}>{insight.text}</p>
      ))}
    </div>
  </CardContent>
</Card>
```

- 규칙 기반 인사이트: 전주/전월 대비 변화율, ROAS 상/하위 국가
- AI 인사이트: 데모에서는 샘플 텍스트 표시 (추후 LLM 연동)

#### 컴포넌트 설치 목록

```bash
npx shadcn@latest add card chart select table badge
```

#### shadcn 스타일링 규칙 체크리스트

- [ ] `space-y-*` / `space-x-*` 사용 금지 → `flex gap-*` 또는 `grid gap-*`
- [ ] raw color (`bg-blue-500` 등) 금지 → semantic tokens (`bg-primary`, `text-muted-foreground`)
- [ ] `dark:` 수동 오버라이드 금지 → CSS 변수가 자동 처리
- [ ] 차트 컬러는 `var(--chart-1)` ~ `var(--chart-5)` CSS 변수만 사용
- [ ] Card는 full composition (`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`)
- [ ] 아이콘에 수동 사이징 금지 → `data-icon` 속성 사용
- [ ] `size-*` 사용 (width=height일 때 `w-* h-*` 대신)

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
