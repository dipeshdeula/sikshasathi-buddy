import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassMastery, useClassCheckins, useTopics } from '@/hooks/use-supabase-data';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, BarChart3, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

const WeeklyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes, loading: classesLoading } = useTeacherClasses(user?.id);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const classId = selectedClassId || classes[0]?.id || '';
  const { data: students, loading: studentsLoading } = useClassStudents(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);
  const { data: topics } = useTopics();

  if (!selectedClassId && classes.length > 0) {
    setSelectedClassId(classes[0].id);
  }

  // Build per-student report rows from real data
  const reportRows = useMemo(() => {
    return students.map(s => {
      const studentMastery = mastery.filter(m => m.studentId === s.id);
      const avgMastery = studentMastery.length > 0
        ? Math.round(studentMastery.reduce((sum, m) => sum + m.masteryScore, 0) / studentMastery.length)
        : 0;

      const strongTopics = studentMastery
        .filter(m => m.masteryScore >= 75)
        .map(m => topics.find(t => t.id === m.topicId)?.title || '')
        .filter(Boolean);

      const weakTopics = studentMastery
        .filter(m => m.masteryScore < 50)
        .map(m => topics.find(t => t.id === m.topicId)?.title || '')
        .filter(Boolean);

      const studentCheckins = checkins.filter(c => c.studentId === s.id);
      const avgHappiness = studentCheckins.length > 0
        ? Number((studentCheckins.reduce((sum, c) => sum + c.happinessScore, 0) / studentCheckins.length).toFixed(1))
        : null;

      const topicsCompleted = studentMastery.filter(m => m.masteryScore >= 70).length;

      const status = avgMastery >= 75 ? 'Excellent' : avgMastery >= 50 ? 'Good' : avgMastery > 0 ? 'Needs Support' : 'No Data';

      return {
        id: s.id,
        name: s.name,
        avgMastery,
        avgHappiness,
        topicsCompleted,
        totalTopics: studentMastery.length,
        strongTopics,
        weakTopics,
        status,
        classLevel: s.classLevel,
        section: s.section,
      };
    }).sort((a, b) => a.avgMastery - b.avgMastery);
  }, [students, mastery, checkins, topics]);

  // Class summary
  const summary = useMemo(() => {
    if (reportRows.length === 0) return null;
    const avgMastery = Math.round(reportRows.reduce((s, r) => s + r.avgMastery, 0) / reportRows.length);
    const withHappiness = reportRows.filter(r => r.avgHappiness !== null);
    const avgHappiness = withHappiness.length > 0
      ? Number((withHappiness.reduce((s, r) => s + (r.avgHappiness || 0), 0) / withHappiness.length).toFixed(1))
      : null;
    const needsSupport = reportRows.filter(r => r.avgMastery < 50).length;
    const excellent = reportRows.filter(r => r.avgMastery >= 75).length;
    return { avgMastery, avgHappiness, needsSupport, excellent, total: reportRows.length };
  }, [reportRows]);

  const exportToExcel = () => {
    if (reportRows.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const className = classes.find(c => c.id === classId)?.name || 'Class';
    const headers = ['Student Name', 'Class Level', 'Section', 'Avg Mastery %', 'Happiness (1-5)', 'Topics Completed', 'Total Topics', 'Strong Topics', 'Weak Topics', 'Status'];

    const csvRows = reportRows.map(r => [
      r.name,
      r.classLevel || '',
      r.section || '',
      r.avgMastery,
      r.avgHappiness ?? '',
      r.topicsCompleted,
      r.totalTopics,
      `"${r.strongTopics.join(', ')}"`,
      `"${r.weakTopics.join(', ')}"`,
      r.status,
    ]);

    const csvContent = [
      [`Weekly Student Report - ${className} - ${new Date().toLocaleDateString()}`],
      [],
      headers,
      ...csvRows,
      [],
      ['Summary'],
      ['Total Students', summary?.total],
      ['Class Avg Mastery', `${summary?.avgMastery}%`],
      ['Class Avg Happiness', summary?.avgHappiness ?? 'N/A'],
      ['Excellent (≥75%)', summary?.excellent],
      ['Needs Support (<50%)', summary?.needsSupport],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className}_weekly_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report exported successfully!' });
  };

  const getMasteryColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    if (score > 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Excellent': 'bg-success/10 text-success',
      'Good': 'bg-primary/10 text-primary',
      'Needs Support': 'bg-destructive/10 text-destructive',
      'No Data': 'bg-muted text-muted-foreground',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getTrendIcon = (score: number) => {
    if (score >= 75) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
    if (score >= 50) return <Minus className="h-3.5 w-3.5 text-warning" />;
    if (score > 0) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    return null;
  };

  const isLoading = classesLoading || studentsLoading;

  return (
    <div className="animate-fade-in space-y-6">
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
          <Button onClick={exportToExcel} disabled={isLoading || reportRows.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Students</p>
            <p className="text-xl font-bold text-foreground">{summary.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Mastery</p>
            <p className={`text-xl font-bold ${getMasteryColor(summary.avgMastery)}`}>{summary.avgMastery}%</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Happiness</p>
            <p className="text-xl font-bold text-foreground">{summary.avgHappiness !== null ? `${summary.avgHappiness}/5` : '—'}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Excellent</p>
            <p className="text-xl font-bold text-success">{summary.excellent}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Needs Support</p>
            <p className={`text-xl font-bold ${summary.needsSupport > 0 ? 'text-destructive' : 'text-success'}`}>{summary.needsSupport}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading report data…</p>
          </div>
        </div>
      )}

      {!isLoading && classes.length === 0 && (
        <p className="text-muted-foreground text-sm">No classes assigned. Please contact your administrator.</p>
      )}

      {!isLoading && classId && students.length === 0 && (
        <p className="text-muted-foreground text-sm">No students enrolled in this class yet.</p>
      )}

      {/* Student Report Table */}
      {!isLoading && reportRows.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Student</TableHead>
                  <TableHead className="text-center">Mastery</TableHead>
                  <TableHead className="text-center">Happiness</TableHead>
                  <TableHead className="text-center">Topics Done</TableHead>
                  <TableHead>Strong Topics</TableHead>
                  <TableHead>Weak Topics</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.name}</p>
                          {(r.classLevel || r.section) && (
                            <p className="text-[10px] text-muted-foreground">{r.classLevel}{r.section ? ` - ${r.section}` : ''}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        {getTrendIcon(r.avgMastery)}
                        <Progress value={r.avgMastery} className="h-1.5 w-16" />
                        <span className={`text-xs font-semibold ${getMasteryColor(r.avgMastery)}`}>
                          {r.avgMastery > 0 ? `${r.avgMastery}%` : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.avgHappiness !== null ? (
                        <span className="text-sm">
                          {r.avgHappiness >= 4 ? '😊' : r.avgHappiness >= 3 ? '🙂' : '😐'}{' '}
                          <span className="font-medium">{r.avgHappiness}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium text-foreground">{r.topicsCompleted}</span>
                      <span className="text-xs text-muted-foreground">/{r.totalTopics}</span>
                    </TableCell>
                    <TableCell>
                      {r.strongTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {r.strongTopics.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded truncate max-w-[100px]" title={t}>{t}</span>
                          ))}
                          {r.strongTopics.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{r.strongTopics.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.weakTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {r.weakTopics.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded truncate max-w-[100px]" title={t}>{t}</span>
                          ))}
                          {r.weakTopics.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{r.weakTopics.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Needs Support Section */}
      {!isLoading && reportRows.filter(r => r.status === 'Needs Support').length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Students Needing Intervention
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {reportRows.filter(r => r.status === 'Needs Support').map(r => (
              <div key={r.id} className="bg-destructive/5 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-destructive font-medium">{r.avgMastery}% mastery</span>
                  {r.avgHappiness !== null && (
                    <span className="text-muted-foreground">{r.avgHappiness}/5 happy</span>
                  )}
                </div>
                {r.weakTopics.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Weak: {r.weakTopics.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReports;
