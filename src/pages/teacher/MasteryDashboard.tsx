import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, useTopics, useClassMastery, useClassCheckins } from '@/hooks/use-supabase-data';
import { Progress } from '@/components/ui/progress';
import { BarChart3, SmilePlus, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const MasteryDashboard = () => {
  const { user } = useAuth();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id || '';
  const { data: students } = useClassStudents(classId);
  const { data: topics } = useTopics();
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const avgHappiness = checkins.length > 0 ? Number((checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1)) : 0;

  const topicAvgs = topics.map(t => {
    const scores = mastery.filter(m => m.topicId === t.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    return { ...t, avg, weak: avg < 60 };
  }).sort((a, b) => a.avg - b.avg);

  // Per-student learning overview
  const studentOverview = students.map((s: any) => {
    const scores = mastery.filter(m => m.studentId === s.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((sum, m) => sum + m.masteryScore, 0) / scores.length) : 0;
    const sCheckins = checkins.filter(c => c.studentId === s.id);
    const happiness = sCheckins.length > 0 ? Number((sCheckins.reduce((sum, c) => sum + c.happinessScore, 0) / sCheckins.length).toFixed(1)) : 0;
    return { ...s, avg, happiness, topicsCompleted: scores.filter(sc => sc.masteryScore >= 70).length };
  }).sort((a, b) => a.avg - b.avg);

  const needsSupport = studentOverview.filter(s => s.avg < 50);

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mastery & Learning Dashboard</h1>

      {/* Top Summary Cards */}
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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Topic Mastery */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Topic Mastery (Class Average)</h2>
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {topicAvgs.map(t => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground truncate mr-2">{t.title}</span>
                  <span className={`text-sm font-medium ${t.weak ? 'text-destructive' : 'text-success'}`}>{t.avg}%</span>
                </div>
                <Progress value={t.avg} className="h-2" />
              </div>
            ))}
            {topicAvgs.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </div>

        {/* Student Learning Overview */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Student Learning Overview</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {studentOverview.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-3 rounded-lg p-2.5 ${s.avg < 50 ? 'bg-destructive/5' : 'bg-secondary'}`}>
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Mastery: <span className={s.avg < 50 ? 'text-destructive font-medium' : 'text-success font-medium'}>{s.avg}%</span></span>
                    <span>Happiness: {s.happiness}/5</span>
                    <span>Topics ≥70%: {s.topicsCompleted}</span>
                  </div>
                </div>
              </div>
            ))}
            {studentOverview.length === 0 && <p className="text-sm text-muted-foreground">No students found.</p>}
          </div>
        </div>
      </div>

      {/* Needs Support Section */}
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
