import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, useClassMastery, useClassCheckins } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Eye, Trash2, UserPlus, BarChart3, SmilePlus, Trophy, CheckCircle, XCircle, Pencil, ShieldCheck, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CLASS_LEVELS = ['1', '2', '3'];
const SECTIONS = ['A', 'B', 'C'];

interface PendingStudent {
  id: string;
  name: string;
  is_verified: boolean;
  preferred_class_level: string | null;
  preferred_section: string | null;
}

interface StudentMetrics {
  id: string;
  name: string;
  avgMastery: number;
  avgHappiness: number;
  challengesSubmitted: number;
  quizAttempts: number;
  quizAvgScore: number;
  badgeCount: number;
  lessonsVerified: number;
}

const StudentRoster = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useTeacherClasses(user?.id);

  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const classId = selectedClassId || classes[0]?.id;
  const { data: students, refetch: refetchStudents } = useClassStudents(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState<StudentMetrics | null>(null);
  const [showEdit, setShowEdit] = useState<PendingStudent | null>(null);
  const [editName, setEditName] = useState('');
  const [editClassLevel, setEditClassLevel] = useState('');
  const [editSection, setEditSection] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [newSection, setNewSection] = useState('');
  const [creating, setCreating] = useState(false);

  // Pending students from edge function
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  // Per-pending-student selections for class level & section
  const [pendingSelections, setPendingSelections] = useState<Record<string, { classLevel: string; section: string }>>({});

  // Extra metrics
  const [challengeData, setChallengeData] = useState<Record<string, number>>({});
  const [quizData, setQuizData] = useState<Record<string, { attempts: number; avgScore: number }>>({});
  const [badgeData, setBadgeData] = useState<Record<string, number>>({});
  const [lessonVerifData, setLessonVerifData] = useState<Record<string, number>>({});

  // Fetch pending students via edge function
  const fetchPendingStudents = async () => {
    setPendingLoading(true);
    try {
      const res = await supabase.functions.invoke('list-pending-students');
      if (res.data && Array.isArray(res.data)) {
        setPendingStudents(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch pending students:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  // Fetch metrics for enrolled students
  useEffect(() => {
    if (!students.length) return;
    const sIds = students.map((s: any) => s.id);

    supabase.from('challenge_submissions').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setChallengeData(counts);
    });
    supabase.from('quiz_attempts').select('student_id, score').in('student_id', sIds).then(({ data }) => {
      const map: Record<string, { total: number; sum: number }> = {};
      (data || []).forEach((d: any) => {
        if (!map[d.student_id]) map[d.student_id] = { total: 0, sum: 0 };
        map[d.student_id].total++;
        map[d.student_id].sum += (d.score || 0);
      });
      const result: Record<string, { attempts: number; avgScore: number }> = {};
      Object.entries(map).forEach(([k, v]) => { result[k] = { attempts: v.total, avgScore: Math.round(v.sum / v.total) }; });
      setQuizData(result);
    });
    supabase.from('student_badges').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setBadgeData(counts);
    });
    supabase.from('student_lesson_verifications').select('student_id').in('student_id', sIds).eq('is_verified', true).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setLessonVerifData(counts);
    });
  }, [students.length]);

  const getStudentMetrics = (sId: string, sName: string): StudentMetrics => {
    const scores = mastery.filter(m => m.studentId === sId);
    const avgMastery = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    const sCheckins = checkins.filter(c => c.studentId === sId);
    const avgHappiness = sCheckins.length > 0 ? Number((sCheckins.reduce((s, c) => s + c.happinessScore, 0) / sCheckins.length).toFixed(1)) : 0;
    return {
      id: sId, name: sName, avgMastery, avgHappiness,
      challengesSubmitted: challengeData[sId] || 0,
      quizAttempts: quizData[sId]?.attempts || 0,
      quizAvgScore: quizData[sId]?.avgScore || 0,
      badgeCount: badgeData[sId] || 0,
      lessonsVerified: lessonVerifData[sId] || 0,
    };
  };

  const handleVerifyStudent = async (studentId: string) => {
    try {
      const res = await supabase.functions.invoke('verify-student', {
        body: { student_id: studentId },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Student verified!' });
      // Update local state
      setPendingStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_verified: true } : s));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddToClass = async (studentId: string) => {
    if (!classId) { toast({ title: 'No class selected', variant: 'destructive' }); return; }
    const sel = pendingSelections[studentId];
    try {
      const res = await supabase.functions.invoke('verify-student', {
        body: {
          student_id: studentId,
          class_id: classId,
          class_level: sel?.classLevel || undefined,
          section: sel?.section || undefined,
        },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Student added to class!' });
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
      refetchStudents();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateStudent = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !classId) return;
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('create-student', {
        body: {
          full_name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword.trim(),
          class_id: classId,
          class_level: newClassLevel || undefined,
          section: newSection || undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Student account created and added to class!' });
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewClassLevel(''); setNewSection('');
      setShowCreate(false);
      refetchStudents();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!classId) return;
    await supabase.from('class_students').delete().eq('class_id', classId).eq('student_id', studentId);
    toast({ title: 'Student removed from class' });
    refetchStudents();
  };

  const handleEditStudent = async () => {
    if (!showEdit) return;
    const updates: any = {};
    if (editName.trim()) updates.full_name = editName.trim();
    if (editClassLevel) updates.preferred_class_level = editClassLevel;
    if (editSection) updates.preferred_section = editSection;
    const { error } = await supabase.from('profiles').update(updates).eq('id', showEdit.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Student updated' });
    setShowEdit(null);
    refetchStudents();
    fetchPendingStudents();
  };

  const openEdit = (s: PendingStudent) => {
    setShowEdit(s);
    setEditName(s.name);
    setEditClassLevel(s.preferred_class_level || '');
    setEditSection(s.preferred_section || '');
  };

  // Combine enrolled students + pending (unassigned) students
  const allStudents = [
    ...students.map((s: any) => ({ ...s, source: 'enrolled' as const })),
    ...pendingStudents
      .filter(ps => !students.some((s: any) => s.id === ps.id))
      .map(ps => ({ id: ps.id, name: ps.name, isVerified: ps.is_verified, classLevel: ps.preferred_class_level, section: ps.preferred_section, source: 'pending' as const })),
  ];
  const filtered = allStudents.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Student Roster
        </h1>
        <Button onClick={() => setShowCreate(true)}><UserPlus className="h-4 w-4 mr-2" /> Add Student</Button>
      </div>

      {/* Class Selector */}
      {classes.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            {classes.length > 1 ? (
              <Select value={classId || ''} onValueChange={v => setSelectedClassId(v)}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium text-foreground">{classes[0]?.name}</span>
            )}
            <Badge variant="secondary">{students.length} enrolled</Badge>
            {pendingStudents.filter(ps => !students.some((s: any) => s.id === ps.id)).length > 0 && (
              <Badge variant="outline" className="text-warning border-warning">{pendingStudents.filter(ps => !students.some((s: any) => s.id === ps.id)).length} pending</Badge>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Student Table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No students enrolled in this class yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Mastery</TableHead>
                <TableHead>Quizzes</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any, i: number) => {
                const m = getStudentMetrics(s.id, s.name);
                const isPending = !s.isVerified;
                return (
                  <TableRow key={s.id} className={isPending ? 'bg-warning/5' : ''}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${isPending ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>{s.name.charAt(0)}</div>
                        <span className="font-medium text-sm">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.isVerified
                        ? <Badge variant="default" className="text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                        : <Badge variant="outline" className="text-[10px] text-warning border-warning"><XCircle className="h-3 w-3 mr-1" />Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.classLevel || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.section || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.avgMastery} className="h-1.5 w-16" />
                        <span className={`text-xs font-medium ${m.avgMastery < 50 ? 'text-destructive' : 'text-success'}`}>{m.avgMastery}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{m.quizAttempts}</TableCell>
                    <TableCell className="text-sm">{m.challengesSubmitted}</TableCell>
                    <TableCell className="text-sm">{m.badgeCount > 0 ? <Badge variant="secondary">{m.badgeCount}</Badge> : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowView(m)} title="View details"><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit({ id: s.id, name: s.name, is_verified: s.isVerified, preferred_class_level: s.classLevel, preferred_section: s.section })} title="Edit"><Pencil className="h-3 w-3" /></Button>
                        {isPending && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleVerifyStudent(s.id)} title="Verify"><ShieldCheck className="h-3 w-3 text-success" /></Button>
                            {s.source === 'pending' && (
                              <Button variant="ghost" size="sm" onClick={() => handleAddToClass(s.id)} title="Add to class"><UserPlus className="h-3 w-3 text-primary" /></Button>
                            )}
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(s.id)} title="Remove"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Student Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Student Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Student name" /></div>
            <div><Label>Email</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="student@email.com" type="email" /></div>
            <div><Label>Password</Label><Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" type="password" /></div>
            <div>
              <Label>Class Level</Label>
              <Select value={newClassLevel} onValueChange={setNewClassLevel}>
                <SelectTrigger><SelectValue placeholder="Select class level" /></SelectTrigger>
                <SelectContent>{CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Class {l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={newSection} onValueChange={setNewSection}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Student will be auto-verified and added to the selected class.</p>
            <Button onClick={handleCreateStudent} className="w-full" disabled={creating}>{creating ? 'Creating…' : 'Create New Student'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student — {showEdit?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div>
              <Label>Class Level</Label>
              <Select value={editClassLevel} onValueChange={setEditClassLevel}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>{CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>Class {l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={editSection} onValueChange={setEditSection}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditStudent} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Student Metrics Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Student Details — {showView?.name}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={<BarChart3 className="h-5 w-5 text-primary" />} value={`${showView.avgMastery}%`} label="Avg Mastery" />
                <MetricCard icon={<SmilePlus className="h-5 w-5 text-warning" />} value={showView.avgHappiness > 0 ? `${showView.avgHappiness}` : '—'} label="Happiness" />
                <MetricCard icon={<BookOpen className="h-5 w-5 text-accent" />} value={`${showView.quizAttempts}`} label="Quizzes Taken" />
                <MetricCard icon={<BarChart3 className="h-5 w-5 text-success" />} value={showView.quizAvgScore > 0 ? `${showView.quizAvgScore}%` : '—'} label="Quiz Avg Score" />
                <MetricCard icon={<Trophy className="h-5 w-5 text-accent" />} value={`${showView.challengesSubmitted}`} label="Challenges Done" />
                <MetricCard icon={<Trophy className="h-5 w-5 text-success" />} value={`${showView.badgeCount}`} label="Badges Earned" />
                <MetricCard icon={<CheckCircle className="h-5 w-5 text-primary" />} value={`${showView.lessonsVerified}`} label="Lessons Verified" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {classes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No classes assigned yet.</p>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="bg-secondary rounded-lg p-3 text-center">
    <div className="mx-auto mb-1 flex justify-center">{icon}</div>
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default StudentRoster;
