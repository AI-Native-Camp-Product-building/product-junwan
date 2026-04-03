"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function DashboardHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
      <span className="text-sm font-medium text-muted-foreground">
        AdInsight Dashboard
      </span>
    </header>
  );
}
