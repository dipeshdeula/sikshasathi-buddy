import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target } from 'lucide-react';

const StudentProgress = () => {
  const { user } = useAuth();
  if (!user) return null;

  const mastery = db.mastery.getByStudent(user.id);
  const topics = db.topics.getAll();
  const subjects = db.subjects.getAll();
  const checkins = db.checkins.getByStudent(user.id);

  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;
  const topicsAbove80 = mastery.filter(m => m.masteryScore >= 80).length;
  const totalTopics = topics.length;

  // Badges
  const badges = [];
  if (checkins.length >= 1) badges.push({ icon: '🌟', label: 'First Check-in' });
  if (checkins.length >= 5) badges.push({ icon: '🔥', label: '5-Day Streak' });
  if (topicsAbove80 >= 1) badges.push({ icon: '🏆', label: 'Topic Master' });
  if (avgMastery >= 70) badges.push({ icon: '📈', label: 'High Achiever' });

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">My Progress</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <Target className="h-6 w-6 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{avgMastery}%</p>
          <p className="text-xs text-muted-foreground">Avg Mastery</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <Trophy className="h-6 w-6 mx-auto text-accent mb-2" />
          <p className="text-2xl font-bold text-foreground">{topicsAbove80}/{totalTopics}</p>
          <p className="text-xs text-muted-foreground">Mastered</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <Star className="h-6 w-6 mx-auto text-warning mb-2" />
          <p className="text-2xl font-bold text-foreground">{badges.length}</p>
          <p className="text-xs text-muted-foreground">Badges</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-3">My Badges</h2>
          <div className="flex flex-wrap gap-3">
            {badges.map((b, i) => (
              <div key={i} className="bg-accent/10 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-xl">{b.icon}</span>
                <span className="text-sm font-medium text-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subjects.map(subj => {
        const subTopics = topics.filter(t => t.unitId === subj.id);
        return (
          <div key={subj.id} className="bg-card rounded-xl border border-border p-5 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">{subj.name}</h2>
            <div className="space-y-3">
              {subTopics.map(t => {
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
          </div>
        );
      })}
    </div>
  );
};

export default StudentProgress;
