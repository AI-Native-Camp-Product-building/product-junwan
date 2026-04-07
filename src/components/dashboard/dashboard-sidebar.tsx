"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconBuildingStore,
  IconSpeakerphone,
  IconSearch,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SyncStatus } from "@/components/dashboard/sync-status";

const navMain = [
  { title: "홈", href: "/dashboard", icon: IconHome },
  { title: "탐색", href: "/dashboard/explore", icon: IconSearch },
  { title: "플랫폼별", href: "/dashboard/platform", icon: IconBuildingStore },
  { title: "매체별", href: "/dashboard/medium", icon: IconSpeakerphone },
];

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="bg-white/[0.02] border-r border-white/[0.06] backdrop-blur-xl"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <span
                className="text-base font-semibold tracking-tight"
                style={{
                  color: "rgba(100, 149, 237, 0.9)",
                  textShadow: "0 0 20px rgba(100, 149, 237, 0.3)",
                }}
              >
                AdInsight
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="flex flex-col gap-1 px-2">
          {navMain.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/[0.04] text-white/90"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                      style={{
                        backgroundColor: "rgba(100, 149, 237, 0.9)",
                        boxShadow: "0 0 6px rgba(100, 149, 237, 0.4)",
                      }}
                    />
                  )}
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <div className="mt-auto flex flex-col gap-1 px-2">
          <Separator className="my-2 bg-white/[0.06]" />
          <SyncStatus />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
