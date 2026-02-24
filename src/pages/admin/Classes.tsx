import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Users, Trash2, UserPlus, BookOpen, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClassRow {
  id: string;
  name: string;
  classLevel: string | null;
  section: string | null;
  teacherId: string | null;
  teacherName: string | null;
  gradeId: string | null;
  gradeName: string | null;
  studentCount: number;
}

interface TeacherOption { id: string; name: string }
interface GradeOption { id: string; name: string }
interface SubjectOption { id: string; name: string }

const CLASS_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const AdminClasses = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignSubjectOpen, setAssignSubjectOpen] = useState<string | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: '', classLevel: '', section: '', teacherId: '', gradeId: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: classData },
      { data: teacherProfiles },
      { data: gradeData },
      { data: subjectData },
      { data: tsData },
    ] = await Promise.all([
      supabase.from('classes').select('id, name, class_level, section, teacher_id, grade_id, grades(name)'),
      supabase.from('user_roles').select('user_id').eq('role', 'TEACHER'),
      supabase.from('grades').select('id, name').order('name'),
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('teacher_subjects').select('teacher_id, subject_id'),
    ]);

    // Fetch teacher names
    const teacherIds = (teacherProfiles || []).map(t => t.user_id);
    let teacherList: TeacherOption[] = [];
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
      teacherList = (profiles || []).map(p => ({ id: p.id, name: p.full_name }));
    }

    // Count students per class
    const { data: studentCounts } = await supabase.from('class_students').select('class_id');
    const countMap: Record<string, number> = {};
    (studentCounts || []).forEach(s => { countMap[s.class_id] = (countMap[s.class_id] || 0) + 1; });

    // Build teacher subjects map
    const tsMap: Record<string, string[]> = {};
    (tsData || []).forEach((ts: any) => {
      if (!tsMap[ts.teacher_id]) tsMap[ts.teacher_id] = [];
      tsMap[ts.teacher_id].push(ts.subject_id);
    });
    setTeacherSubjects(tsMap);

    setClasses((classData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      classLevel: c.class_level,
      section: c.section,
      teacherId: c.teacher_id,
      teacherName: teacherList.find(t => t.id === c.teacher_id)?.name || null,
      gradeId: c.grade_id,
      gradeName: (c.grades as any)?.name || null,
      studentCount: countMap[c.id] || 0,
    })));
    setTeachers(teacherList);
    setGrades((gradeData || []).map((g: any) => ({ id: g.id, name: g.name })));
    setSubjects((subjectData || []).map((s: any) => ({ id: s.id, name: s.name })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createClass = async () => {
    if (!form.name.trim()) { toast({ title: 'Class name is required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('classes').insert({
      name: form.name.trim(),
      class_level: form.classLevel || null,
      section: form.section || null,
      teacher_id: form.teacherId || null,
      grade_id: form.gradeId || null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Failed to create class', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Class created!' });
    setForm({ name: '', classLevel: '', section: '', teacherId: '', gradeId: '' });
    setCreateOpen(false);
    fetchAll();
  };

  const updateClassField = async (classId: string, field: string, value: string | null) => {
    const { error } = await supabase.from('classes').update({ [field]: value }).eq('id', classId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Updated!' });
    fetchAll();
  };

  const deleteClass = async (classId: string) => {
    if (!confirm('Delete this class? Students will be unlinked.')) return;
    await supabase.from('class_students').delete().eq('class_id', classId);
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Class deleted' });
    fetchAll();
  };

  const toggleTeacherSubject = async (teacherId: string, subjectId: string) => {
    const current = teacherSubjects[teacherId] || [];
    if (current.includes(subjectId)) {
      await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId).eq('subject_id', subjectId);
    } else {
      await supabase.from('teacher_subjects').insert({ teacher_id: teacherId, subject_id: subjectId });
    }
    fetchAll();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Class Management</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Class</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Class Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Grade 7A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Class Level</Label>
                  <Select value={form.classLevel} onValueChange={v => setForm(f => ({ ...f, classLevel: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Grade {l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Assign Teacher</Label>
                <Select value={form.teacherId} onValueChange={v => setForm(f => ({ ...f, teacherId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={form.gradeId} onValueChange={v => setForm(f => ({ ...f, gradeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createClass} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 shadow-card text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No classes yet. Click "Create Class" to get started.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Select value={c.classLevel || ''} onValueChange={v => updateClassField(c.id, 'class_level', v || null)}>
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Grade {l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={c.section || ''} onValueChange={v => updateClassField(c.id, 'section', v || null)}>
                        <SelectTrigger className="w-[90px] h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={c.gradeId || ''} onValueChange={v => updateClassField(c.id, 'grade_id', v || null)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={c.teacherId || ''} onValueChange={v => updateClassField(c.id, 'teacher_id', v || null)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{c.studentCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.teacherId ? (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setAssignSubjectOpen(c.teacherId)}>
                          <BookOpen className="h-3 w-3" />
                          {(teacherSubjects[c.teacherId!] || []).length} assigned
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteClass(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Subject Assignment Dialog */}
      <Dialog open={!!assignSubjectOpen} onOpenChange={() => setAssignSubjectOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subjects to {teachers.find(t => t.id === assignSubjectOpen)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found. Add subjects first.</p>
            ) : (
              subjects.map(s => {
                const isAssigned = (teacherSubjects[assignSubjectOpen!] || []).includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => assignSubjectOpen && toggleTeacherSubject(assignSubjectOpen, s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isAssigned ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    {isAssigned && <Badge className="text-[10px]">Assigned</Badge>}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClasses;
