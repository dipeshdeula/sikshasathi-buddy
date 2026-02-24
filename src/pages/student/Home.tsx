import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentMastery, useTopics, useStudentCheckins } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Bot, TrendingUp, SmilePlus, BookOpen, CheckCircle2, FileQuestion, Trophy, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const StudentHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: mastery } = useStudentMastery(user?.id);
  const { data: topics } = useTopics();
  const { data: checkins } = useStudentCheckins(user?.id);

  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<Record<string, boolean>>({});
  const [quizStats, setQuizStats] = useState({ count: 0, avgScore: 0 });
  const [challengeStats, setChallengeStats] = useState({ submitted: 0, badges: 0, points: 0 });

  useEffect(() => {
    if (!user) return;
    // Lesson completions
    (async () => {
      const { data } = await supabase
        .from('lesson_completions')
        .select('lesson_plan_id, is_completed, lesson_plans(id, objectives, topics(title))')
        .eq('is_completed', true);
      if (data) {
        setLessonPlans(data.map((d: any) => ({
          id: d.lesson_plan_id,
          objectives: d.lesson_plans?.objectives || '',
          topicTitle: d.lesson_plans?.topics?.title || '',
        })));
      }
      const { data: vData } = await supabase.from('student_lesson_verifications').select('*').eq('student_id', user.id);
      const vMap: Record<string, boolean> = {};
      (vData || []).forEach((v: any) => { vMap[v.lesson_plan_id] = v.is_verified; });
      setVerifications(vMap);
    })();
    // Quiz stats
    supabase.from('quiz_attempts').select('score').eq('student_id', user.id).then(({ data }) => {
      const attempts = data || [];
      setQuizStats({
        count: attempts.length,
        avgScore: attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length) : 0,
      });
    });
    // Challenge + badge stats
    (async () => {
      const { data: subs } = await supabase.from('challenge_submissions').select('id').eq('student_id', user.id);
      const { data: badges } = await supabase.from('student_badges').select('points').eq('student_id', user.id);
      setChallengeStats({
        submitted: subs?.length || 0,
        badges: badges?.length || 0,
        points: (badges || []).reduce((s, b) => s + b.points, 0),
      });
    })();
  }, [user]);

  const handleVerify = async (lessonPlanId: string, checked: boolean) => {
    if (!user) return;
    if (checked) {
      await supabase.from('student_lesson_verifications').upsert({
        lesson_plan_id: lessonPlanId, student_id: user.id, is_verified: true, verified_at: new Date().toISOString(),
      }, { onConflict: 'lesson_plan_id,student_id' });
    } else {
      await supabase.from('student_lesson_verifications').update({ is_verified: false }).eq('lesson_plan_id', lessonPlanId).eq('student_id', user.id);
    }
    setVerifications(prev => ({ ...prev, [lessonPlanId]: checked }));
    toast({ title: checked ? 'Lesson verified ✅' : 'Verification removed' });
  };

  if (!user) return null;

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const streakDays = Math.min(checkins.length, 7);
  const avgHappiness = checkins.length > 0 ? Number((checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1)) : 0;

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">नमस्ते, {user.name.split(' ')[0]}! 👋</h1>
        <p className="text-muted-foreground">Keep learning, you're doing great!</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-primary">{avgMastery}%</p>
          <p className="text-xs text-muted-foreground">Mastery</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-accent">{streakDays}🔥</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-foreground">{quizStats.avgScore}%</p>
          <p className="text-xs text-muted-foreground">Quiz Avg ({quizStats.count})</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-warning">{challengeStats.points}pts</p>
          <p className="text-xs text-muted-foreground">{challengeStats.badges} badges</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/student/coach" className="bg-primary/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-primary/15 transition-colors">
          <Bot className="h-7 w-7 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Coach</span>
        </Link>
        <Link to="/student/quizzes" className="bg-accent/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-accent/15 transition-colors">
          <FileQuestion className="h-7 w-7 text-accent" />
          <span className="text-xs font-semibold text-foreground">Quizzes</span>
        </Link>
        <Link to="/student/challenges" className="bg-warning/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-warning/15 transition-colors">
          <Trophy className="h-7 w-7 text-warning" />
          <span className="text-xs font-semibold text-foreground">Challenges</span>
        </Link>
        <Link to="/student/checkin" className="bg-success/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-success/15 transition-colors">
          <SmilePlus className="h-7 w-7 text-success" />
          <span className="text-xs font-semibold text-foreground">Feedback</span>
        </Link>
      </div>

      {/* Happiness Summary */}
      {checkins.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card flex items-center gap-4">
          <span className="text-3xl">{avgHappiness >= 4 ? '😊' : avgHappiness >= 3 ? '🙂' : avgHappiness >= 2 ? '😐' : '😟'}</span>
          <div>
            <p className="text-lg font-bold text-foreground">{avgHappiness}/5 Satisfaction</p>
            <p className="text-xs text-muted-foreground">{checkins.length} feedback entries</p>
          </div>
        </div>
      )}

      {/* Lesson Verification */}
      {lessonPlans.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Completed Lessons - Verify Participation
          </h2>
          <div className="space-y-3">
            {lessonPlans.map(lp => (
              <div key={lp.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                <Checkbox checked={verifications[lp.id] || false} onCheckedChange={(checked) => handleVerify(lp.id, !!checked)} className="mt-1" />
                <div>
                  <p className="text-sm font-medium text-foreground">{lp.topicTitle}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{lp.objectives}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics Progress */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4">My Topics</h2>
        <div className="space-y-3">
          {topics.map(t => {
            const m = mastery.find(ms => ms.topicId === t.id);
            const score = m?.masteryScore || 0;
            return (
              <div key={t.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground">{t.title}</span>
                  <span className={`text-sm font-medium ${score >= 80 ? 'text-success' : score >= 50 ? 'text-accent' : 'text-muted-foreground'}`}>{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
