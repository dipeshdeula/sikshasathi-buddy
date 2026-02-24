import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents } from '@/hooks/use-supabase-data';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const StudentRoster = () => {
  const { user } = useAuth();
  const { data: classes } = useTeacherClasses(user?.id);
  const [search, setSearch] = useState('');

  // Gather all students across all classes
  const classStudents = classes.map(c => ({
    className: c.name,
    classId: c.id,
  }));

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Student Roster</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {classStudents.map(cs => (
        <ClassStudentList key={cs.classId} classId={cs.classId} className={cs.className} search={search} />
      ))}

      {classes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No classes assigned yet.</p>
        </div>
      )}
    </div>
  );
};

const ClassStudentList = ({ classId, className, search }: { classId: string; className: string; search: string }) => {
  const { data: students } = useClassStudents(classId);
  const filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  if (filtered.length === 0 && search) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-foreground">{className}</h2>
        <Badge variant="secondary">{students.length} students</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s: any, i: number) => (
            <TableRow key={s.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <span className="font-medium">{s.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs font-mono">{s.id.slice(0, 8)}...</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentRoster;
