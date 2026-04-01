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

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const sectionHeight = section.offsetHeight;
        const viewportHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - viewportHeight;
        const p = Math.max(0, Math.min(1, scrolled / total));
        setProgress(p);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const { hero } = landingContent;

  return (
    <section ref={sectionRef} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Glass card fragments */}
        {fragments.map((frag, i) => {
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
                willChange: "transform, opacity",
              }}
            >
              <div
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md shadow-[0_0_24px_rgba(100,149,237,0.05)]"
                style={{
                  animation: "float 3s ease-in-out infinite",
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

        {/* Center headline */}
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
          <span
            className="text-3xl font-bold tracking-tight text-white/90"
            style={{ textShadow: "0 0 40px rgba(100,149,237,0.35), 0 0 80px rgba(100,149,237,0.12)" }}
          >
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
