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
