import { landingContent } from "@/config/content";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06]">
      <span className="text-[15px] font-semibold tracking-tight text-white/90">
        {landingContent.productName}
      </span>
      <a
        href="#cta"
        className="text-sm text-white/50 hover:text-[rgba(100,149,237,0.9)] transition-colors"
      >
        Get Started
      </a>
    </nav>
  );
}
