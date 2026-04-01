# AdInsight 랜딩 페이지 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 더미 대시보드 랜딩을 스크롤 기반 인터랙티브 애니메이션 랜딩 페이지(Convergence Flow)로 전면 교체한다.

**Architecture:** 3-section 구조 (Hero → Chart Showcase → CTA). 모든 애니메이션은 CSS keyframes + IntersectionObserver로 구현하며 추가 라이브러리 없음. 장식용 차트는 인라인 SVG. 글래스모피즘 디자인 언어를 전체에 일관 적용.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, 인라인 SVG, CSS keyframes, IntersectionObserver

**Skills 참조:**
- `frontend-design` — 디자인 품질, 글래스모피즘, 고급 시각효과
- `web-animation-design` — 이징(ease-out 위주), 타이밍(150~400ms), `prefers-reduced-motion`
- `frontend-ui-animator` — `useScrollReveal` 훅, stagger 패턴, Tailwind 키프레임 프리셋
- `shadcn` — 컴포넌트 스타일링 규칙 (semantic color, `gap-*`, Card composition)

---

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx              # 유지 (변경 없음)
│   ├── page.tsx                # 수정: 새 섹션 구조로 교체
│   └── globals.css             # 수정: 애니메이션 키프레임 + reduced-motion 추가
├── components/
│   ├── nav.tsx                 # 수정: "데모" 링크 제거
│   ├── hero-section.tsx        # 신규: 글래스카드 부유 + 스크롤 응축 ("use client")
│   ├── chart-showcase.tsx      # 신규: 시네마틱 차트 카드 3종 ("use client")
│   ├── cta-section.tsx         # 신규: Ghost Button + Bloom ("use client")
│   ├── footer.tsx              # 유지 (변경 없음)
│   └── ui/                     # 유지 (shadcn 컴포넌트)
├── hooks/
│   └── use-scroll-reveal.ts    # 신규: IntersectionObserver 기반 스크롤 감지 훅
├── config/
│   └── content.ts              # 수정: CTA 섹션 텍스트 추가
└── 삭제 대상:
    ├── components/demo-section.tsx
    ├── components/filter-bar.tsx
    ├── components/kpi-cards.tsx
    ├── components/area-chart.tsx
    ├── components/bar-chart.tsx
    ├── components/radial-chart.tsx
    ├── components/data-table.tsx
    ├── components/insights-card.tsx
    └── components/hero.tsx
```

---

## Task 1: 기존 컴포넌트 정리 + 애니메이션 기반 구축

**Files:**
- Delete: `src/components/demo-section.tsx`, `src/components/filter-bar.tsx`, `src/components/kpi-cards.tsx`, `src/components/area-chart.tsx`, `src/components/bar-chart.tsx`, `src/components/radial-chart.tsx`, `src/components/data-table.tsx`, `src/components/insights-card.tsx`, `src/components/hero.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/nav.tsx`
- Modify: `src/config/content.ts`

- [ ] **Step 1: 사용하지 않을 컴포넌트 삭제**

```bash
cd D:/code/project-junwan
rm src/components/demo-section.tsx
rm src/components/filter-bar.tsx
rm src/components/kpi-cards.tsx
rm src/components/area-chart.tsx
rm src/components/bar-chart.tsx
rm src/components/radial-chart.tsx
rm src/components/data-table.tsx
rm src/components/insights-card.tsx
rm src/components/hero.tsx
```

- [ ] **Step 2: globals.css에 애니메이션 키프레임 + reduced-motion 추가**

`src/app/globals.css` 하단 `@layer base` 블록 뒤에 추가:

```css
/* === ANIMATION KEYFRAMES === */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
  50% { transform: translateY(-12px) rotate(var(--rotate, 0deg)); }
}

@keyframes converge {
  to {
    transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.3);
    opacity: 0;
  }
}

