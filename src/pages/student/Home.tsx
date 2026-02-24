import { useAuth } from '@/contexts/AuthContext';
import { useStudentMastery, useTopics, useStudentCheckins, useTeacherLessonPlans, useStudentLessonVerifications } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Bot, TrendingUp, SmilePlus, BookOpen, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const StudentHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: mastery } = useStudentMastery(user?.id);
  const { data: topics } = useTopics();
  const { data: checkins } = useStudentCheckins(user?.id);

  // Get lesson plans (all completed ones visible to student)
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    // Fetch completed lesson plans that the student can see
    const fetchLessons = async () => {
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

      // Get verifications for this student
      const { data: vData } = await supabase
        .from('student_lesson_verifications')
        .select('*')
        .eq('student_id', user.id);
      const vMap: Record<string, boolean> = {};
      (vData || []).forEach((v: any) => { vMap[v.lesson_plan_id] = v.is_verified; });
      setVerifications(vMap);
    };
    fetchLessons();
  }, [user]);

  const handleVerify = async (lessonPlanId: string, checked: boolean) => {
    if (!user) return;
    if (checked) {
      await supabase.from('student_lesson_verifications').upsert({
        lesson_plan_id: lessonPlanId,
        student_id: user.id,
        is_verified: true,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'lesson_plan_id,student_id' });
    } else {
      await supabase.from('student_lesson_verifications')
        .update({ is_verified: false })
        .eq('lesson_plan_id', lessonPlanId)
        .eq('student_id', user.id);
    }
    setVerifications(prev => ({ ...prev, [lessonPlanId]: checked }));
    toast({ title: checked ? 'Lesson verified ✅' : 'Verification removed' });
  };

  if (!user) return null;

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const streakDays = Math.min(checkins.length, 7);

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">नमस्ते, {user.name.split(' ')[0]}! 👋</h1>
        <p className="text-muted-foreground">Keep learning, you're doing great!</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <p className="text-3xl font-bold text-primary">{avgMastery}%</p>
          <p className="text-sm text-muted-foreground mt-1">Overall Mastery</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <p className="text-3xl font-bold text-accent">{streakDays}🔥</p>
          <p className="text-sm text-muted-foreground mt-1">Day Streak</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/student/coach" className="bg-primary/10 rounded-xl p-5 flex flex-col items-center gap-2 hover:bg-primary/15 transition-colors">
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Coach</span>
        </Link>
        <Link to="/student/checkin" className="bg-accent/10 rounded-xl p-5 flex flex-col items-center gap-2 hover:bg-accent/15 transition-colors">
          <SmilePlus className="h-8 w-8 text-accent" />
          <span className="text-sm font-semibold text-foreground">Check-in</span>
        </Link>
        <Link to="/student/progress" className="bg-success/10 rounded-xl p-5 flex flex-col items-center gap-2 hover:bg-success/15 transition-colors">
          <TrendingUp className="h-8 w-8 text-success" />
          <span className="text-sm font-semibold text-foreground">Progress</span>
        </Link>
      </div>

      {/* Lesson Verification Section */}
      {lessonPlans.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Completed Lessons - Verify Participation
          </h2>
          <div className="space-y-3">
            {lessonPlans.map(lp => (
              <div key={lp.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                <Checkbox
                  checked={verifications[lp.id] || false}
                  onCheckedChange={(checked) => handleVerify(lp.id, !!checked)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{lp.topicTitle}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{lp.objectives}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">My Topics</h2>
        <div className="space-y-3">
          {topics.map(t => {
            const m = mastery.find(ms => ms.topicId === t.id);
            const score = m?.masteryScore || 0;
            return (
              <div key={t.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground">{t.title}</span>
                  <span className="text-sm text-muted-foreground">{score}%</span>
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
