import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, GraduationCap, BookOpen, BarChart3, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, parents: 0, classes: 0, subjects: 0, audits: 0 });
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [
        { count: userCount },
        { data: roles },
        { count: classCount },
        { count: subjectCount },
        { data: audits },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('role'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const roleCounts = { TEACHER: 0, STUDENT: 0, PARENT: 0, ADMIN: 0 };
      (roles || []).forEach((r: any) => { if (roleCounts[r.role as keyof typeof roleCounts] !== undefined) roleCounts[r.role as keyof typeof roleCounts]++; });

      setStats({
        users: userCount || 0,
        teachers: roleCounts.TEACHER,
        students: roleCounts.STUDENT,
        parents: roleCounts.PARENT,
        classes: classCount || 0,
        subjects: subjectCount || 0,
        audits: (audits || []).length,
      });
      setRecentAudits((audits || []).map((a: any) => ({
        id: a.id, action: a.action, entityType: a.entity_type, entityId: a.entity_id, createdAt: a.created_at,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { icon: <Users className="h-5 w-5 text-primary-foreground" />, label: 'Total Users', value: stats.users, sub: `${stats.teachers}T · ${stats.students}S · ${stats.parents}P`, to: '/admin/users', bg: 'bg-primary' },
    { icon: <GraduationCap className="h-5 w-5 text-accent-foreground" />, label: 'Classes', value: stats.classes, to: '/admin/classes', bg: 'bg-accent' },
    { icon: <BookOpen className="h-5 w-5 text-success-foreground" />, label: 'Subjects', value: stats.subjects, to: '/admin/subjects', bg: 'bg-success' },
    { icon: <BarChart3 className="h-5 w-5 text-warning-foreground" />, label: 'Audit Logs', value: stats.audits, to: '#', bg: 'bg-warning' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(s => (
          <Link key={s.label} to={s.to} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow">
            <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            {'sub' in s && s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Audit Logs</h2>
        {recentAudits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs yet.</p>
        ) : (
          <div className="space-y-2">
            {recentAudits.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.entityType} · {a.entityId?.slice(0, 8)}</p>
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
