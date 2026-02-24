import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses } from '@/hooks/use-supabase-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trophy, MessageSquare, Star, Trash2, Edit, Eye, Image, Send } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface Submission {
  id: string;
  challenge_id: string;
  student_id: string;
  answer_text: string;
  attachment_url: string | null;
  submitted_at: string;
  review_text: string | null;
  reviewed_at: string | null;
  is_winner: boolean;
  reaction_score: number | null;
  student_name?: string;
}

const TeacherChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id;

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Challenge | null>(null);
  const [showView, setShowView] = useState<Challenge | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [tab, setTab] = useState('challenges');

  useEffect(() => {
    if (user?.id) fetchChallenges();
  }, [user?.id]);

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false });
    setChallenges(data || []);
  };

  const fetchSubmissions = async (challengeId: string) => {
    const { data } = await supabase.from('challenge_submissions').select('*').eq('challenge_id', challengeId).order('submitted_at', { ascending: false });
    if (data) {
      const studentIds = [...new Set(data.map(s => s.student_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', studentIds.length ? studentIds : ['none']);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      setSubmissions(data.map(s => ({ ...s, student_name: nameMap[s.student_id] || 'Unknown' })));
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    const { error } = await supabase.from('challenges').insert({
      teacher_id: user!.id, class_id: classId || null,
      title: title.trim(), description: description.trim(), due_date: dueDate || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Challenge created!' });
    setTitle(''); setDescription(''); setDueDate(''); setShowCreate(false);
    fetchChallenges();
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    const { error } = await supabase.from('challenges').update({
      title: title.trim(), description: description.trim(), due_date: dueDate || null,
    }).eq('id', showEdit.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Challenge updated!' });
    setShowEdit(null); fetchChallenges();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('challenge_submissions').delete().eq('challenge_id', id);
    await supabase.from('challenges').delete().eq('id', id);
    toast({ title: 'Challenge deleted' });
    fetchChallenges();
  };

  const handleReview = async (subId: string) => {
    await supabase.from('challenge_submissions').update({
      review_text: reviewText, reviewed_at: new Date().toISOString(),
    }).eq('id', subId);
    toast({ title: 'Review sent!' });
    setReviewText(''); setReviewingId(null);
    if (showView) fetchSubmissions(showView.id);
  };

  const handleAwardBadge = async (sub: Submission) => {
    await supabase.from('student_badges').insert({
      student_id: sub.student_id, badge_name: '🏆 Challenge Winner',
      badge_description: `Won challenge: ${challenges.find(c => c.id === sub.challenge_id)?.title}`,
      points: 10, source_type: 'challenge', source_id: sub.challenge_id,
    });
    await supabase.from('challenge_submissions').update({ is_winner: true }).eq('id', sub.id);
    toast({ title: 'Badge awarded! 🏆' });
    if (showView) fetchSubmissions(showView.id);
  };

  const handlePublishToggle = async (id: string, current: boolean) => {
    await supabase.from('challenges').update({ is_active: !current }).eq('id', id);
    toast({ title: current ? 'Challenge unpublished' : 'Challenge published! Students can now see it.' });
    fetchChallenges();
  };

  const openEdit = (c: Challenge) => {
    setTitle(c.title); setDescription(c.description); setDueDate(c.due_date || '');
    setShowEdit(c);
  };

  const openView = (c: Challenge) => {
    setShowView(c);
    fetchSubmissions(c.id);
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Challenges
        </h1>
        <Button onClick={() => { setTitle(''); setDescription(''); setDueDate(''); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Challenge
        </Button>
      </div>

      {/* Challenges Table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        {challenges.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No challenges yet. Create one to get started!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.description}</TableCell>
                  <TableCell className="text-sm">{c.due_date ? new Date(c.due_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(c)}><Eye className="h-3 w-3 mr-1" /> View</Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePublishToggle(c.id, c.is_active)}>
                        <Send className="h-3 w-3 mr-1" /> {c.is_active ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Challenge Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Challenge</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} /></div>
            <div><Label>Due Date (optional)</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <Button onClick={handleCreate} className="w-full">Create Challenge</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Challenge Dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Challenge</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} /></div>
            <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Challenge + Submissions Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showView?.title} — Submissions</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-sm text-foreground">{showView.description}</p>
                {showView.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(showView.due_date).toLocaleDateString()}</p>}
              </div>

              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No submissions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Reaction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.student_name}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{s.answer_text}</TableCell>
                        <TableCell>
                          {s.attachment_url ? (
                            <a href={s.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                              <Image className="h-3 w-3" /> View
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {s.reaction_score ? (
                            <span className="text-sm">{s.reaction_score >= 4 ? '😊' : s.reaction_score >= 3 ? '🙂' : s.reaction_score >= 2 ? '😐' : '😟'} {s.reaction_score}/5</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {s.is_winner ? <Badge className="bg-warning text-warning-foreground"><Trophy className="h-3 w-3 mr-1" />Winner</Badge>
                            : s.reviewed_at ? <Badge variant="secondary">Reviewed</Badge>
                            : <Badge variant="outline">Pending</Badge>}
                        </TableCell>
                        <TableCell>
                          {reviewingId === s.id ? (
                            <div className="flex gap-2 items-center">
                              <Input value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Feedback..." className="w-40" />
                              <Button size="sm" onClick={() => handleReview(s.id)}>Send</Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setReviewingId(s.id); setReviewText(s.review_text || ''); }}>
                                <MessageSquare className="h-3 w-3 mr-1" />Review
                              </Button>
                              {!s.is_winner && (
                                <Button variant="ghost" size="sm" onClick={() => handleAwardBadge(s)}>
                                  <Star className="h-3 w-3 mr-1" />Award
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherChallenges;
