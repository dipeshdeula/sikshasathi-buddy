import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

interface UserWithRole {
  id: string;
  full_name: string;
  role: string;
  is_verified: boolean;
}

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const;

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, is_verified');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles && roles) {
      setUsers(profiles.map(p => {
        const userRole = roles.find(r => r.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name || '',
          role: userRole?.role || 'STUDENT',
          is_verified: p.is_verified ?? false,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
    if (error) { toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Role updated to ${newRole}` });
    fetchUsers();
  };

  const filteredUsers = filter === 'ALL' ? users : users.filter(u => u.role === filter);

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-destructive/10 text-destructive';
      case 'TEACHER': return 'bg-primary/10 text-primary';
      case 'STUDENT': return 'bg-success/10 text-success';
      case 'PARENT': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filteredUsers.length} users</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <button key={role} onClick={() => setFilter(role)} className={`bg-card rounded-xl border border-border p-4 shadow-card text-center transition-shadow hover:shadow-elevated ${filter === role ? 'ring-2 ring-primary' : ''}`}>
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{role.toLowerCase()}s</p>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{u.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${u.is_verified ? 'text-success' : 'text-warning'}`}>
                      {u.is_verified ? '✓ Verified' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={v => changeRole(u.id, v)}>
                      <SelectTrigger className="w-[120px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
