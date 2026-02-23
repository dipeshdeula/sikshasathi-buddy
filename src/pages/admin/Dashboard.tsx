import { db } from '@/lib/store';
import { Users, GraduationCap, BookOpen, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const users = db.users.getAll();
  const classes = db.classes.getAll();
  const subjects = db.subjects.getAll();
  const audits = db.audit.getAll();

  const stats = [
    { icon: <Users className="h-5 w-5 text-primary-foreground" />, label: 'Total Users', value: users.length, to: '/admin/users', bg: 'bg-primary' },
    { icon: <GraduationCap className="h-5 w-5 text-accent-foreground" />, label: 'Classes', value: classes.length, to: '/admin/classes', bg: 'bg-accent' },
    { icon: <BookOpen className="h-5 w-5 text-success-foreground" />, label: 'Subjects', value: subjects.length, to: '/admin/subjects', bg: 'bg-success' },
    { icon: <BarChart3 className="h-5 w-5 text-warning-foreground" />, label: 'Audit Logs', value: audits.length, to: '#', bg: 'bg-warning' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={s.to} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow">
            <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Audit Logs</h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs yet.</p>
        ) : (
          <div className="space-y-2">
            {audits.slice(-10).reverse().map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.entityType} · {a.entityId}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
