import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';

const ParentReports = () => {
  const { user } = useAuth();
  if (!user) return null;
  const children = db.parentLinks.getChildren(user.id);
  const child = children[0] as any;
  if (!child) return <p className="text-muted-foreground p-8">No linked child.</p>;

  const reports = db.reports.getByStudent(child.id).filter(r => r.status === 'approved' || r.status === 'sent');

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Weekly Reports</h1>
      {reports.length === 0 && <p className="text-muted-foreground text-sm">No approved reports yet.</p>}
      {reports.map(r => (
        <div key={r.id} className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">{child.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'sent' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
              {r.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Week of {r.weekStart}</p>
          <p className="text-sm text-foreground whitespace-pre-line">{r.reportText}</p>
          <div className="mt-3 p-3 bg-accent/10 rounded-lg">
            <p className="text-xs font-semibold text-accent mb-1">Home Interventions</p>
            <p className="text-sm text-foreground whitespace-pre-line">{r.interventionsText}</p>
          </div>
          {r.status === 'sent' && (
            <p className="text-xs text-muted-foreground mt-3">SMS sent: {r.sentAt ? new Date(r.sentAt).toLocaleString() : ''}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParentReports;
