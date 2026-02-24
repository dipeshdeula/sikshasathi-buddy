import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassReports, useClassMastery, useClassCheckins, useTopics } from '@/hooks/use-supabase-data';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check, Send, Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Smile } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const WeeklyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes, loading: classesLoading } = useTeacherClasses(user?.id);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const classId = selectedClassId || classes[0]?.id || '';
  const { data: students, loading: studentsLoading } = useClassStudents(classId);
  const { data: reports, refetch: refetchReports, loading: reportsLoading } = useClassReports(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);
  const { data: topics } = useTopics();
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!selectedClassId && classes.length > 0) {
    setSelectedClassId(classes[0].id);
  }

  // Build per-student performance data
  const getStudentPerformance = (studentId: string) => {
    const studentMastery = mastery.filter(m => m.studentId === studentId);
    const avgMastery = studentMastery.length > 0
      ? studentMastery.reduce((sum, m) => sum + m.masteryScore, 0) / studentMastery.length
      : 0;
    const topicScores = studentMastery.map(m => {
      const topic = topics.find(t => t.id === m.topicId);
      return { topicTitle: topic?.title || 'Unknown', score: m.masteryScore };
    }).sort((a, b) => b.score - a.score);
    const weakTopics = topicScores.filter(t => t.score < 50);
    const strongTopics = topicScores.filter(t => t.score >= 75);

    const studentCheckins = checkins.filter(c => c.studentId === studentId);
    const avgHappiness = studentCheckins.length > 0
      ? studentCheckins.reduce((sum, c) => sum + c.happinessScore, 0) / studentCheckins.length
      : null;

    return { avgMastery, topicScores, weakTopics, strongTopics, avgHappiness, totalTopics: studentMastery.length };
  };

  // Class-level summary
  const classSummary = (() => {
    if (students.length === 0) return null;
    const perfs = students.map(s => getStudentPerformance(s.id));
    const avgMastery = perfs.reduce((s, p) => s + p.avgMastery, 0) / perfs.length;
    const happinessScores = perfs.filter(p => p.avgHappiness !== null);
    const avgHappiness = happinessScores.length > 0
      ? happinessScores.reduce((s, p) => s + (p.avgHappiness || 0), 0) / happinessScores.length
      : null;
    const atRisk = perfs.filter(p => p.avgMastery < 40).length;
    return { avgMastery, avgHappiness, atRisk, total: students.length };
  })();

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

  const getMasteryColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getMasteryTrend = (score: number) => {
    if (score >= 75) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
    if (score >= 50) return <Minus className="h-3.5 w-3.5 text-warning" />;
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  };

  const isLoading = classesLoading || studentsLoading || reportsLoading;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
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

      {/* Class Performance Summary */}
      {!isLoading && classSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Avg Mastery</p>
            </div>
            <p className={`text-xl font-bold ${getMasteryColor(classSummary.avgMastery)}`}>
              {classSummary.avgMastery.toFixed(0)}%
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Smile className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Avg Happiness</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {classSummary.avgHappiness !== null ? `${classSummary.avgHappiness.toFixed(1)}/5` : '—'}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <p className="text-xs text-muted-foreground mb-1">Students</p>
            <p className="text-xl font-bold text-foreground">{classSummary.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <p className="text-xs text-muted-foreground mb-1">At Risk</p>
            <p className={`text-xl font-bold ${classSummary.atRisk > 0 ? 'text-destructive' : 'text-success'}`}>
              {classSummary.atRisk}
            </p>
          </div>
        </div>
      )}

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

      {/* Report Cards with Performance */}
      <div className="space-y-3">
        {reports.map(r => {
          const student = students.find(s => s.id === r.studentId);
          const perf = r.studentId ? getStudentPerformance(r.studentId) : null;
          const isExpanded = expandedId === r.id;

          return (
            <div key={r.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Header */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{student?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">Week of {r.weekStart}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      r.status === 'sent' ? 'bg-success/10 text-success' :
                      r.status === 'approved' ? 'bg-primary/10 text-primary' :
                      'bg-warning/10 text-warning'
                    }`}>{r.status.toUpperCase()}</span>
                  </div>
                </div>

                {/* Quick Performance Stats */}
                {perf && (
                  <div className="flex flex-wrap gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      {getMasteryTrend(perf.avgMastery)}
                      <span className="text-muted-foreground">Mastery:</span>
                      <span className={`font-semibold ${getMasteryColor(perf.avgMastery)}`}>{perf.avgMastery.toFixed(0)}%</span>
                    </div>
                    {perf.avgHappiness !== null && (
                      <div className="flex items-center gap-1.5">
                        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Happiness:</span>
                        <span className="font-semibold text-foreground">{perf.avgHappiness.toFixed(1)}/5</span>
                      </div>
                    )}
                    {perf.weakTopics.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Weak topics:</span>
                        <span className="font-semibold text-destructive">{perf.weakTopics.length}</span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-sm text-foreground whitespace-pre-line mb-2">{r.reportText}</p>
                <p className="text-sm text-muted-foreground italic whitespace-pre-line">{r.interventionsText}</p>

                {/* Expand/Collapse for topic details */}
                {perf && perf.totalTopics > 0 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="mt-3 text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? 'Hide' : 'View'} topic breakdown ({perf.totalTopics} topics)
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {r.status === 'draft' && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => approve(r.id)}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  {r.status === 'approved' && (
                    <Button size="sm" className="gap-1" onClick={() => send(r.id)}>
                      <Send className="h-3 w-3" /> Send SMS
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Topic Breakdown */}
              {isExpanded && perf && (
                <div className="border-t border-border bg-muted/30 p-5 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Topic Mastery Breakdown</p>
                  {perf.topicScores.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-36 truncate" title={t.topicTitle}>{t.topicTitle}</span>
                      <Progress value={t.score} className="flex-1 h-2" />
                      <span className={`text-xs font-semibold w-10 text-right ${getMasteryColor(t.score)}`}>{t.score.toFixed(0)}%</span>
                    </div>
                  ))}
                  {perf.strongTopics.length > 0 && (
                    <p className="text-xs text-success mt-2">✓ Strong in: {perf.strongTopics.map(t => t.topicTitle).join(', ')}</p>
                  )}
                  {perf.weakTopics.length > 0 && (
                    <p className="text-xs text-destructive mt-1">⚠ Needs help in: {perf.weakTopics.map(t => t.topicTitle).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyReports;
