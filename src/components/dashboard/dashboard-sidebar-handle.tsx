"use client";

import { IconChevronRight } from "@tabler/icons-react";

import { useSidebar } from "@/components/ui/sidebar";

export function DashboardSidebarHandle() {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const isVisible = isMobile ? !openMobile : state === "collapsed";

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="fixed left-0 top-1/2 z-50 flex h-14 w-7 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-white/[0.08] bg-background/90 text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:bg-white/[0.06] hover:text-foreground"
      aria-label="사이드바 펼치기"
    >
      <IconChevronRight className="size-4" />
    </button>
  );
}
