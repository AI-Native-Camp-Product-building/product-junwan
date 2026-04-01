import { Button } from "@/components/ui/button";
import { landingContent } from "@/config/content";

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border">
      <span className="text-sm font-semibold tracking-tight">
        {landingContent.productName}
      </span>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <a href="#demo" className="hover:text-foreground transition-colors">데모</a>
        <Button size="sm">시작하기</Button>
      </div>
    </nav>
  );
}
