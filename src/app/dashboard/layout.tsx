import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

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
      <DashboardSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
