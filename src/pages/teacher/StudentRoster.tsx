import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const StudentRoster = () => {
  const { user } = useAuth();
  const { data: classes } = useTeacherClasses(user?.id);
  const [search, setSearch] = useState('');

  const classStudents = classes.map(c => ({
    className: c.name,
    classId: c.id,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Student Roster</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
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

const CLASS_LEVELS = ['Beginner', 'Basic', 'Medium', 'Advanced', 'Expert'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const ClassStudentList = ({ classId, className: clsName, search }: { classId: string; className: string; search: string }) => {
  const { data: students } = useClassStudents(classId);
  const { toast } = useToast();
  const [classInfo, setClassInfo] = useState<{ section: string | null; class_level: string | null }>({ section: null, class_level: null });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('classes').select('section, class_level').eq('id', classId).single();
      if (data) setClassInfo({ section: data.section, class_level: data.class_level });
    })();
  }, [classId]);

  const updateClassField = async (field: 'section' | 'class_level', value: string) => {
    const { error } = await supabase.from('classes').update({ [field]: value }).eq('id', classId);
    if (error) {
      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      return;
    }
    setClassInfo(prev => ({ ...prev, [field]: value }));
    toast({ title: `${field === 'section' ? 'Section' : 'Class Level'} updated to ${value}` });
  };

  const filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0 && search) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{clsName}</h2>
          <Badge variant="secondary">{students.length} students</Badge>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={classInfo.class_level || ''} onValueChange={v => updateClassField('class_level', v)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Class Level" />
            </SelectTrigger>
            <SelectContent>
              {CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classInfo.section || ''} onValueChange={v => updateClassField('section', v)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Student ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s: any, i: number) => (
            <TableRow key={s.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <span className="font-medium text-sm">{s.name}</span>
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
