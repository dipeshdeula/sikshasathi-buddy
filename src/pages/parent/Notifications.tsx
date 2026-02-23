import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ParentNotifications = () => {
  const { user } = useAuth();
  if (!user) return null;
  const notifs = db.notifications.getByUser(user.id);

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
      {notifs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      )}
      {notifs.map(n => (
        <div key={n.id} className={`bg-card rounded-xl border p-4 shadow-card ${n.readAt ? 'border-border' : 'border-primary'}`}>
          <p className="text-sm text-foreground">{n.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
          {!n.readAt && (
            <Button size="sm" variant="ghost" className="mt-2 gap-1" onClick={() => db.notifications.markRead(n.id)}>
              <CheckCircle2 className="h-3 w-3" /> Mark read
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParentNotifications;
