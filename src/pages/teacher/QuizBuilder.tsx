import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, FileQuestion } from 'lucide-react';
import { Quiz, QuizQuestion } from '@/lib/data';

const QuizBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subjects = db.subjects.getAll();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id' | 'quizId'>[]>([]);
  const [generating, setGenerating] = useState(false);

  const topics = subjectId ? db.topics.getBySubject(subjectId) : [];
  const classes = user ? db.classes.getByTeacher(user.id) : [];

  const handleGenerate = async () => {
    const topic = db.topics.getAll().find(t => t.id === topicId);
    if (!topic) return;
    setGenerating(true);
    const qs = await aiService.generateQuiz({ topic: topic.name, numQuestions: numQ });
    setQuestions(qs);
    setTitle(`${topic.name} Quiz`);
    setGenerating(false);
    toast({ title: `Generated ${qs.length} questions!` });
  };

  const handleSave = () => {
    if (!classes[0] || !topicId || questions.length === 0) { toast({ title: 'Complete all fields', variant: 'destructive' }); return; }
    const quizId = `quiz-${Date.now()}`;
    const quiz: Quiz = { id: quizId, classId: classes[0].id, topicId, title, createdBy: user!.id, createdAt: new Date().toISOString() };
    db.quizzes.create(quiz);
    db.quizzes.addQuestions(questions.map((q, i) => ({ ...q, id: `qq-${Date.now()}-${i}`, quizId })));
    setQuestions([]);
    setTitle('');
    toast({ title: 'Quiz saved!' });
  };

  const savedQuizzes = classes[0] ? db.quizzes.getByClass(classes[0].id) : [];

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">Quiz Builder</h1>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Questions</Label>
            <Input type="number" value={numQ} onChange={e => setNumQ(+e.target.value)} min={3} max={10} />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating || !topicId} className="gap-2">
          <Sparkles className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate Quiz'}
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
                    <p key={j} className={`text-xs px-2 py-1 rounded ${j === 0 ? 'bg-success/10 text-success' : 'text-muted-foreground'}`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Save Quiz</Button>
          </div>
        )}
      </div>

      {savedQuizzes.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Saved Quizzes</h2>
          {savedQuizzes.map(q => (
            <div key={q.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg mb-2">
              <FileQuestion className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{q.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                {db.quizzes.getQuestions(q.id).length} Qs
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;
