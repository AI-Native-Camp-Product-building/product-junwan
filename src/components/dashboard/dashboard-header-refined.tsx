"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/admin";

function buildHeaderHref(
  searchParams: Pick<URLSearchParams, "get" | "toString">,
  targetHref: string,
): string {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (targetHref === "/dashboard/platform" && !nextParams.get("platform")) {
    const countries = nextParams
      .get("countries")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (countries?.length === 1) {
      nextParams.set("platform", countries[0]);
    }
  }

  if (targetHref === "/dashboard/medium" && !nextParams.get("medium")) {
    const mediums = nextParams
      .get("mediums")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (mediums?.length === 1) {
      nextParams.set("medium", mediums[0]);
    }
  }

  if (targetHref === "/dashboard") {
    nextParams.delete("platform");
    nextParams.delete("medium");
  }

  const queryString = nextParams.toString();
  return queryString ? `${targetHref}?${queryString}` : targetHref;
}

export function DashboardHeaderRefined() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const HEADER_NAV_ITEMS = [
    { href: "/dashboard", label: "홈" },
    { href: "/dashboard/explore", label: "탐색" },
    {
      href: "/dashboard/feedback",
      label: isAdmin(session?.user?.email) ? "피드백 관리" : "피드백",
    },
  ];

  return (
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          AmInsight Dashboard
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {HEADER_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={buildHeaderHref(searchParams, item.href)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      {/* KEYWORD: dashboard-global-page-nav */}
    </header>
  );
}
