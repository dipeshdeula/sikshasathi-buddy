import { useAuth } from '@/contexts/AuthContext';
import { useParentChildren, useStudentMastery, useTopics, useStudentReports } from '@/hooks/use-supabase-data';
import { Progress } from '@/components/ui/progress';
import { User as UserIcon } from 'lucide-react';

const ParentSnapshot = () => {
  const { user } = useAuth();
  const { data: children } = useParentChildren(user?.id);
  const child = children[0];

  const { data: mastery } = useStudentMastery(child?.id);
  const { data: topics } = useTopics();
  const { data: reports } = useStudentReports(child?.id);

  if (!user) return null;

  if (!child) {
    return (
      <div className="animate-fade-in text-center py-20">
        <p className="text-muted-foreground">No linked child found. Please contact the admin.</p>
      </div>
    );
  }

  const approvedReports = reports.filter(r => r.status === 'approved' || r.status === 'sent');
  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <UserIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{child.name}</h1>
          <p className="text-muted-foreground">Grade 7 · Section A</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-1">Overall Mastery</h2>
        <p className="text-3xl font-bold text-primary">{avgMastery}%</p>
        <Progress value={avgMastery} className="h-3 mt-3" />
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Topic Progress</h2>
        <div className="space-y-3">
          {topics.map(t => {
            const m = mastery.find(ms => ms.topicId === t.id);
            return (
              <div key={t.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground">{t.title}</span>
                  <span className="text-sm text-muted-foreground">{m?.masteryScore || 0}%</span>
                </div>
                <Progress value={m?.masteryScore || 0} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>

      {approvedReports.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Reports</h2>
          {approvedReports.map(r => (
            <div key={r.id} className="bg-secondary rounded-lg p-4 mb-3">
              <p className="text-xs text-muted-foreground mb-2">Week of {r.weekStart}</p>
              <p className="text-sm text-foreground whitespace-pre-line">{r.reportText}</p>
              <p className="text-sm text-primary font-medium mt-2 whitespace-pre-line">{r.interventionsText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentSnapshot;
