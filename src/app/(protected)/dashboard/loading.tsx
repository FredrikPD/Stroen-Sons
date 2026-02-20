import Image from "next/image";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-[100] min-h-[100dvh] w-full bg-[#222222]">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex items-center justify-center">
        <Image
          src="/images/LOGO.png"
          alt="Strøen Søns"
          width={700}
          height={700}
          priority
          className="absolute bottom-full left-1/2 mb-6 h-auto w-[280px] max-w-[80vw] -translate-x-1/2 object-contain"
        />

          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
        <p className="sr-only">Laster dashboard...</p>
      </div>
    </div>
  );
}
