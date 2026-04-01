import { landingContent } from "@/config/content";

export function Footer() {
  return (
    <footer className="py-6 text-center border-t border-border">
      <p className="text-xs text-muted-foreground">{landingContent.footer}</p>
    </footer>
  );
}
