import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, FileQuestion, Loader2 } from 'lucide-react';
import type { Grade, Subject, Unit, Topic, QuizQuestion } from '@/lib/data';
import { mapGrade, mapSubject, mapUnit, mapTopic } from '@/lib/data';

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
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);

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
      .order('created_at', { ascending: false });
    if (data) setSavedQuizzes(data);
  };

  const handleGenerate = async () => {
    const topic = topics.find(t => t.id === topicId);
    const subject = subjects.find(s => s.id === subjectId);
    if (!topic) return;
    setGenerating(true);
    try {
      const qs = await aiService.generateQuiz({
        topic: topic.title,
        numQuestions: numQ,
        subject: subject?.name,
      });
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

    // Get teacher's class
    const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', user.id).limit(1);
    const classId = classes?.[0]?.id;

    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .insert({ class_id: classId || null, topic_id: topicId, title, created_by: user.id })
      .select()
      .single();

    if (quizErr || !quiz) {
      toast({ title: 'Failed to save quiz', variant: 'destructive' });
      return;
    }

    const questionsToInsert = questions.map(q => ({
      quiz_id: quiz.id,
      qtype: q.qtype,
      difficulty: q.difficulty,
      prompt: q.prompt,
      options_json: q.optionsJson,
      answer_key: q.answerKey,
      explanation: q.explanation,
    }));

    await supabase.from('quiz_questions').insert(questionsToInsert);
    setQuestions([]);
    setTitle('');
    loadSavedQuizzes();
    toast({ title: 'Quiz saved!' });
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <FileQuestion className="h-6 w-6 text-primary" /> Quiz Builder
      </h1>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Grade</Label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
              <SelectContent>{grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!gradeId}>
              <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={unitId} onValueChange={setUnitId} disabled={!subjectId}>
              <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
              <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId} disabled={!unitId}>
              <SelectTrigger><SelectValue placeholder="Select Topic" /></SelectTrigger>
              <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="max-w-xs">
          <Label>Number of Questions</Label>
          <Input type="number" value={numQ} onChange={e => setNumQ(+e.target.value)} min={3} max={10} />
        </div>

        <Button onClick={handleGenerate} disabled={generating || !topicId} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Generating…' : 'Generate Quiz with AI'}
        </Button>

        {questions.length > 0 && (
          <div className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz Title" />
            {questions.map((q, i) => (
              <div key={i} className="bg-secondary rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{q.difficulty}</span>
                  <span className="text-xs text-muted-foreground">{q.qtype.toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {q.optionsJson.map((opt, j) => (
                    <p key={j} className={`text-xs px-2 py-1 rounded ${
                      String.fromCharCode(65 + j) === q.answerKey ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </p>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>
                )}
              </div>
            ))}
            <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Save Quiz</Button>
          </div>
        )}
      </div>

      {savedQuizzes.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Saved Quizzes ({savedQuizzes.length})</h2>
          {savedQuizzes.map((q: any) => (
            <div key={q.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg mb-2">
              <FileQuestion className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{q.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                {q.quiz_questions?.length || 0} Qs
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;
