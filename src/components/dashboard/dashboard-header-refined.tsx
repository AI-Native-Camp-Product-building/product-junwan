"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeaderRefined() {
  return (
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
      <div className="flex flex-1 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          AmInsight Dashboard
        </span>
      </div>
      {/* KEYWORD: dashboard-global-page-nav */}
    </header>
  );
}
