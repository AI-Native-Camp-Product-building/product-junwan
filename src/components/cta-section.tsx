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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(100,149,237,0.2) 0%, rgba(100,149,237,0.05) 40%, transparent 60%)",
          animation: isVisible ? "pulse-bloom 4s ease-in-out infinite" : "none",
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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(130,120,237,0.18) 0%, rgba(100,149,237,0.05) 50%, transparent 70%)",
          animation: isVisible ? "pulse-bloom-inner 2.5s ease-in-out infinite" : "none",
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
