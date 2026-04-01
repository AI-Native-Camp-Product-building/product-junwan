# AdInsight 랜딩 페이지 리디자인 스펙

## 개요

기존 더미 데이터 대시보드(필터/KPI/차트/테이블/인사이트)를 모두 제거하고, 스크롤 기반 인터랙티브 애니메이션 랜딩 페이지로 전면 교체한다.

**핵심 컨셉: Convergence Flow** — 흩어진 데이터 조각들이 스크롤에 따라 하나로 수렴하고, 시각화로 변환되며, 최종 CTA로 이어지는 3-section 구조.

## 페이지 구조

```
Nav (고정)
├── Section 1: Hero — 글래스 카드 데이터 조각들이 부유 → 스크롤 시 중앙으로 응축
├── Section 2: Chart Showcase — 시네마틱 글래스 카드에 장식용 차트 3종 (숫자 없음)
└── Section 3: CTA — "Get Started" 고스트 버튼 + 다중 레이어 블룸
Footer (심플)
```

## Section 1: Hero — Convergence

### 초기 상태 (스크롤 전)

- 화면 전체에 6-8개의 **글래스모피즘 카드**가 흩어져 부유
- 각 카드: `background: rgba(255,255,255,0.05)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 12px`
- 카드 내용: 상단에 국기 이모지(🇰🇷 🇯🇵 🇺🇸 🇩🇪 🇫🇷 🇹🇭 🇹🇼 🇪🇸), 하단에 지표값(CTR 3.2%, ROAS 324%, ₩2.4억, $12.5K, ¥1.2M 등)
- 국가코드 텍스트 없이 이모지만으로 국가를 표현 — 더 직관적이고 시각적
- 각 카드는 살짝 기울어진 채 (`rotate(-5deg)` ~ `rotate(7deg)`) CSS 키프레임으로 미세하게 떠다님 (float animation)
- 중앙에 헤드카피: "10개국 마케팅 성과, 한눈에" (큰 폰트, `text-3xl` ~ `text-4xl`)
- 하단에 서브카피 + 스크롤 유도 화살표

### 스크롤 전환

- 스크롤 진행에 따라 모든 글래스 카드가 화면 중앙으로 이동
- 동시에 opacity 감소, scale 축소
- 최종적으로 중앙의 "AdInsight" 로고 텍스트 하나로 응축
- 응축 완료 후 로고가 페이드아웃하며 Section 2로 전환

### 기술

- `IntersectionObserver` + CSS `transform` + `opacity` 트랜지션
- 또는 `scroll-driven animations` (CSS native)
- 각 카드에 `--delay` CSS 변수로 시차(stagger) 적용

## Section 2: Chart Showcase — Cinematic Cards

### 레이아웃

- 3개의 글래스 카드가 가로로 배치, 엇갈린 높이 (staggered Y offset)
- 각 카드: `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 14px`, `box-shadow: 0 20px 40px rgba(0,0,0,0.3)`
- 카드 1: Area Chart (곡선 + 그라데이션 fill)
- 카드 2: Bar Chart (수직 막대)
- 카드 3: Radial Chart (도넛형 진행률)

### 차트 사양

- **숫자/라벨 없음** — 순수 시각적 형태만
- 모든 차트는 SVG로 구현 (Recharts 불필요)
- 차트 컬러: `rgba(100,149,237, 0.3~0.6)` 계열 (shadcn chart-1 기반 블루)
- Area Chart: `linearGradient` fill + 곡선 stroke
- Bar Chart: `rx: 4` 라운드 막대, 다양한 높이
- Radial Chart: `stroke-dasharray`로 진행률 표현, `stroke-linecap: round`

### 애니메이션

- 스크롤로 viewport에 진입하면 각 카드가 아래에서 위로 올라옴 (`translateY(60px) → 0`)
- 카드 진입 후 내부 차트가 draw-in 애니메이션:
  - Area: path가 왼쪽에서 오른쪽으로 그려짐 (`stroke-dashoffset` 애니메이션)
  - Bar: 각 막대가 아래에서 위로 성장 (`scaleY(0) → scaleY(1)`, `transform-origin: bottom`)
  - Radial: `stroke-dasharray`가 0에서 목표값까지 증가
