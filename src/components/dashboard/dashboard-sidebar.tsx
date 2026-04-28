"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  IconChevronDown,
  IconHome,
  IconLogout,
  IconMessageCircle,
  IconSearch,
  IconWorld,
} from "@tabler/icons-react";
import { useSession, signOut } from "next-auth/react";

import { isAdmin } from "@/lib/admin";
import { LOCALES } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { SyncStatus } from "@/components/dashboard/sync-status";

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [localeOpen, setLocaleOpen] = React.useState(true);

  const activeLocale = searchParams.get("locale");
  const isLocalePage = pathname.startsWith("/dashboard/locale");
  const feedbackTitle = isAdmin(session?.user?.email)
    ? "피드백 관리"
    : "피드백";

  const navMain = [
    { title: "홈", href: "/dashboard", icon: IconHome },
    { title: "탐색", href: "/dashboard/explore", icon: IconSearch },
  ];

  const buildLocaleHref = React.useCallback(
    (locale: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("locale", locale);
      params.delete("countries");
      params.delete("platform");
      return `/dashboard/locale?${params.toString()}`;
    },
    [searchParams],
  );

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl"
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
                AmInsight
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
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/70",
                  )}
                >
                  {isActive && <ActiveRail />}
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          <SidebarMenuItem>
            <SidebarMenuButton
              render={<button type="button" />}
              isActive={isLocalePage}
              onClick={() => setLocaleOpen((open) => !open)}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isLocalePage
                  ? "bg-white/[0.04] text-white/90"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/70",
              )}
              aria-expanded={localeOpen}
            >
              {isLocalePage && <ActiveRail />}
              <IconWorld className="size-4 shrink-0" />
              <span>로케일</span>
              <IconChevronDown
                className={cn(
                  "ml-auto size-3.5 shrink-0 transition-transform",
                  localeOpen ? "rotate-180" : "",
                )}
              />
            </SidebarMenuButton>

            {localeOpen && (
              <SidebarMenuSub className="mx-3.5 mt-1 flex flex-col gap-1 border-l border-white/[0.08] px-2 py-1">
                {LOCALES.map((locale) => {
                  const isActive = isLocalePage && activeLocale === locale;

                  return (
                    <SidebarMenuSubItem key={locale}>
                      <SidebarMenuSubButton
                        render={<Link href={buildLocaleHref(locale)} />}
                        isActive={isActive}
                        className={cn(
                          "h-8 rounded-md px-2 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-white/[0.05] text-white/90"
                            : "text-white/45 hover:bg-white/[0.04] hover:text-white/70",
                        )}
                      >
                        <span>{locale}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard/feedback" />}
              isActive={pathname.startsWith("/dashboard/feedback")}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/feedback")
                  ? "bg-white/[0.04] text-white/90"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/70",
              )}
            >
              {pathname.startsWith("/dashboard/feedback") && <ActiveRail />}
              <IconMessageCircle className="size-4 shrink-0" />
              <span>{feedbackTitle}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mt-auto flex flex-col gap-1 px-2">
          <Separator className="my-2 bg-white/[0.06]" />
          <SyncStatus />
          {session?.user && (
            <>
              <Separator className="my-2 bg-white/[0.06]" />
              <div className="flex items-center gap-2 px-3 py-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/70">
                    {session.user.name}
                  </p>
                  <p className="truncate text-[10px] text-white/30">
                    {session.user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="shrink-0 rounded-md p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                  aria-label="로그아웃"
                >
                  <IconLogout className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function ActiveRail() {
  return (
    <span
      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
      style={{
        backgroundColor: "rgba(100, 149, 237, 0.9)",
        boxShadow: "0 0 6px rgba(100, 149, 237, 0.4)",
      }}
    />
  );
}
