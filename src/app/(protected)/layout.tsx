import AppShell from "@/components/layout/AppShell";
import { HeaderProvider } from "@/components/layout/HeaderContext";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <AppShell>
        {children}
      </AppShell>
    </HeaderProvider>
  );
}