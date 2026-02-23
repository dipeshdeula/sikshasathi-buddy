import { useOffline } from '../hooks/use-offline';
import { WifiOff } from 'lucide-react';

const OfflineBanner = () => {
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      You are offline — showing cached content
    </div>
  );
};

export default OfflineBanner;
