import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { Progress } from '@/components/ui/progress';

const MasteryDashboard = () => {
  const { user } = useAuth();
  const classes = user ? db.classes.getByTeacher(user.id) : [];
  const classId = classes[0]?.id || '';
  const students = classId ? db.classes.getStudents(classId) : [];
  const topics = db.topics.getAll();
  const mastery = classId ? db.mastery.getByClass(classId) : [];
  const checkins = classId ? db.checkins.getByClass(classId) : [];

  // Topic averages
  const topicAvgs = topics.map(t => {
    const scores = mastery.filter(m => m.topicId === t.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    return { ...t, avg, weak: avg < 60 };
  }).sort((a, b) => a.avg - b.avg);

  // Students needing support (avg mastery < 50)
  const studentSupport = students.map((s: any) => {
    const scores = mastery.filter(m => m.studentId === s.id);
    const avg = scores.length > 0 ? Math.round(scores.reduce((sum, m) => sum + m.masteryScore, 0) / scores.length) : 0;
    return { ...s, avg };
  }).filter((s: any) => s.avg < 50).sort((a: any, b: any) => a.avg - b.avg);

  const avgHappiness = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1) : '—';

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">Mastery Dashboard</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Topic Mastery (Class Average)</h2>
          <div className="space-y-3">
            {topicAvgs.map(t => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{t.name}</span>
                  <span className={`text-sm font-medium ${t.weak ? 'text-destructive' : 'text-success'}`}>{t.avg}%</span>
                </div>
                <Progress value={t.avg} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-2">Class Happiness</h2>
            <div className="flex items-center gap-3">
              <span className="text-4xl">😊</span>
              <div>
                <p className="text-3xl font-bold text-foreground">{avgHappiness}</p>
                <p className="text-sm text-muted-foreground">out of 5 ({checkins.length} check-ins)</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Students Needing Support</h2>
            {studentSupport.length === 0 ? (
              <p className="text-sm text-muted-foreground">All students are above 50% mastery! 🎉</p>
            ) : (
              <div className="space-y-2">
                {studentSupport.slice(0, 8).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-destructive/5 rounded-lg p-3">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-destructive font-medium">{s.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasteryDashboard;
