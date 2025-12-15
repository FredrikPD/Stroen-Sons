import AppShell from "@/components/layout/AppShell";
import { BreadcrumbProvider } from "@/components/breadcrumbs/BreadcrumbProvider";
import BreadcrumbBar from "@/components/breadcrumbs/BreadcrumbBar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbProvider>
      <AppShell>
        <BreadcrumbBar />
        {children}
      </AppShell>
    </BreadcrumbProvider>
  );
}