@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(40px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes draw-line {
  from { stroke-dashoffset: var(--path-length, 300); }
  to { stroke-dashoffset: 0; }
}

@keyframes grow-bar {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes fill-radial {
  from { stroke-dasharray: 0 999; }
  to { stroke-dasharray: var(--target-dash, 165) 999; }
}

@keyframes pulse-bloom {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
}

@keyframes pulse-bloom-inner {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === REDUCED MOTION === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: nav.tsx 수정 — "데모" 링크 제거**

`src/components/nav.tsx` 전체를 다음으로 교체:

```tsx
import { landingContent } from "@/config/content";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border">
      <span className="text-sm font-semibold tracking-tight">
        {landingContent.productName}
      </span>
      <a
        href="#cta"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Get Started
      </a>
    </nav>
  );
}
```

- [ ] **Step 4: content.ts 수정 — CTA 섹션 텍스트 추가**

`src/config/content.ts` 전체를 다음으로 교체:

```ts
export const landingContent = {
  productName: "AdInsight",
  hero: {
    headline: "10개국 마케팅 성과,\n한눈에",
    subheadline: "산발된 광고 데이터를 하나로 모읍니다",
    scrollHint: "Scroll to explore",
  },
  cta: {
    label: "READY TO START?",
    headline: "데이터의 힘을\n경험하세요",
    buttonText: "Get Started",
    buttonUrl: "/dashboard",
  },
  footer: "이 웹사이트는 데모버전입니다. 외부에 공유하지 말아주세요.",
};
```

- [ ] **Step 5: 커밋**

```bash
cd D:/code/project-junwan
git add -A
git commit -m "refactor: remove demo components, add animation keyframes and update config"
```

---

## Task 2: useScrollReveal 훅 생성

**Files:**
- Create: `src/hooks/use-scroll-reveal.ts`

- [ ] **Step 1: useScrollReveal 훅 작성**

`src/hooks/use-scroll-reveal.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const { threshold = 0.1, triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return { ref, isVisible };
}
```

- [ ] **Step 2: 커밋**

```bash
cd D:/code/project-junwan
git add src/hooks/use-scroll-reveal.ts
git commit -m "feat: add useScrollReveal hook for intersection-based animations"
```

---

## Task 3: Hero Section — 글래스카드 부유 + 스크롤 응축

**Files:**
- Create: `src/components/hero-section.tsx`

- [ ] **Step 1: hero-section.tsx 작성**

`src/components/hero-section.tsx`:

```tsx
"use client";

import * as React from "react";
import { landingContent } from "@/config/content";

const fragments = [
  { emoji: "🇰🇷", label: "₩2.4억", x: "12%", y: "18%", rotate: -5, delay: 0 },
  { emoji: "🇯🇵", label: "ROAS 324%", x: "72%", y: "12%", rotate: 3, delay: 0.2 },
  { emoji: "🇺🇸", label: "$12.5K", x: "82%", y: "55%", rotate: -3, delay: 0.4 },
  { emoji: "🇩🇪", label: "CTR 3.2%", x: "8%", y: "62%", rotate: 7, delay: 0.6 },
  { emoji: "🇫🇷", label: "€8,400", x: "25%", y: "78%", rotate: -4, delay: 0.8 },
  { emoji: "🇹🇭", label: "฿45,000", x: "65%", y: "75%", rotate: 5, delay: 1.0 },
  { emoji: "🇹🇼", label: "NT$38K", x: "45%", y: "8%", rotate: -2, delay: 0.3 },
  { emoji: "🇪🇸", label: "CPA €12", x: "88%", y: "32%", rotate: 4, delay: 0.7 },
];

export function HeroSection() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportHeight = window.innerHeight;
      // progress: 0 (top of section at viewport top) → 1 (bottom of section at viewport top)
      const scrolled = -rect.top;
      const total = sectionHeight - viewportHeight;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { hero } = landingContent;

  return (
    <section
      ref={sectionRef}
      className="relative h-[200vh]"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Glass card fragments */}
        {fragments.map((frag, i) => {
          // converge toward center as progress increases
          const centerX = 50;
          const centerY = 50;
          const fragX = parseFloat(frag.x);
          const fragY = parseFloat(frag.y);
          const currentX = fragX + (centerX - fragX) * progress;
          const currentY = fragY + (centerY - fragY) * progress;
          const scale = 1 - progress * 0.7;
          const opacity = 1 - progress * 1.2;

          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${currentX}%`,
                top: `${currentY}%`,
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${frag.rotate}deg)`,
                opacity: Math.max(0, opacity),
                transition: "none",
                willChange: "transform, opacity",
              }}
            >
              <div
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md"
                style={{
                  animation: `float 3s ease-in-out infinite`,
                  animationDelay: `${frag.delay}s`,
                  ["--rotate" as string]: `${frag.rotate}deg`,
                }}
              >
                <span className="text-2xl">{frag.emoji}</span>
                <span className="text-xs font-medium text-white/70">{frag.label}</span>
              </div>
            </div>
          );
        })}

        {/* Center headline — fades in as fragments converge, then fades out */}
        <div
          className="relative z-10 text-center px-6"
          style={{
            opacity: progress < 0.3 ? 1 : Math.max(0, 1 - (progress - 0.3) / 0.3),
          }}
        >
          <h1 className="text-4xl font-bold tracking-tight leading-tight whitespace-pre-line md:text-5xl">
            {hero.headline}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
            {hero.subheadline}
          </p>
        </div>

        {/* AdInsight logo — appears as fragments fully converge */}
        <div
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          style={{
            opacity: progress > 0.6 ? Math.min(1, (progress - 0.6) / 0.2) : 0,
          }}
        >
          <span className="text-3xl font-bold tracking-tight text-white/90">
            AdInsight
          </span>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: progress < 0.1 ? 1 : 0, transition: "opacity 0.3s" }}
        >
          <span className="text-xs text-muted-foreground tracking-widest">
            {hero.scrollHint}
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 개발 서버에서 확인**

```bash
cd D:/code/project-junwan
npm run dev
```

Expected: 아직 page.tsx를 수정하지 않았으므로 빌드 에러 가능 — Task 6에서 조립

- [ ] **Step 3: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/hero-section.tsx
git commit -m "feat: add hero section with floating glass cards and scroll convergence"
```

---

## Task 4: Chart Showcase — 시네마틱 카드 3종

**Files:**
- Create: `src/components/chart-showcase.tsx`

- [ ] **Step 1: chart-showcase.tsx 작성**

`src/components/chart-showcase.tsx`:

```tsx
"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

function AreaChartSvg({ isVisible }: { isVisible: boolean }) {
  return (
    <svg width="100%" height="80" viewBox="0 0 200 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(100,149,237,0.4)" />
          <stop offset="100%" stopColor="rgba(100,149,237,0)" />
        </linearGradient>
      </defs>
      <path
        d="M0,60 C30,50 50,20 80,35 C110,50 140,15 170,25 C185,30 195,22 200,24 L200,80 L0,80Z"
        fill="url(#areaFill)"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.8s ease-out 0.3s",
        }}
      />
      <path
        d="M0,60 C30,50 50,20 80,35 C110,50 140,15 170,25 C185,30 195,22 200,24"
        fill="none"
        stroke="rgba(100,149,237,0.6)"
        strokeWidth="2"
        strokeDasharray="300"
        style={{
          strokeDashoffset: isVisible ? 0 : 300,
          transition: "stroke-dashoffset 1.2s ease-out 0.2s",
        }}
      />
    </svg>
  );
}

function BarChartSvg({ isVisible }: { isVisible: boolean }) {
  const bars = [
    { x: 10, h: 45, delay: 0 },
    { x: 40, h: 60, delay: 0.1 },
    { x: 70, h: 35, delay: 0.2 },
    { x: 100, h: 55, delay: 0.3 },
    { x: 130, h: 25, delay: 0.4 },
    { x: 160, h: 65, delay: 0.5 },
  ];

  return (
    <svg width="100%" height="80" viewBox="0 0 200 80">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={80 - bar.h}
          width="20"
          height={bar.h}
          rx="4"
          fill={`rgba(100,149,237,${0.25 + i * 0.05})`}
          style={{
            transformOrigin: `${bar.x + 10}px 80px`,
            transform: isVisible ? "scaleY(1)" : "scaleY(0)",
            transition: `transform 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${0.3 + bar.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

function RadialChartSvg({ isVisible }: { isVisible: boolean }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * 0.75; // 75% fill

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle
        cx="45"
        cy="45"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="7"
      />
      <circle
        cx="45"
        cy="45"
        r={radius}
        fill="none"
        stroke="rgba(100,149,237,0.5)"
        strokeWidth="7"
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{
          strokeDashoffset: isVisible ? circumference - target : circumference,
          transition: "stroke-dashoffset 1s cubic-bezier(0.23, 1, 0.32, 1) 0.4s",
        }}
      />
    </svg>
  );
}

export function ChartShowcase() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });

  const cards = [
    { label: "ROAS TREND", offset: "translate-y-6", chart: <AreaChartSvg isVisible={isVisible} /> },
    { label: "BY MEDIUM", offset: "-translate-y-4", chart: <BarChartSvg isVisible={isVisible} /> },
    { label: "GOAL", offset: "translate-y-2", chart: <RadialChartSvg isVisible={isVisible} /> },
  ];

  return (
    <section ref={ref} className="relative flex items-center justify-center px-6 py-32">
      <div className="flex items-center gap-6">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm ${card.offset}`}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? undefined
                : "translateY(60px)",
              transition: `opacity 0.6s ease-out ${i * 0.2}s, transform 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${i * 0.2}s`,
              width: card.label === "GOAL" ? "140px" : "180px",
              willChange: "transform, opacity",
            }}
          >
            <div className="mb-3 text-[10px] font-medium tracking-widest text-white/30">
              {card.label}
            </div>
            <div className="flex items-center justify-center">
              {card.chart}
            </div>
          </div>
        ))}
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[120px] w-[350px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(100,149,237,0.06)_0%,transparent_70%)]" />
    </section>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/chart-showcase.tsx
git commit -m "feat: add cinematic chart showcase with draw-in animations"
```

---

## Task 5: CTA Section — Ghost Button + Layered Bloom

**Files:**
- Create: `src/components/cta-section.tsx`

- [ ] **Step 1: cta-section.tsx 작성**

`src/components/cta-section.tsx`:

```tsx
"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { landingContent } from "@/config/content";

export function CtaSection() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const { cta } = landingContent;

  return (
    <section
      id="cta"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
    >
      {/* Bloom layer 1 (outer) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(100,149,237,0.1) 0%, transparent 50%)",
          animation: isVisible ? "pulse-bloom 5s ease-in-out infinite" : "none",
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.5)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
          willChange: "transform, opacity",
        }}
      />

      {/* Bloom layer 2 (inner) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(130,120,237,0.08) 0%, transparent 60%)",
          animation: isVisible ? "pulse-bloom-inner 3s ease-in-out infinite" : "none",
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.5)",
          transition: "opacity 0.8s ease-out 0.2s, transform 0.8s ease-out 0.2s",
          willChange: "transform, opacity",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        <p
          className="text-[15px] font-light tracking-[2px] text-white/40"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s",
          }}
        >
          {cta.label}
        </p>

        <h2
          className="mt-3 whitespace-pre-line text-[42px] font-bold leading-tight tracking-tight text-white/95 md:text-5xl"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease-out 0.5s, transform 0.6s ease-out 0.5s",
          }}
        >
          {cta.headline}
        </h2>

        <div
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease-out 0.7s, transform 0.6s ease-out 0.7s",
          }}
        >
          <a
            href={cta.buttonUrl}
            className="mt-10 inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-transparent px-[52px] py-[18px] text-[17px] font-medium text-white/95 backdrop-blur-md transition-all duration-300 hover:border-white/35 hover:shadow-[0_0_50px_rgba(100,149,237,0.25),inset_0_0_30px_rgba(100,149,237,0.08)]"
            style={{
              boxShadow:
                "0 0 30px rgba(100,149,237,0.15), inset 0 0 20px rgba(100,149,237,0.05)",
            }}
          >
            {cta.buttonText}
            <span className="text-lg">&#8594;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
cd D:/code/project-junwan
git add src/components/cta-section.tsx
git commit -m "feat: add CTA section with ghost button and layered bloom effect"
```

---

## Task 6: page.tsx 조립 + 빌드 확인

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx를 새 섹션 구조로 교체**

`src/app/page.tsx` 전체를 다음으로 교체:

```tsx
import { Nav } from "@/components/nav";
import { HeroSection } from "@/components/hero-section";
import { ChartShowcase } from "@/components/chart-showcase";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1">
        <HeroSection />
        <ChartShowcase />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: 개발 서버 실행 확인**

```bash
cd D:/code/project-junwan
npm run dev
```

Expected: `http://localhost:1004` 에서:
1. 글래스 카드가 부유하는 Hero 섹션 표시
2. 스크롤하면 카드가 중앙으로 수렴
3. Chart Showcase 섹션에서 차트 카드가 순차 등장
4. CTA 섹션에서 블룸 효과 + Ghost Button 표시

- [ ] **Step 3: 빌드 확인**

```bash
cd D:/code/project-junwan
npm run build
```

Expected: 빌드 성공, 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd D:/code/project-junwan
git add src/app/page.tsx
git commit -m "feat: assemble new landing page with hero, chart showcase, and CTA sections"
```

---

## Task 7: 비주얼 QA + 미세 조정

**Files:**
- Modify: 필요에 따라 `hero-section.tsx`, `chart-showcase.tsx`, `cta-section.tsx`, `globals.css`

- [ ] **Step 1: 브라우저에서 전체 플로우 확인**

```bash
cd D:/code/project-junwan
npm run dev
```

체크리스트:
- [ ] Hero: 글래스 카드 8개가 화면에 잘 분산되어 부유하는가?
- [ ] Hero: 스크롤 시 카드가 중앙으로 부드럽게 수렴하는가?
- [ ] Hero: 헤드카피 → AdInsight 로고 전환이 자연스러운가?
- [ ] Chart: 3개 카드가 엇갈린 높이로 배치되었는가?
- [ ] Chart: 스크롤 진입 시 카드 등장 + 차트 draw-in이 작동하는가?
- [ ] CTA: 블룸 효과가 자연스럽게 맥동하는가?
- [ ] CTA: Ghost Button hover 시 글로우가 강화되는가?
- [ ] Nav: fixed 포지션, backdrop-blur 작동하는가?
- [ ] reduced-motion: 시스템 설정 변경 시 애니메이션이 비활성화되는가?

- [ ] **Step 2: 발견된 이슈 수정**

각 이슈를 수정하고 개별적으로 확인.

- [ ] **Step 3: 최종 빌드 확인**

```bash
cd D:/code/project-junwan
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 최종 커밋**

```bash
cd D:/code/project-junwan
git add -A
git commit -m "polish: visual QA fixes for landing page animations"
```
