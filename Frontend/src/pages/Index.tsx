import { useIsMobile } from "@/hooks/use-mobile";
import { MobileScanView } from "@/components/mobile/MobileScanView";
import { DesktopDashboard } from "@/components/desktop/DesktopDashboard";

const Index = () => {
  const isMobile = useIsMobile();

  // Show loading state while detecting device
  if (isMobile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isMobile ? <MobileScanView /> : <DesktopDashboard />;
};

export default Index;
