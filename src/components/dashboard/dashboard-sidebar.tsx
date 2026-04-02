"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChartBar,
  IconTable,
  IconChartDots,
  IconSettings,
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
  {
    title: "Overview",
    href: "/dashboard",
    icon: IconChartBar,
  },
  {
    title: "Data Explorer",
    href: "/dashboard/explorer",
    icon: IconTable,
  },
  {
    title: "Analysis",
    href: "/dashboard/analysis",
    icon: IconChartDots,
  },
];

const navSecondary = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
  },
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
            const isActive = pathname === item.href;
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
          <SidebarMenu>
            {navSecondary.map((item) => {
              const isActive = pathname === item.href;
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
          <Separator className="my-2 bg-white/[0.06]" />
          <SyncStatus />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
