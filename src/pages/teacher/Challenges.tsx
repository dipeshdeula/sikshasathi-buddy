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
import { Plus, Trophy, MessageSquare, Star, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  submitted_at: string;
  review_text: string | null;
  reviewed_at: string | null;
  is_winner: boolean;
  student_name?: string;
}

const TeacherChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id;

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (user?.id) fetchChallenges();
  }, [user?.id]);

  useEffect(() => {
    if (selectedChallenge) fetchSubmissions(selectedChallenge);
  }, [selectedChallenge]);

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false });
    setChallenges(data || []);
    if (data?.length && !selectedChallenge) setSelectedChallenge(data[0].id);
  };

  const fetchSubmissions = async (challengeId: string) => {
    const { data } = await supabase.from('challenge_submissions').select('*').eq('challenge_id', challengeId).order('submitted_at', { ascending: false });
    if (data) {
      const studentIds = [...new Set(data.map(s => s.student_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', studentIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      setSubmissions(data.map(s => ({ ...s, student_name: nameMap[s.student_id] || 'Unknown' })));
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    const { error } = await supabase.from('challenges').insert({
      teacher_id: user!.id,
      class_id: classId || null,
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Challenge created!' });
    setTitle(''); setDescription(''); setDueDate(''); setShowCreate(false);
    fetchChallenges();
  };

  const handleReview = async (subId: string) => {
    const { error } = await supabase.from('challenge_submissions').update({
      review_text: reviewText,
      reviewed_at: new Date().toISOString(),
    }).eq('id', subId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Review submitted!' });
    setReviewText(''); setReviewingId(null);
    fetchSubmissions(selectedChallenge!);
  };

  const handleAwardBadge = async (sub: Submission) => {
    const { error: badgeErr } = await supabase.from('student_badges').insert({
      student_id: sub.student_id,
      badge_name: '🏆 Challenge Winner',
      badge_description: `Won challenge: ${challenges.find(c => c.id === sub.challenge_id)?.title}`,
      points: 10,
      source_type: 'challenge',
      source_id: sub.challenge_id,
    });
    const { error: winErr } = await supabase.from('challenge_submissions').update({ is_winner: true }).eq('id', sub.id);
    if (badgeErr || winErr) { toast({ title: 'Error', variant: 'destructive' }); return; }
    toast({ title: 'Badge awarded! 🏆' });
    fetchSubmissions(selectedChallenge!);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('challenges').delete().eq('id', id);
    toast({ title: 'Challenge deleted' });
    fetchChallenges();
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Challenges</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Challenge</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Challenge title..." /></div>
              <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the challenge..." rows={4} /></div>
              <div><Label>Due Date (optional)</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full">Create Challenge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedChallenge || ''} onValueChange={setSelectedChallenge}>
        <TabsList className="flex-wrap h-auto">
          {challenges.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="text-xs">{c.title}</TabsTrigger>
          ))}
        </TabsList>

        {challenges.map(c => (
          <TabsContent key={c.id} value={c.id} className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                  {c.due_date && <p className="text-xs text-muted-foreground mt-2">Due: {new Date(c.due_date).toLocaleDateString()}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-card">
              <h3 className="text-base font-semibold text-foreground mb-3">Submissions ({submissions.length})</h3>
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.student_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.answer_text}</TableCell>
                        <TableCell>
                          {s.is_winner ? <Badge className="bg-warning text-warning-foreground"><Trophy className="h-3 w-3 mr-1" />Winner</Badge>
                            : s.reviewed_at ? <Badge variant="secondary">Reviewed</Badge>
                            : <Badge variant="outline">Pending</Badge>}
                        </TableCell>
                        <TableCell className="space-x-1">
                          {reviewingId === s.id ? (
                            <div className="flex gap-2 items-center">
                              <Input value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Feedback..." className="w-40" />
                              <Button size="sm" onClick={() => handleReview(s.id)}>Send</Button>
                            </div>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setReviewingId(s.id); setReviewText(s.review_text || ''); }}>
                                <MessageSquare className="h-3 w-3 mr-1" />Review
                              </Button>
                              {!s.is_winner && (
                                <Button variant="ghost" size="sm" onClick={() => handleAwardBadge(s)}>
                                  <Star className="h-3 w-3 mr-1" />Award
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {challenges.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No challenges yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

export default TeacherChallenges;
