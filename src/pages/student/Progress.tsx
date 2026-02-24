import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentMastery, useTopics, useStudentCheckins } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, FileQuestion, SmilePlus, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const StudentProgress = () => {
  const { user } = useAuth();
  const { data: mastery } = useStudentMastery(user?.id);
  const { data: topics } = useTopics();
  const { data: checkins } = useStudentCheckins(user?.id);

  const [quizAttempts, setQuizAttempts] = useState<{ title: string; score: number; date: string }[]>([]);
  const [dbBadges, setDbBadges] = useState<{ badge_name: string; points: number }[]>([]);
  const [challengeCount, setChallengeCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    // Quiz history
    supabase.from('quiz_attempts').select('score, submitted_at, quizzes(title)').eq('student_id', user.id).order('submitted_at', { ascending: false }).then(({ data }) => {
      setQuizAttempts((data || []).map((a: any) => ({
        title: a.quizzes?.title || 'Quiz',
        score: a.score || 0,
        date: new Date(a.submitted_at).toLocaleDateString(),
      })));
    });
    // Badges from DB
    supabase.from('student_badges').select('badge_name, points').eq('student_id', user.id).then(({ data }) => {
      setDbBadges(data || []);
    });
    // Challenge count
    supabase.from('challenge_submissions').select('id').eq('student_id', user.id).then(({ data }) => {
      setChallengeCount(data?.length || 0);
    });
  }, [user?.id]);

  if (!user) return null;

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const topicsAbove80 = mastery.filter(m => m.masteryScore >= 80).length;
  const totalPoints = dbBadges.reduce((s, b) => s + b.points, 0);
  const avgQuiz = quizAttempts.length > 0 ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length) : 0;

  // Happiness trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayCheckin = checkins.find(c => c.date === dateStr);
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), score: dayCheckin?.happinessScore || null };
  });

  // Topic mastery chart
  const topicChart = topics.map(t => {
    const m = mastery.find(ms => ms.topicId === t.id);
    return { name: t.title.length > 12 ? t.title.slice(0, 12) + '…' : t.title, score: m?.masteryScore || 0 };
  }).filter(t => t.score > 0);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">My Progress</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <Target className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgMastery}%</p>
          <p className="text-xs text-muted-foreground">Avg Mastery</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <Trophy className="h-5 w-5 mx-auto text-accent mb-1" />
          <p className="text-2xl font-bold text-foreground">{topicsAbove80}</p>
          <p className="text-xs text-muted-foreground">Topics Mastered</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <FileQuestion className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgQuiz}%</p>
          <p className="text-xs text-muted-foreground">Quiz Avg ({quizAttempts.length})</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <Award className="h-5 w-5 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
          <p className="text-xs text-muted-foreground">Points ({dbBadges.length} badges)</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <Star className="h-5 w-5 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{challengeCount}</p>
          <p className="text-xs text-muted-foreground">Challenges Done</p>
        </div>
      </div>

      {/* Badges */}
      {dbBadges.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-3">My Badges</h2>
          <div className="flex flex-wrap gap-2">
            {dbBadges.map((b, i) => (
              <Badge key={i} className="bg-warning/10 text-warning border-warning/30 px-3 py-1.5">
                {b.badge_name} (+{b.points}pts)
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <SmilePlus className="h-4 w-4 text-warning" /> Satisfaction (7 Days)
          </h2>
          {last7.some(d => d.score !== null) ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: 'hsl(var(--warning))' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No feedback this week. Share your feedback!</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-primary" /> Quiz Scores
          </h2>
          {quizAttempts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={quizAttempts.slice(0, 8).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No quiz attempts yet.</p>
          )}
        </div>
      </div>

      {/* Topic Mastery */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4">Topic Mastery</h2>
        {topicChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(topicChart.length * 35, 150)}>
            <BarChart data={topicChart} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="score" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="space-y-3">
            {topics.map(t => {
              const m = mastery.find(ms => ms.topicId === t.id);
              const score = m?.masteryScore || 0;
              return (
                <div key={t.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-foreground">{t.title}</span>
                    <span className={`text-sm font-medium ${score >= 80 ? 'text-success' : score >= 50 ? 'text-accent' : 'text-destructive'}`}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProgress;
