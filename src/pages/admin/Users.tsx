import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch profiles with their roles
      const { data: profiles } = await supabase.from('profiles').select('id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      
      if (profiles && roles) {
        const userList: UserWithRole[] = profiles.map(p => {
          const userRole = roles.find(r => r.user_id === p.id);
          return {
            id: p.id,
            full_name: p.full_name || '',
            email: '', // email is in auth.users, not accessible from client
            role: userRole?.role || 'STUDENT',
          };
        });
        setUsers(userList);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const roleGroups = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const;

  if (loading) return <div className="animate-fade-in p-8 text-muted-foreground">Loading users...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">User Management</h1>

      {roleGroups.map(role => {
        const roleUsers = users.filter(u => u.role === role);
        if (roleUsers.length === 0) return null;
        return (
          <div key={role} className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">{role.toLowerCase()}s ({roleUsers.length})</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {roleUsers.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">{u.full_name}</td>
                      <td className="px-4 py-2"><Badge variant="secondary" className="capitalize">{u.role.toLowerCase()}</Badge></td>
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
