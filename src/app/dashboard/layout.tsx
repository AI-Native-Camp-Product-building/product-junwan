import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardSidebarHandle } from "@/components/dashboard/dashboard-sidebar-handle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "240px",
          "--header-height": "48px",
        } as React.CSSProperties
      }
    >
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      <DashboardSidebarHandle />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
