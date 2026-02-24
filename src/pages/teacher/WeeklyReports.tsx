import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassReports, useStudentMastery, useTopics } from '@/hooks/use-supabase-data';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Send } from 'lucide-react';

const WeeklyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id || '';
  const { data: students } = useClassStudents(classId);
  const { data: reports, refetch: refetchReports } = useClassReports(classId);
  const { data: topics } = useTopics();
  const [generating, setGenerating] = useState(false);

  const generateAll = async () => {
    setGenerating(true);
    for (const s of students) {
      // Fetch mastery for each student
      const { data: masteryData } = await supabase.from('mastery_states').select('*').eq('student_id', s.id);
      const scores: Record<string, number> = {};
      (masteryData || []).forEach((m: any) => {
        const t = topics.find(tp => tp.id === m.topic_id);
        if (t) scores[t.title] = m.mastery_score;
      });

      const result = await aiService.generateWeeklyReport({ studentName: s.name, masteryScores: scores });
      await supabase.from('weekly_reports').insert({
        class_id: classId, student_id: s.id,
        week_start: new Date().toISOString().split('T')[0],
        report_text: result.reportText,
        interventions_text: result.interventionsText,
        status: 'draft',
      });
    }
    setGenerating(false);
    refetchReports();
    toast({ title: `Generated reports for ${students.length} students!` });
  };

  const approve = async (id: string) => {
    await supabase.from('weekly_reports').update({ status: 'approved', approved_by: user!.id }).eq('id', id);
    refetchReports();
    toast({ title: 'Report approved' });
  };

  const send = async (id: string) => {
    await supabase.from('weekly_reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('audit_logs').insert({
      actor_user_id: user!.id, action: 'report_sent',
      entity_type: 'weekly_report', entity_id: id,
    });
    refetchReports();
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
          const student = students.find(s => s.id === r.studentId);
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
