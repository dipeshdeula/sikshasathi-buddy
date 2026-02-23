import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { BookOpen, FileQuestion, Users, BarChart3, TrendingUp, SmilePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ icon, label, value, to, color }: { icon: React.ReactNode; label: string; value: string | number; to: string; color: string }) => (
  <Link to={to} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
    <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-1 group-hover:text-primary transition-colors">{label}</p>
  </Link>
);

const TeacherDashboard = () => {
  const { user } = useAuth();
  if (!user) return null;

  const classes = db.classes.getByTeacher(user.id);
  const classId = classes[0]?.id;
  const students = classId ? db.classes.getStudents(classId) : [];
  const lessons = user ? db.lessonPlans.getByTeacher(user.id) : [];
  const quizzes = classId ? db.quizzes.getByClass(classId) : [];
  const checkins = classId ? db.checkins.getByClass(classId) : [];
  const avgHappiness = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.happinessScore, 0) / checkins.length).toFixed(1) : '—';

  const mastery = classId ? db.mastery.getByClass(classId) : [];
  const avgMastery = mastery.length > 0 ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">{classes[0]?.name || 'No class assigned'} · {students.length} students</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary-foreground" />} label="Lesson Plans" value={lessons.length} to="/teacher/lessons" color="bg-primary" />
        <StatCard icon={<FileQuestion className="h-5 w-5 text-accent-foreground" />} label="Quizzes" value={quizzes.length} to="/teacher/quizzes" color="bg-accent" />
        <StatCard icon={<BarChart3 className="h-5 w-5 text-success-foreground" />} label="Avg Mastery" value={`${avgMastery}%`} to="/teacher/mastery" color="bg-success" />
        <StatCard icon={<SmilePlus className="h-5 w-5 text-warning-foreground" />} label="Avg Happiness" value={`${avgHappiness}/5`} to="/teacher/mastery" color="bg-warning" />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="/teacher/lessons" className="flex items-center gap-3 bg-secondary rounded-lg p-4 hover:bg-secondary/80 transition-colors">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">New Lesson Plan</span>
          </Link>
          <Link to="/teacher/quizzes" className="flex items-center gap-3 bg-secondary rounded-lg p-4 hover:bg-secondary/80 transition-colors">
            <FileQuestion className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Create Quiz</span>
          </Link>
          <Link to="/teacher/results" className="flex items-center gap-3 bg-secondary rounded-lg p-4 hover:bg-secondary/80 transition-colors">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Enter Results</span>
          </Link>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Students ({students.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {students.map((s: any) => (
            <div key={s.id} className="bg-secondary rounded-lg p-3 text-center">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-sm font-bold">
                {s.name.charAt(0)}
              </div>
              <p className="text-xs font-medium text-foreground mt-2 truncate">{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
