import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useTeacherLessonPlans, useClassQuizzes, useClassCheckins, useClassMastery, useTopics } from '@/hooks/use-supabase-data';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, FileQuestion, Users, BarChart3, TrendingUp, SmilePlus,
  Upload, Trophy, CheckCircle, AlertTriangle, Presentation,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ icon, label, value, to, color }: { icon: React.ReactNode; label: string; value: string | number; to: string; color: string }) => (
  <Link to={to} className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-elevated transition-shadow group">
    <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
      {icon}
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">{label}</p>
  </Link>
);

const MetricBar = ({ label, value, max, displayValue }: { label: string; value: number; max: number; displayValue: string }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{displayValue}</span>
    </div>
    <Progress value={Math.min((value / max) * 100, 100)} className="h-2" />
  </div>
);

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id;
  const { data: students } = useClassStudents(classId);
  const { data: lessons } = useTeacherLessonPlans(user?.id);
  const { data: quizzes } = useClassQuizzes(classId);
  const { data: checkins } = useClassCheckins(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: topics } = useTopics();

  const [challengeStats, setChallengeStats] = useState({ total: 0, submissions: 0 });
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0 });
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !classId) return;
    // Fetch challenge stats
    (async () => {
      const { data: ch } = await supabase.from('challenges').select('id').eq('teacher_id', user.id);
      const ids = (ch || []).map(c => c.id);
      if (ids.length === 0) { setChallengeStats({ total: 0, submissions: 0 }); return; }
      const { data: subs } = await supabase.from('challenge_submissions').select('id').in('challenge_id', ids);
      setChallengeStats({ total: ids.length, submissions: subs?.length || 0 });
    })();
    // Fetch completion stats
    (async () => {
      const ids = lessons.map(l => l.id);
      if (ids.length === 0) { setCompletionStats({ completed: 0, total: 0 }); return; }
      const { data } = await supabase.from('lesson_completions').select('id').in('lesson_plan_id', ids).eq('is_completed', true);
      setCompletionStats({ completed: data?.length || 0, total: ids.length });
    })();
    // Fetch badge stats
    (async () => {
      const sIds = students.map((s: any) => s.id);
      if (sIds.length === 0) return;
      const { data } = await supabase.from('student_badges').select('id').in('student_id', sIds);
      setBadgeCount(data?.length || 0);
    })();
  }, [user?.id, classId, lessons.length, students.length]);

  if (!user) return null;

  // KPI calculations
  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const avgHappiness = checkins.length > 0 ? Number((checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1)) : 0;

  const now = new Date();
  const thisMonth = checkins.filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyHappiness = thisMonth.length > 0 ? Number((thisMonth.reduce((s, c) => s + c.happinessScore, 0) / thisMonth.length).toFixed(1)) : 0;

  const courseCompletionPct = completionStats.total > 0 ? Math.round((completionStats.completed / completionStats.total) * 100) : 0;

  // Per-student mastery for at-risk detection
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

  // Topic-level mastery
  const topicAvgs = topics.map(t => {
    const scores = mastery.filter(m => m.topicId === t.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    return { ...t, avg, weak: avg < 60 };
  }).sort((a, b) => a.avg - b.avg);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">{classes[0]?.name || 'No class assigned'} · {students.length} students</p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard icon={<BarChart3 className="h-4 w-4 text-primary-foreground" />} label="Avg Mastery" value={`${avgMastery}%`} to="/teacher/mastery" color="bg-primary" />
        <StatCard icon={<SmilePlus className="h-4 w-4 text-warning-foreground" />} label="Happiness Index" value={`${avgHappiness}/5`} to="/teacher/mastery" color="bg-warning" />
        <StatCard icon={<BookOpen className="h-4 w-4 text-success-foreground" />} label="Course Done" value={`${courseCompletionPct}%`} to="/teacher/lessons" color="bg-success" />
        <StatCard icon={<Trophy className="h-4 w-4 text-accent-foreground" />} label="Challenges" value={challengeStats.submissions} to="/teacher/challenges" color="bg-accent" />
        <StatCard icon={<FileQuestion className="h-4 w-4 text-primary-foreground" />} label="Quizzes" value={quizzes.length} to="/teacher/quizzes" color="bg-primary" />
        <StatCard icon={<Users className="h-4 w-4 text-success-foreground" />} label="Students" value={students.length} to="/teacher/students" color="bg-success" />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Link to="/teacher/cdc-upload" className="flex items-center gap-2 bg-secondary rounded-lg p-3 hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
            <Upload className="h-4 w-4 text-primary" /> Upload CDC
          </Link>
          <Link to="/teacher/lessons" className="flex items-center gap-2 bg-secondary rounded-lg p-3 hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" /> Lesson Plan
          </Link>
          <Link to="/teacher/quizzes" className="flex items-center gap-2 bg-secondary rounded-lg p-3 hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
            <FileQuestion className="h-4 w-4 text-primary" /> Create Quiz
          </Link>
          <Link to="/teacher/results" className="flex items-center gap-2 bg-secondary rounded-lg p-3 hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Enter Results
          </Link>
          <Link to="/teacher/presentations" className="flex items-center gap-2 bg-secondary rounded-lg p-3 hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
            <Presentation className="h-4 w-4 text-primary" /> Presentations
          </Link>
        </div>
      </div>

      {/* Main Grid: Performance + Happiness */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Performance Overview */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Performance Overview
          </h2>
          <div className="space-y-3">
            <MetricBar label="Average Mastery" value={avgMastery} max={100} displayValue={`${avgMastery}%`} />
            <MetricBar label="Course Completion" value={courseCompletionPct} max={100} displayValue={`${courseCompletionPct}%`} />
            <MetricBar label="Monthly Happiness" value={monthlyHappiness} max={5} displayValue={`${monthlyHappiness}/5`} />
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{lessons.length}</p>
                <p className="text-xs text-muted-foreground">Lesson Plans</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{badgeCount}</p>
                <p className="text-xs text-muted-foreground">Badges Awarded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Happiness Index */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <SmilePlus className="h-4 w-4 text-warning" /> Happiness Index
          </h2>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">
              {avgHappiness >= 4 ? '😊' : avgHappiness >= 3 ? '🙂' : avgHappiness >= 2 ? '😐' : avgHappiness > 0 ? '😟' : '—'}
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgHappiness}/5</p>
              <p className="text-xs text-muted-foreground">Overall · {checkins.length} check-ins</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">This month: <span className="font-medium text-foreground">{monthlyHappiness}/5</span> ({thisMonth.length} check-ins)</p>
          {lowHappinessStudents.length > 0 && (
            <div className="bg-destructive/5 rounded-lg p-3 mt-3">
              <p className="text-xs font-medium text-destructive mb-1">⚠️ Low happiness (&lt;3/5):</p>
              {lowHappinessStudents.map((s: any) => (
                <p key={s.id} className="text-xs text-foreground">{s.name}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Grid: Topic Mastery + At-Risk */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Topic Mastery */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Topic Mastery (Class Avg)
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topicAvgs.length === 0 && <p className="text-sm text-muted-foreground">No mastery data yet.</p>}
            {topicAvgs.map(t => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-foreground truncate mr-2">{t.title}</span>
                  <span className={`text-xs font-medium ${t.weak ? 'text-destructive' : 'text-success'}`}>{t.avg}%</span>
                </div>
                <Progress value={t.avg} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Students Needing Support
          </h2>
          {atRiskStudents.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All students above 50% mastery! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {atRiskStudents.map((s: any) => {
                const scores = studentMasteryMap[s.id] || [];
                const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between bg-destructive/5 rounded-lg p-2.5">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-destructive font-medium">{avg}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Students Grid */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Students ({students.length})</h2>
          <Link to="/teacher/students" className="text-xs text-primary hover:underline">View All →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
          {students.slice(0, 16).map((s: any) => (
            <div key={s.id} className="bg-secondary rounded-lg p-2 text-center">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xs font-bold">
                {s.name.charAt(0)}
              </div>
              <p className="text-[10px] font-medium text-foreground mt-1 truncate">{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
