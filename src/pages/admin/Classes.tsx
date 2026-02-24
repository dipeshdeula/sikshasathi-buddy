import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, GraduationCap, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClassRow {
  id: string;
  name: string;
  classLevel: string | null;
  section: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
  subjectIds: string[];
}

interface TeacherOption { id: string; name: string }
interface SubjectOption { id: string; name: string }

const CLASS_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const MultiSubjectSelect = ({
  subjects,
  selectedIds,
  onChange,
}: {
  subjects: SubjectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(s => s !== id)
        : [...selectedIds, id]
    );
  };

  const selectedNames = subjects.filter(s => selectedIds.includes(s.id)).map(s => s.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-left font-normal">
          {selectedNames.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedNames.map(name => (
                <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Search & select subjects...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Type to search subjects..." />
          <CommandList>
            <CommandEmpty>No subjects found.</CommandEmpty>
            <CommandGroup>
              {subjects.map(s => (
                <CommandItem key={s.id} value={s.name} onSelect={() => toggle(s.id)}>
                  <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const AdminClasses = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', classLevel: '', section: '', teacherId: '', subjectIds: [] as string[] });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: classData },
      { data: teacherProfiles },
      { data: subjectData },
      { data: csData },
    ] = await Promise.all([
      supabase.from('classes').select('id, name, class_level, section, teacher_id'),
      supabase.from('user_roles').select('user_id').eq('role', 'TEACHER'),
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('class_subjects').select('class_id, subject_id'),
    ]);

    const teacherIds = (teacherProfiles || []).map(t => t.user_id);
    let teacherList: TeacherOption[] = [];
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
      teacherList = (profiles || []).map(p => ({ id: p.id, name: p.full_name }));
    }

    const { data: studentCounts } = await supabase.from('class_students').select('class_id');
    const countMap: Record<string, number> = {};
    (studentCounts || []).forEach(s => { countMap[s.class_id] = (countMap[s.class_id] || 0) + 1; });

    // Build class-subjects map
    const classSubMap: Record<string, string[]> = {};
    (csData || []).forEach((cs: any) => {
      if (!classSubMap[cs.class_id]) classSubMap[cs.class_id] = [];
      classSubMap[cs.class_id].push(cs.subject_id);
    });

    setClasses((classData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      classLevel: c.class_level,
      section: c.section,
      teacherId: c.teacher_id,
      teacherName: teacherList.find(t => t.id === c.teacher_id)?.name || null,
      studentCount: countMap[c.id] || 0,
      subjectIds: classSubMap[c.id] || [],
    })));
    setTeachers(teacherList);
    setSubjects((subjectData || []).map((s: any) => ({ id: s.id, name: s.name })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createClass = async () => {
    if (!form.classLevel) { toast({ title: 'Class Level (Grade) is required', variant: 'destructive' }); return; }
    setSaving(true);
    const className = form.name.trim() || `Class ${form.classLevel}${form.section ? ' - ' + form.section : ''}`;
    const { data: inserted, error } = await supabase.from('classes').insert({
      name: className,
      class_level: form.classLevel,
      section: form.section || null,
      teacher_id: form.teacherId || null,
      grade_id: null,
    }).select('id').single();
    if (error) { setSaving(false); toast({ title: 'Failed to create class', description: error.message, variant: 'destructive' }); return; }

    // Insert class_subjects
    if (form.subjectIds.length > 0 && inserted) {
      await supabase.from('class_subjects').insert(
        form.subjectIds.map(sid => ({ class_id: inserted.id, subject_id: sid }))
      );
    }

    setSaving(false);
    toast({ title: 'Class created!' });
    setForm({ name: '', classLevel: '', section: '', teacherId: '', subjectIds: [] });
    setCreateOpen(false);
    fetchAll();
  };

  const updateClassField = async (classId: string, field: string, value: string | null) => {
    const { error } = await supabase.from('classes').update({ [field]: value }).eq('id', classId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Updated!' });
    fetchAll();
  };

  const updateClassSubjects = async (classId: string, newSubjectIds: string[]) => {
    // Delete all existing, then re-insert
    await supabase.from('class_subjects').delete().eq('class_id', classId);
    if (newSubjectIds.length > 0) {
      await supabase.from('class_subjects').insert(
        newSubjectIds.map(sid => ({ class_id: classId, subject_id: sid }))
      );
    }
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
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Class</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Class Name <span className="text-muted-foreground text-xs">(optional – auto-generated if empty)</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Class 7A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Class Level (Grade) *</Label>
                  <Select value={form.classLevel} onValueChange={v => setForm(f => ({ ...f, classLevel: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Class {l}</SelectItem>)}
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
                <Label>Assign Subjects</Label>
                <MultiSubjectSelect subjects={subjects} selectedIds={form.subjectIds} onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))} />
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
                  <TableHead>Class Level (Grade)</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Select value={c.classLevel || ''} onValueChange={v => updateClassField(c.id, 'class_level', v || null)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Class {l}</SelectItem>)}
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
                      <Select value={c.teacherId || ''} onValueChange={v => updateClassField(c.id, 'teacher_id', v || null)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <MultiSubjectSelect
                        subjects={subjects}
                        selectedIds={c.subjectIds}
                        onChange={ids => updateClassSubjects(c.id, ids)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{c.studentCount}</Badge>
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
    </div>
  );
};

export default AdminClasses;
