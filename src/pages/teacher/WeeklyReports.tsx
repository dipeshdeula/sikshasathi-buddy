import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassReports, useTopics } from '@/hooks/use-supabase-data';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Send, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WeeklyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes, loading: classesLoading } = useTeacherClasses(user?.id);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const classId = selectedClassId || classes[0]?.id || '';
  const { data: students, loading: studentsLoading } = useClassStudents(classId);
  const { data: reports, refetch: refetchReports, loading: reportsLoading } = useClassReports(classId);
  const { data: topics } = useTopics();
  const [generating, setGenerating] = useState(false);

  // Auto-select first class when loaded
  if (!selectedClassId && classes.length > 0) {
    setSelectedClassId(classes[0].id);
  }

  const generateAll = async () => {
    if (!classId || students.length === 0) {
      toast({ title: 'No students found in this class', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      for (const s of students) {
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
      toast({ title: `Generated reports for ${students.length} students!` });
    } catch (e) {
      console.error('Report generation failed:', e);
      toast({ title: 'Failed to generate reports', variant: 'destructive' });
    } finally {
      setGenerating(false);
      refetchReports();
    }
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

  const isLoading = classesLoading || studentsLoading || reportsLoading;

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Weekly Reports</h1>
        <div className="flex items-center gap-3">
          {classes.length > 1 && (
            <Select value={classId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={generateAll} disabled={generating || isLoading || students.length === 0} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate All'}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && classes.length === 0 && (
        <p className="text-muted-foreground text-sm">No classes assigned. Please contact your administrator.</p>
      )}

      {!isLoading && classId && students.length === 0 && (
        <p className="text-muted-foreground text-sm">No students enrolled in this class yet.</p>
      )}

      {!isLoading && reports.length === 0 && students.length > 0 && (
        <p className="text-muted-foreground text-sm">No reports yet. Click "Generate All" to create draft reports for {students.length} students.</p>
      )}

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
