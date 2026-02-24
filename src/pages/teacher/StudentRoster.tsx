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
import { Users, Search, Plus, Eye, Trash2, UserPlus, BarChart3, SmilePlus, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CLASS_LEVELS = ['Beginner', 'Basic', 'Medium', 'Advanced', 'Expert'];
const SECTIONS = ['A', 'B', 'C', 'D'];

interface StudentMetrics {
  id: string;
  name: string;
  avgMastery: number;
  avgHappiness: number;
  challengesSubmitted: number;
  quizAttempts: number;
  badgeCount: number;
}

const StudentRoster = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes, refetch: refetchClasses } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id;
  const { data: students } = useClassStudents(classId);
  const { data: mastery } = useClassMastery(classId);
  const { data: checkins } = useClassCheckins(classId);

  const [search, setSearch] = useState('');
  const [classInfo, setClassInfo] = useState<{ section: string | null; class_level: string | null }>({ section: null, class_level: null });
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState<StudentMetrics | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Extra metrics
  const [challengeData, setChallengeData] = useState<Record<string, number>>({});
  const [quizData, setQuizData] = useState<Record<string, number>>({});
  const [badgeData, setBadgeData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (classId) {
      supabase.from('classes').select('section, class_level').eq('id', classId).single().then(({ data }) => {
        if (data) setClassInfo({ section: data.section, class_level: data.class_level });
      });
    }
  }, [classId]);

  useEffect(() => {
    if (!students.length) return;
    const sIds = students.map((s: any) => s.id);

    // Challenge submissions count
    supabase.from('challenge_submissions').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setChallengeData(counts);
    });
    // Quiz attempts count
    supabase.from('quiz_attempts').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setQuizData(counts);
    });
    // Badge count
    supabase.from('student_badges').select('student_id').in('student_id', sIds).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data || []).forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
      setBadgeData(counts);
    });
  }, [students.length]);

  const updateClassField = async (field: 'section' | 'class_level', value: string) => {
    if (!classId) return;
    const { error } = await supabase.from('classes').update({ [field]: value }).eq('id', classId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setClassInfo(prev => ({ ...prev, [field]: value }));
    toast({ title: `${field === 'section' ? 'Section' : 'Class Level'} updated` });
  };

  const getStudentMetrics = (sId: string, sName: string): StudentMetrics => {
    const scores = mastery.filter(m => m.studentId === sId);
    const avgMastery = scores.length > 0 ? Math.round(scores.reduce((s, m) => s + m.masteryScore, 0) / scores.length) : 0;
    const sCheckins = checkins.filter(c => c.studentId === sId);
    const avgHappiness = sCheckins.length > 0 ? Number((sCheckins.reduce((s, c) => s + c.happinessScore, 0) / sCheckins.length).toFixed(1)) : 0;
    return {
      id: sId, name: sName, avgMastery, avgHappiness,
      challengesSubmitted: challengeData[sId] || 0,
      quizAttempts: quizData[sId] || 0,
      badgeCount: badgeData[sId] || 0,
    };
  };

  const handleCreateStudent = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !classId) return;
    setCreating(true);
    try {
      // Create auth user via supabase admin (this will trigger handle_new_user which creates profile + role)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword.trim(),
        options: { data: { full_name: newName.trim(), role: 'STUDENT' } },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error('User creation failed');

      // Add to class
      await supabase.from('class_students').insert({ class_id: classId, student_id: authData.user.id });
      toast({ title: 'Student account created and added to class!' });
      setNewName(''); setNewEmail(''); setNewPassword(''); setShowCreate(false);
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
  };

  const filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Student Roster
        </h1>
        <Button onClick={() => setShowCreate(true)}><UserPlus className="h-4 w-4 mr-2" /> Add Student</Button>
      </div>

      {/* Class Info */}
      {classId && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">{classes[0]?.name}</span>
            <Badge variant="secondary">{students.length} students</Badge>
            <Select value={classInfo.class_level || ''} onValueChange={v => updateClassField('class_level', v)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Class Level" /></SelectTrigger>
              <SelectContent>{CLASS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={classInfo.section || ''} onValueChange={v => updateClassField('section', v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
            </Select>
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
            <p>No students found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Mastery</TableHead>
                <TableHead>Happiness</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>Quizzes</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any, i: number) => {
                const m = getStudentMetrics(s.id, s.name);
                return (
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.avgMastery} className="h-1.5 w-16" />
                        <span className={`text-xs font-medium ${m.avgMastery < 50 ? 'text-destructive' : 'text-success'}`}>{m.avgMastery}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{m.avgHappiness > 0 ? `${m.avgHappiness >= 4 ? '😊' : m.avgHappiness >= 3 ? '🙂' : '😐'} ${m.avgHappiness}` : '—'}</span>
                    </TableCell>
                    <TableCell className="text-sm">{m.challengesSubmitted}</TableCell>
                    <TableCell className="text-sm">{m.quizAttempts}</TableCell>
                    <TableCell className="text-sm">{m.badgeCount > 0 ? <Badge variant="secondary">{m.badgeCount}</Badge> : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowView(m)}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
            <Button onClick={handleCreateStudent} className="w-full" disabled={creating}>{creating ? 'Creating…' : 'Create & Add to Class'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Student Details — {showView?.name}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">{showView.avgMastery}%</p>
                  <p className="text-xs text-muted-foreground">Mastery</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <SmilePlus className="h-5 w-5 text-warning mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">{showView.avgHappiness || '—'}</p>
                  <p className="text-xs text-muted-foreground">Happiness</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Trophy className="h-5 w-5 text-accent mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">{showView.challengesSubmitted}</p>
                  <p className="text-xs text-muted-foreground">Challenges</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Trophy className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">{showView.badgeCount}</p>
                  <p className="text-xs text-muted-foreground">Badges</p>
                </div>
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

export default StudentRoster;
