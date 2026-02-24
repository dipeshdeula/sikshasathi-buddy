import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, FileQuestion, Loader2, Trash2, Edit, Eye, Send, Plus, Check, X } from 'lucide-react';
import type { Grade, Subject, Unit, Topic, QuizQuestion } from '@/lib/data';
import { mapGrade, mapSubject, mapUnit, mapTopic, mapQuizQuestion } from '@/lib/data';

interface SavedQuiz {
  id: string;
  title: string;
  topic_id: string;
  is_published: boolean;
  created_at: string;
  questions: QuizQuestion[];
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
  const [generating, setGenerating] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);

  // Editing state
  const [editingQuestion, setEditingQuestion] = useState<{ quizId: string; question: QuizQuestion } | null>(null);
  const [editForm, setEditForm] = useState({ prompt: '', optionsJson: ['', '', '', ''], answerKey: '', explanation: '', difficulty: '' });

  // View quiz dialog
  const [viewQuizId, setViewQuizId] = useState<string | null>(null);

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
    if (!user) return;
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load quizzes:', error);
      return;
    }
    if (data) {
      setSavedQuizzes(data.map((q: any) => ({
        id: q.id,
        title: q.title,
        topic_id: q.topic_id,
        is_published: q.is_published,
        created_at: q.created_at,
        questions: (q.quiz_questions || []).map(mapQuizQuestion),
      })));
    }
  };

  const handleGenerate = async () => {
    const topic = topics.find(t => t.id === topicId);
    const subject = subjects.find(s => s.id === subjectId);
    if (!topic || !user) return;
    setGenerating(true);
    try {
      const qs = await aiService.generateQuiz({ topic: topic.title, numQuestions: numQ, subject: subject?.name });
      if (!qs.length) {
        toast({ title: 'No questions generated', variant: 'destructive' });
        return;
      }

      // Auto-save to database
      const quizTitle = `${topic.title} Quiz`;
      const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', user.id).limit(1);
      const classId = classes?.[0]?.id || null;

      const { data: quiz, error: quizErr } = await supabase
        .from('quizzes')
        .insert({ class_id: classId, topic_id: topicId, title: quizTitle, created_by: user.id, is_published: false })
        .select()
        .single();

      if (quizErr || !quiz) {
        console.error('Quiz insert error:', quizErr);
        toast({ title: 'Failed to save quiz to database', description: quizErr?.message, variant: 'destructive' });
        return;
      }

      const questionsToInsert = qs.map(q => ({
        quiz_id: quiz.id,
        qtype: q.qtype,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options_json: q.optionsJson,
        answer_key: q.answerKey,
        explanation: q.explanation,
      }));

      const { error: qErr } = await supabase.from('quiz_questions').insert(questionsToInsert);
      if (qErr) {
        console.error('Questions insert error:', qErr);
        toast({ title: 'Quiz saved but questions failed', description: qErr.message, variant: 'destructive' });
        return;
      }

      toast({ title: `Generated & saved ${qs.length} questions!` });
      await loadSavedQuizzes();
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
    await supabase.from('quizzes').delete().eq('id', quizId);
    toast({ title: 'Quiz deleted' });
    loadSavedQuizzes();
    if (viewQuizId === quizId) setViewQuizId(null);
  };

  const handleDeleteQuestion = async (quizId: string, questionId: string) => {
    await supabase.from('quiz_questions').delete().eq('id', questionId);
    toast({ title: 'Question deleted' });
    loadSavedQuizzes();
  };

  const handlePublishToggle = async (quizId: string, current: boolean) => {
    await supabase.from('quizzes').update({ is_published: !current }).eq('id', quizId);
    toast({ title: current ? 'Quiz unpublished' : 'Quiz published! Students can now solve it.' });
    loadSavedQuizzes();
  };

  const startEditQuestion = (quizId: string, q: QuizQuestion) => {
    setEditingQuestion({ quizId, question: q });
    setEditForm({
      prompt: q.prompt,
      optionsJson: [...q.optionsJson, '', '', '', ''].slice(0, 4),
      answerKey: q.answerKey,
      explanation: q.explanation || '',
      difficulty: q.difficulty,
    });
  };

  const saveEditQuestion = async () => {
    if (!editingQuestion) return;
    const { error } = await supabase.from('quiz_questions').update({
      prompt: editForm.prompt,
      options_json: editForm.optionsJson.filter(o => o.trim()),
      answer_key: editForm.answerKey,
      explanation: editForm.explanation,
      difficulty: editForm.difficulty,
    }).eq('id', editingQuestion.question.id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question updated' });
    setEditingQuestion(null);
    loadSavedQuizzes();
  };

  const viewQuiz = savedQuizzes.find(q => q.id === viewQuizId);

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <FileQuestion className="h-6 w-6 text-primary" /> Quiz Builder
      </h1>

      {/* Generator Section */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Generate New Quiz</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
            {generating ? 'Generating…' : 'Generate & Save'}
          </Button>
        </div>
      </div>

      {/* Saved Quizzes Table */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">My Quizzes ({savedQuizzes.length})</h2>
        {savedQuizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No quizzes yet. Generate one above!</p>
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
                  <TableCell>{q.questions.length} Qs</TableCell>
                  <TableCell>
                    <Badge variant={q.is_published ? 'default' : 'secondary'}>
                      {q.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewQuizId(q.id)}>
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

      {/* View/Edit Quiz Dialog */}
      <Dialog open={!!viewQuiz} onOpenChange={() => setViewQuizId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewQuiz?.title} — Questions</DialogTitle></DialogHeader>
          {viewQuiz && (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewQuiz.questions.map((q, i) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm">{q.prompt}</p>
                        {q.explanation && <p className="text-xs text-muted-foreground italic mt-1">💡 {q.explanation}</p>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {q.optionsJson.map((opt, j) => (
                          <p key={j} className={String.fromCharCode(65 + j) === q.answerKey ? 'font-medium text-primary' : 'text-muted-foreground'}>
                            {String.fromCharCode(65 + j)}. {opt}
                          </p>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.answerKey}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{q.difficulty}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEditQuestion(viewQuiz.id, q)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(viewQuiz.id, q.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Question</Label>
              <Textarea value={editForm.prompt} onChange={e => setEditForm(f => ({ ...f, prompt: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {editForm.optionsJson.map((opt, i) => (
                <div key={i}><Label>Option {String.fromCharCode(65 + i)}</Label>
                  <Input value={opt} onChange={e => {
                    const newOpts = [...editForm.optionsJson];
                    newOpts[i] = e.target.value;
                    setEditForm(f => ({ ...f, optionsJson: newOpts }));
                  }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Correct Answer</Label>
                <Select value={editForm.answerKey} onValueChange={v => setEditForm(f => ({ ...f, answerKey: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Difficulty</Label>
                <Select value={editForm.difficulty} onValueChange={v => setEditForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['easy', 'medium', 'hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Explanation</Label>
              <Textarea value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingQuestion(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button onClick={saveEditQuestion}><Check className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizBuilder;