- 카드 간 0.2s 시차 (stagger)

## Section 3: CTA — Ghost Button + Layered Bloom

### 레이아웃 (뷰포트 중앙)

- 상단 라벨: "READY TO START?" (`font-size: 15px`, `letter-spacing: 2px`, `color: rgba(255,255,255,0.4)`)
- 메인 헤드카피: "데이터의 힘을 경험하세요" (`font-size: 42px`, `font-weight: 700`, `letter-spacing: -1px`)
- 하단: Ghost Button "Get Started →"

### Ghost Button 스타일

```css
.cta-button {
  padding: 18px 52px;
  background: transparent;
  color: rgba(255,255,255, 0.95);
  font-size: 17px;
  font-weight: 500;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255, 0.2);
  backdrop-filter: blur(8px);
  box-shadow: 0 0 30px rgba(100,149,237, 0.15),
              inset 0 0 20px rgba(100,149,237, 0.05);
  transition: all 0.3s;
}
.cta-button:hover {
  border-color: rgba(255,255,255, 0.35);
  box-shadow: 0 0 50px rgba(100,149,237, 0.25),
              inset 0 0 30px rgba(100,149,237, 0.08);
}
```

### 블룸 효과

- **Layer 1 (외부)**: 500px 원형 `radial-gradient`, `rgba(100,149,237, 0.1)`, 5초 pulse 애니메이션
- **Layer 2 (내부)**: 250px 원형 `radial-gradient`, `rgba(130,120,237, 0.08)`, 3초 pulse 애니메이션 (다른 주기)
- 두 레이어가 겹치며 유기적인 맥동 효과 생성

### 애니메이션

- 스크롤 진입 시: 블룸이 `scale(0.5) opacity(0)` → `scale(1) opacity(1)` 로 확장
- 헤드카피와 버튼은 블룸 직후 `translateY(20px) opacity(0)` → `translateY(0) opacity(1)`
- 블룸은 진입 후에도 계속 맥동 (무한 pulse)

## Nav (수정)

- 기존 유지하되 "데모" 링크 제거
- 좌측: "AdInsight" 로고
- 우측: "Get Started" 버튼 (작은 사이즈)

## Footer (수정)

- 기존 유지: "이 웹사이트는 데모버전입니다. 외부에 공유하지 말아주세요."

## 삭제 대상

### 컴포넌트 (삭제)

- `demo-section.tsx` — 전체 삭제
- `filter-bar.tsx` — 삭제
- `kpi-cards.tsx` — 삭제
- `area-chart.tsx` — 삭제 (새 SVG 차트로 대체)
- `bar-chart.tsx` — 삭제
- `radial-chart.tsx` — 삭제
- `data-table.tsx` — 삭제
- `insights-card.tsx` — 삭제

### 유지

- `nav.tsx` — 수정 (데모 링크 제거)
- `hero.tsx` — 전면 재작성
- `footer.tsx` — 유지

### 신규 생성

- `hero-section.tsx` — Section 1: 글래스 카드 부유 + 스크롤 응축 ("use client")
- `chart-showcase.tsx` — Section 2: 시네마틱 차트 카드 ("use client")
- `cta-section.tsx` — Section 3: Ghost Button + Bloom ("use client")

## 기술 스택

- **애니메이션**: CSS keyframes + IntersectionObserver (추가 라이브러리 없음)
- **차트**: 인라인 SVG (Recharts 불필요 — 장식용이므로)
- **스타일**: Tailwind CSS v4 + 인라인 CSS 변수 (shadcn 테마 유지)
- **의존성 추가**: 없음

## 디자인 시스템 일관성

- 글래스 카드 스타일: Hero 조각 ↔ Chart 카드 ↔ CTA 버튼 모두 동일한 glass 언어
- 컬러: shadcn neutral dark + `rgba(100,149,237)` 블루 엑센트
- 모든 카드: `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255, 0.05~0.1)`
- 라운드: `border-radius: 10px~14px`

## 범위 외

- 모바일 반응형 (데스크톱 우선)
- 라이트 모드
- 실제 데이터 연동 (순수 랜딩 페이지)
