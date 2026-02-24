import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileQuestion, CheckCircle, Trophy, ArrowRight } from 'lucide-react';
import { mapQuizQuestion } from '@/lib/data';
import type { QuizQuestion } from '@/lib/data';

interface QuizInfo {
  id: string;
  title: string;
  is_published: boolean;
  created_at: string;
}

interface AttemptInfo {
  quiz_id: string;
  score: number;
  submitted_at: string;
}

const QuizSolver = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AttemptInfo>>({});
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: QuizInfo; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetchQuizzes();
  }, [user?.id]);

  const fetchQuizzes = async () => {
    // Get student's class
    const { data: enrollment } = await supabase.from('class_students').select('class_id').eq('student_id', user!.id);
    const classIds = (enrollment || []).map(e => e.class_id);
    if (classIds.length === 0) return;

    const { data } = await supabase.from('quizzes').select('*').in('class_id', classIds).eq('is_published', true).order('created_at', { ascending: false });
    setQuizzes(data || []);

    // Get my attempts
    const { data: myAttempts } = await supabase.from('quiz_attempts').select('*').eq('student_id', user!.id);
    const attemptMap: Record<string, AttemptInfo> = {};
    (myAttempts || []).forEach(a => {
      if (!attemptMap[a.quiz_id!] || new Date(a.submitted_at!) > new Date(attemptMap[a.quiz_id!].submitted_at)) {
        attemptMap[a.quiz_id!] = { quiz_id: a.quiz_id!, score: a.score || 0, submitted_at: a.submitted_at! };
      }
    });
    setAttempts(attemptMap);
  };

  const startQuiz = async (quiz: QuizInfo) => {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id);
    setActiveQuiz({ quiz, questions: (data || []).map(mapQuizQuestion) });
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const handleSubmit = async () => {
    if (!activeQuiz || !user) return;
    let correct = 0;
    activeQuiz.questions.forEach(q => {
      if (answers[q.id] === q.answerKey) correct++;
    });
    const pct = Math.round((correct / activeQuiz.questions.length) * 100);
    setScore(pct);
    setSubmitted(true);

    await supabase.from('quiz_attempts').insert({
      quiz_id: activeQuiz.quiz.id,
      student_id: user.id,
      score: pct,
      answers_json: answers,
    });
    toast({ title: `Score: ${pct}% (${correct}/${activeQuiz.questions.length})` });
    fetchQuizzes();
  };

  if (activeQuiz) {
    return (
      <div className="animate-fade-in space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{activeQuiz.quiz.title}</h1>
          <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>← Back</Button>
        </div>

        {activeQuiz.questions.map((q, i) => (
          <div key={q.id} className="bg-card rounded-xl border border-border p-5 shadow-card">
            <p className="text-sm font-medium text-foreground mb-3">Q{i + 1}. {q.prompt}</p>
            <div className="space-y-2">
              {q.optionsJson.map((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                const selected = answers[q.id] === letter;
                const isCorrect = submitted && letter === q.answerKey;
                const isWrong = submitted && selected && letter !== q.answerKey;
                return (
                  <button
                    key={j}
                    disabled={submitted}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: letter }))}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors border ${
                      isCorrect ? 'border-success bg-success/10 text-success' :
                      isWrong ? 'border-destructive bg-destructive/10 text-destructive' :
                      selected ? 'border-primary bg-primary/10 text-primary' :
                      'border-border hover:bg-secondary text-foreground'
                    }`}
                  >
                    {letter}. {opt}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>
            )}
          </div>
        ))}

        {!submitted ? (
          <Button onClick={handleSubmit} className="w-full" disabled={Object.keys(answers).length < activeQuiz.questions.length}>
            Submit Quiz <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6 shadow-card text-center">
            <Trophy className="h-10 w-10 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{score}%</p>
            <p className="text-sm text-muted-foreground">Quiz Complete!</p>
            <Button className="mt-4" onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <FileQuestion className="h-6 w-6 text-primary" /> My Quizzes
      </h1>

      {quizzes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No published quizzes available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => {
            const attempt = attempts[q.id];
            return (
              <div key={q.id} className="bg-card rounded-xl border border-border p-5 shadow-card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{q.title}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {attempt && (
                    <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> {attempt.score}%
                    </Badge>
                  )}
                  <Button size="sm" onClick={() => startQuiz(q)}>
                    {attempt ? 'Retake' : 'Start'} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuizSolver;
