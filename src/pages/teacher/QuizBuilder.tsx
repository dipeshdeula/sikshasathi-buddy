import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, FileQuestion, Loader2, Trash2, Edit, Eye, Send, Plus } from 'lucide-react';
import type { Grade, Subject, Unit, Topic, QuizQuestion } from '@/lib/data';
import { mapGrade, mapSubject, mapUnit, mapTopic, mapQuizQuestion } from '@/lib/data';

interface SavedQuiz {
  id: string;
  title: string;
  topic_id: string;
  is_published: boolean;
  created_at: string;
  questionCount: number;
}

const QuizBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id' | 'quizId'>[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // View/Edit quiz dialog
  const [viewQuiz, setViewQuiz] = useState<{ id: string; title: string; questions: QuizQuestion[] } | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    supabase.from('grades').select('*').order('name').then(({ data }) => {
      if (data) setGrades(data.map(mapGrade));
    });
    loadSavedQuizzes();
  }, []);

  useEffect(() => {
    if (!gradeId) { setSubjects([]); return; }
    supabase.from('subjects').select('*').eq('grade_id', gradeId).order('name').then(({ data }) => {
      if (data) setSubjects(data.map(mapSubject));
    });
    setSubjectId(''); setUnitId(''); setTopicId('');
  }, [gradeId]);

  useEffect(() => {
    if (!subjectId) { setUnits([]); return; }
    supabase.from('units').select('*').eq('subject_id', subjectId).order('order_index').then(({ data }) => {
      if (data) setUnits(data.map(mapUnit));
    });
    setUnitId(''); setTopicId('');
  }, [subjectId]);

  useEffect(() => {
    if (!unitId) { setTopics([]); return; }
    supabase.from('topics').select('*').eq('unit_id', unitId).order('order_index').then(({ data }) => {
      if (data) setTopics(data.map(mapTopic));
    });
    setTopicId('');
  }, [unitId]);

  const loadSavedQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(id)')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false });
    if (data) setSavedQuizzes(data.map((q: any) => ({
      id: q.id, title: q.title, topic_id: q.topic_id,
      is_published: q.is_published, created_at: q.created_at,
      questionCount: q.quiz_questions?.length || 0,
    })));
  };

  const handleGenerate = async () => {
    const topic = topics.find(t => t.id === topicId);
    const subject = subjects.find(s => s.id === subjectId);
    if (!topic) return;
    setGenerating(true);
    try {
      const qs = await aiService.generateQuiz({ topic: topic.title, numQuestions: numQ, subject: subject?.name });
      setQuestions(qs);
      setTitle(`${topic.title} Quiz`);
      toast({ title: `Generated ${qs.length} questions!` });
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!topicId || questions.length === 0 || !user) {
      toast({ title: 'Complete all fields', variant: 'destructive' });
      return;
    }
    const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', user.id).limit(1);
    const classId = classes?.[0]?.id;
    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .insert({ class_id: classId || null, topic_id: topicId, title, created_by: user.id, is_published: false })
      .select()
      .single();
    if (quizErr || !quiz) { toast({ title: 'Failed to save quiz', variant: 'destructive' }); return; }
    const questionsToInsert = questions.map(q => ({
      quiz_id: quiz.id, qtype: q.qtype, difficulty: q.difficulty, prompt: q.prompt,
      options_json: q.optionsJson, answer_key: q.answerKey, explanation: q.explanation,
    }));
    await supabase.from('quiz_questions').insert(questionsToInsert);
    setQuestions([]); setTitle(''); setShowCreate(false);
    loadSavedQuizzes();
    toast({ title: 'Quiz saved!' });
  };

  const handleDelete = async (quizId: string) => {
    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
    await supabase.from('quizzes').delete().eq('id', quizId);
    toast({ title: 'Quiz deleted' });
    loadSavedQuizzes();
    if (viewQuiz?.id === quizId) setViewQuiz(null);
  };

  const handlePublishToggle = async (quizId: string, current: boolean) => {
    await supabase.from('quizzes').update({ is_published: !current }).eq('id', quizId);
    toast({ title: current ? 'Quiz unpublished' : 'Quiz published! Students can now solve it.' });
    loadSavedQuizzes();
  };

  const handleViewQuiz = async (quizId: string) => {
    const quiz = savedQuizzes.find(q => q.id === quizId);
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId);
    setViewQuiz({ id: quizId, title: quiz?.title || '', questions: (data || []).map(mapQuizQuestion) });
    setEditingTitle(quiz?.title || '');
  };

  const handleUpdateTitle = async () => {
    if (!viewQuiz || !editingTitle.trim()) return;
    await supabase.from('quizzes').update({ title: editingTitle.trim() }).eq('id', viewQuiz.id);
    toast({ title: 'Title updated' });
    loadSavedQuizzes();
    setViewQuiz(prev => prev ? { ...prev, title: editingTitle.trim() } : null);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-primary" /> Quiz Builder
        </h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Create Quiz</Button>
      </div>

      {/* Saved Quizzes Table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">All Quizzes ({savedQuizzes.length})</h2>
        {savedQuizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No quizzes yet. Create one to get started!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedQuizzes.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.title}</TableCell>
                  <TableCell>{q.questionCount} Qs</TableCell>
                  <TableCell>
                    <Badge variant={q.is_published ? 'default' : 'secondary'}>
                      {q.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewQuiz(q.id)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePublishToggle(q.id, q.is_published)}>
                        <Send className="h-3 w-3 mr-1" /> {q.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Quiz Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Quiz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div><Label>Grade</Label>
                <Select value={gradeId} onValueChange={setGradeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId} disabled={!gradeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label>
                <Select value={unitId} onValueChange={setUnitId} disabled={!subjectId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Topic</Label>
                <Select value={topicId} onValueChange={setTopicId} disabled={!unitId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="w-32"><Label># Questions</Label>
                <Input type="number" value={numQ} onChange={e => setNumQ(+e.target.value)} min={3} max={10} />
              </div>
              <Button onClick={handleGenerate} disabled={generating || !topicId} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating…' : 'Generate with AI'}
              </Button>
            </div>

            {questions.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz Title" />
                {questions.map((q, i) => (
                  <div key={i} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{q.difficulty}</span>
                      <span className="text-xs text-muted-foreground">{q.qtype.toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {q.optionsJson.map((opt, j) => (
                        <p key={j} className={`text-xs px-2 py-1 rounded ${String.fromCharCode(65 + j) === q.answerKey ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'}`}>
                          {String.fromCharCode(65 + j)}. {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" /> Save Quiz</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Quiz Dialog */}
      <Dialog open={!!viewQuiz} onOpenChange={() => setViewQuiz(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quiz Details</DialogTitle></DialogHeader>
          {viewQuiz && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} />
                <Button size="sm" onClick={handleUpdateTitle}><Edit className="h-3 w-3 mr-1" /> Update</Button>
              </div>
              <p className="text-sm text-muted-foreground">{viewQuiz.questions.length} questions</p>
              {viewQuiz.questions.map((q, i) => (
                <div key={q.id} className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Q{i + 1} · {q.difficulty} · {q.qtype}</p>
                  <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {q.optionsJson.map((opt, j) => (
                      <p key={j} className={`text-xs px-2 py-1 rounded ${String.fromCharCode(65 + j) === q.answerKey ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'}`}>
                        {String.fromCharCode(65 + j)}. {opt}
                      </p>
                    ))}
                  </div>
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">💡 {q.explanation}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizBuilder;
