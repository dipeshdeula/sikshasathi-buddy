import { db } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

const AdminUsers = () => {
  const users = db.users.getAll();
  const roles = ['admin', 'teacher', 'student', 'parent'] as const;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">User Management</h1>

      {roles.map(role => {
        const roleUsers = users.filter(u => u.role === role);
        if (roleUsers.length === 0) return null;
        return (
          <div key={role} className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">{role}s ({roleUsers.length})</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Email</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {roleUsers.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">{u.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2"><Badge variant="secondary" className="capitalize">{u.role}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminUsers;
