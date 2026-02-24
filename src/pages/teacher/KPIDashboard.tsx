import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassMastery, useClassCheckins, useTeacherLessonPlans, useClassQuizzes } from '@/hooks/use-supabase-data';
import { Progress } from '@/components/ui/progress';
import { BarChart3, SmilePlus, Trophy, BookOpen, Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

const KPIDashboard = () => {
  const { user } = useAuth();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id;
  const { data: students } = useClassStudents(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);
  const { data: lessons } = useTeacherLessonPlans(user?.id);
  const { data: quizzes } = useClassQuizzes(classId);

  const [challengeStats, setChallengeStats] = useState({ total: 0, completed: 0 });
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0 });
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (user?.id && classId) {
      fetchChallengeStats();
      fetchCompletionStats();
      fetchBadgeStats();
    }
  }, [user?.id, classId]);

  const fetchChallengeStats = async () => {
    const { data: ch } = await supabase.from('challenges').select('id').eq('teacher_id', user!.id);
    const challengeIds = (ch || []).map(c => c.id);
    if (challengeIds.length === 0) { setChallengeStats({ total: 0, completed: 0 }); return; }
    const { data: subs } = await supabase.from('challenge_submissions').select('id').in('challenge_id', challengeIds);
    setChallengeStats({ total: challengeIds.length, completed: subs?.length || 0 });
  };

  const fetchCompletionStats = async () => {
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length === 0) { setCompletionStats({ completed: 0, total: 0 }); return; }
    const { data } = await supabase.from('lesson_completions').select('id').in('lesson_plan_id', lessonIds).eq('is_completed', true);
    setCompletionStats({ completed: data?.length || 0, total: lessonIds.length });
  };

  const fetchBadgeStats = async () => {
    const studentIds = students.map((s: any) => s.id);
    if (studentIds.length === 0) return;
    const { data } = await supabase.from('student_badges').select('id').in('student_id', studentIds);
    setBadgeCount(data?.length || 0);
  };

  // KPI Calculations
  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;

  const avgHappiness = checkins.length > 0 ? Number((checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1)) : 0;

  // Monthly happiness
  const now = new Date();
  const thisMonth = checkins.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyHappiness = thisMonth.length > 0 ? Number((thisMonth.reduce((s, c) => s + c.happinessScore, 0) / thisMonth.length).toFixed(1)) : 0;

  // Students with low mastery
  const studentMasteryMap: Record<string, number[]> = {};
  mastery.forEach(m => {
    if (!studentMasteryMap[m.studentId]) studentMasteryMap[m.studentId] = [];
    studentMasteryMap[m.studentId].push(m.masteryScore);
  });
  const atRiskStudents = students.filter((s: any) => {
    const scores = studentMasteryMap[s.id] || [];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return avg < 50;
  });

  // Per-student happiness
  const studentHappinessMap: Record<string, number[]> = {};
  checkins.forEach(c => {
    if (!studentHappinessMap[c.studentId]) studentHappinessMap[c.studentId] = [];
    studentHappinessMap[c.studentId].push(c.happinessScore);
  });
  const lowHappinessStudents = students.filter((s: any) => {
    const scores = studentHappinessMap[s.id] || [];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return avg > 0 && avg < 3;
  });

  const courseCompletionPct = completionStats.total > 0 ? Math.round((completionStats.completed / completionStats.total) * 100) : 0;

  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground">KPI Dashboard</h1>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<BarChart3 className="h-5 w-5" />} label="Avg Mastery" value={`${avgMastery}%`} color="bg-primary" textColor="text-primary-foreground" />
        <KPICard icon={<SmilePlus className="h-5 w-5" />} label="Happiness Index" value={`${avgHappiness}/5`} color="bg-warning" textColor="text-warning-foreground" />
        <KPICard icon={<BookOpen className="h-5 w-5" />} label="Course Completion" value={`${courseCompletionPct}%`} color="bg-success" textColor="text-success-foreground" />
        <KPICard icon={<Trophy className="h-5 w-5" />} label="Challenges Done" value={`${challengeStats.completed}`} color="bg-accent" textColor="text-accent-foreground" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Performance Overview
          </h2>
          <div className="space-y-4">
            <MetricBar label="Average Mastery" value={avgMastery} max={100} suffix="%" />
            <MetricBar label="Course Completion" value={courseCompletionPct} max={100} suffix="%" />
            <MetricBar label="Monthly Happiness" value={monthlyHappiness * 20} max={100} suffix={`(${monthlyHappiness}/5)`} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Students</span>
              <span className="font-bold text-foreground">{students.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lesson Plans</span>
              <span className="font-bold text-foreground">{lessons.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quizzes Created</span>
              <span className="font-bold text-foreground">{quizzes.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Badges Awarded</span>
              <span className="font-bold text-foreground">{badgeCount}</span>
            </div>
          </div>
        </div>

        {/* Happiness Index */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <SmilePlus className="h-5 w-5 text-warning" /> Happiness Index
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">
              {avgHappiness >= 4 ? '😊' : avgHappiness >= 3 ? '🙂' : avgHappiness >= 2 ? '😐' : '😟'}
            </span>
            <div>
              <p className="text-3xl font-bold text-foreground">{avgHappiness}/5</p>
              <p className="text-sm text-muted-foreground">Overall · {checkins.length} check-ins</p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-foreground">Monthly: {monthlyHappiness}/5 ({thisMonth.length} check-ins this month)</p>
            {lowHappinessStudents.length > 0 && (
              <div className="bg-destructive/5 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-destructive mb-1">⚠️ Students with low happiness (&lt;3/5):</p>
                {lowHappinessStudents.map((s: any) => (
                  <p key={s.id} className="text-xs text-foreground">{s.name}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Students Needing Support
          </h2>
          {atRiskStudents.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All students above 50% mastery! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {atRiskStudents.map((s: any) => {
                const scores = studentMasteryMap[s.id] || [];
                const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between bg-destructive/5 rounded-lg p-3">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-destructive font-medium">{avg}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Challenge Stats */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" /> Challenge Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Challenges</span>
              <span className="font-bold text-foreground">{challengeStats.total}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Submissions</span>
              <span className="font-bold text-foreground">{challengeStats.completed}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Badges Awarded</span>
              <span className="font-bold text-foreground">{badgeCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ icon, label, value, color, textColor }: { icon: React.ReactNode; label: string; value: string; color: string; textColor: string }) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-card">
    <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
      <span className={textColor}>{icon}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

const MetricBar = ({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{suffix.startsWith('(') ? suffix : `${Math.round(value)}${suffix}`}</span>
    </div>
    <Progress value={Math.min(value, max)} className="h-2" />
  </div>
);

export default KPIDashboard;
