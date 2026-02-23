import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { Bot, TrendingUp, SmilePlus, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

const StudentHome = () => {
  const { user } = useAuth();
  if (!user) return null;

  const mastery = db.mastery.getByStudent(user.id);
  const topics = db.topics.getAll();
  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const checkins = db.checkins.getByStudent(user.id);
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

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">My Topics</h2>
        <div className="space-y-3">
          {topics.map(t => {
            const m = mastery.find(ms => ms.topicId === t.id);
            const score = m?.masteryScore || 0;
            return (
              <div key={t.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground">{t.name}</span>
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
