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
  const target = circumference * 0.75;

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
    <section ref={ref} className="relative flex items-center justify-center px-6 py-32 min-h-[60vh]">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm ${card.offset}`}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? undefined : "translateY(60px)",
              transition: `opacity 0.6s ease-out ${i * 0.2}s, transform 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${i * 0.2}s`,
              width: card.label === "GOAL" ? "140px" : "180px",
              willChange: "transform, opacity",
            }}
          >
            <div className="mb-3 text-[11px] font-medium tracking-widest text-white/40">
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
