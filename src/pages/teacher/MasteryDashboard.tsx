import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, useTopics, useClassMastery, useClassCheckins } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, SmilePlus, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const MasteryDashboard = () => {
  const { user } = useAuth();
  const { data: classes, loading: classesLoading } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id || '';
  const { data: students, loading: studentsLoading } = useClassStudents(classId);
  const { data: topics } = useTopics();
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);

  const [quizData, setQuizData] = useState<Record<string, number>>({});
  const [challengeData, setChallengeData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!students.length) return;
    const sIds = students.map((s: any) => s.id);
    supabase.from('quiz_attempts').select('student_id, score').in('student_id', sIds).then(({ data }) => {
      const map: Record<string, number[]> = {};
      (data || []).forEach((d: any) => { if (!map[d.student_id]) map[d.student_id] = []; map[d.student_id].push(d.score || 0); });
      const avgMap: Record<string, number> = {};
      Object.entries(map).forEach(([k, v]) => { avgMap[k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length); });
      setQuizData(avgMap);
    });
    supabase.from('challenge_submissions').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setChallengeData(counts);
    });
  }, [students.length]);

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const avgHappiness = checkins.length > 0 ? Number((checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1)) : 0;

  const topicAvgs = topics.map(t => {
    const scores = mastery.filter(m => m.topicId === t.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    return { ...t, avg, weak: avg < 60, name: t.title.length > 15 ? t.title.slice(0, 15) + '…' : t.title };
  }).sort((a, b) => a.avg - b.avg);

  const studentOverview = students.map((s: any) => {
    const scores = mastery.filter(m => m.studentId === s.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((sum, m) => sum + m.masteryScore, 0) / scores.length) : 0;
    const sCheckins = checkins.filter(c => c.studentId === s.id);
    const happiness = sCheckins.length > 0 ? Number((sCheckins.reduce((sum, c) => sum + c.happinessScore, 0) / sCheckins.length).toFixed(1)) : 0;
    return { ...s, avg, happiness, topicsCompleted: scores.filter(sc => sc.masteryScore >= 70).length, quizAvg: quizData[s.id] || 0, challenges: challengeData[s.id] || 0 };
  }).sort((a, b) => a.avg - b.avg);

  const needsSupport = studentOverview.filter(s => s.avg < 50);

  // Radar data for top topics
  const radarData = topicAvgs.filter(t => t.avg > 0).slice(-6).map(t => ({ topic: t.name, mastery: t.avg }));

  if (classesLoading || studentsLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading mastery data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mastery & Learning Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgMastery}%</p>
          <p className="text-xs text-muted-foreground">Avg Mastery</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <SmilePlus className="h-5 w-5 text-warning mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgHappiness}/5</p>
          <p className="text-xs text-muted-foreground">Happiness</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <TrendingUp className="h-5 w-5 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{students.length}</p>
          <p className="text-xs text-muted-foreground">Total Students</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{needsSupport.length}</p>
          <p className="text-xs text-muted-foreground">Need Support</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Topic Mastery (Class Average)</h2>
          {topicAvgs.filter(t => t.avg > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicAvgs.filter(t => t.avg > 0)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Topic Coverage Radar</h2>
          {radarData.length > 2 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar dataKey="mastery" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Need ≥3 topics with data for radar.</p>
          )}
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4">Student Learning Overview</h2>
        {studentOverview.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Mastery</TableHead>
                  <TableHead>Happiness</TableHead>
                  <TableHead>Quiz Avg</TableHead>
                  <TableHead>Challenges</TableHead>
                  <TableHead>Topics ≥70%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentOverview.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{s.name.charAt(0)}</div>
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.avg} className="h-1.5 w-16" />
                        <span className={`text-xs font-medium ${s.avg < 50 ? 'text-destructive' : 'text-success'}`}>{s.avg}%</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{s.happiness > 0 ? `${s.happiness >= 4 ? '😊' : s.happiness >= 3 ? '🙂' : '😐'} ${s.happiness}` : '—'}</span></TableCell>
                    <TableCell><span className={`text-sm font-medium ${s.quizAvg < 50 ? 'text-destructive' : 'text-foreground'}`}>{s.quizAvg > 0 ? `${s.quizAvg}%` : '—'}</span></TableCell>
                    <TableCell className="text-sm">{s.challenges}</TableCell>
                    <TableCell className="text-sm">{s.topicsCompleted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No students found.</p>
        )}
      </div>

      {/* Needs Support */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Students Needing Support (&lt;50% Mastery)
        </h2>
        {needsSupport.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All students are performing well! 🎉</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {needsSupport.map((s: any) => (
              <div key={s.id} className="bg-destructive/5 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-destructive font-medium">{s.avg}% mastery</span>
                  <span className="text-muted-foreground">{s.happiness > 0 ? `${s.happiness}/5 happy` : 'No check-ins'}</span>
                  <span className="text-muted-foreground">Quiz: {s.quizAvg > 0 ? `${s.quizAvg}%` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasteryDashboard;
