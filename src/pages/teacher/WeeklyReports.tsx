import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Send } from 'lucide-react';
import { WeeklyReport } from '@/lib/data';

const WeeklyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const classes = user ? db.classes.getByTeacher(user.id) : [];
  const classId = classes[0]?.id || '';
  const students = classId ? db.classes.getStudents(classId) : [];
  const [generating, setGenerating] = useState(false);

  const reports = db.reports.getByClass(classId);

  const generateAll = async () => {
    setGenerating(true);
    for (const s of students as any[]) {
      const mastery = db.mastery.getByStudent(s.id);
      const topics = db.topics.getAll();
      const scores: Record<string, number> = {};
      mastery.forEach(m => {
        const t = topics.find(tp => tp.id === m.topicId);
        if (t) scores[t.title] = m.masteryScore;
      });

      const result = await aiService.generateWeeklyReport({ studentName: s.name, masteryScores: scores });
      const report: WeeklyReport = {
        id: `report-${Date.now()}-${s.id}`,
        classId, studentId: s.id,
        weekStart: new Date().toISOString().split('T')[0],
        reportText: result.reportText,
        interventionsText: result.interventionsText,
        status: 'draft', approvedBy: undefined, sentAt: undefined,
      };
      db.reports.create(report);
    }
    setGenerating(false);
    toast({ title: `Generated reports for ${students.length} students!` });
  };

  const approve = (id: string) => {
    db.reports.update(id, { status: 'approved', approvedBy: user!.id });
    toast({ title: 'Report approved' });
  };

  const send = (id: string) => {
    db.reports.update(id, { status: 'sent', sentAt: new Date().toISOString() });
    db.audit.log({
      id: `audit-${Date.now()}`, actorUserId: user!.id, action: 'report_sent',
      entityType: 'weekly_report', entityId: id, createdAt: new Date().toISOString(),
    });
    toast({ title: 'SMS-ready report sent (simulated)' });
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Weekly Reports</h1>
        <Button onClick={generateAll} disabled={generating} className="gap-2">
          <Sparkles className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate All'}
        </Button>
      </div>

      {reports.length === 0 && <p className="text-muted-foreground text-sm">No reports yet. Click "Generate All" to create draft reports.</p>}

      <div className="space-y-3">
        {reports.map(r => {
          const student = (students as any[]).find(s => s.id === r.studentId);
          return (
            <div key={r.id} className="bg-card rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{student?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">Week of {r.weekStart}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  r.status === 'sent' ? 'bg-success/10 text-success' :
                  r.status === 'approved' ? 'bg-primary/10 text-primary' :
                  'bg-warning/10 text-warning'
                }`}>{r.status.toUpperCase()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-line mb-2">{r.reportText}</p>
              <p className="text-sm text-muted-foreground italic whitespace-pre-line">{r.interventionsText}</p>
              {r.status === 'draft' && (
                <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => approve(r.id)}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
              )}
              {r.status === 'approved' && (
                <Button size="sm" className="mt-3 gap-1" onClick={() => send(r.id)}>
                  <Send className="h-3 w-3" /> Send SMS
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyReports;
