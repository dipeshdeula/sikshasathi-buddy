import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { QuizAttempt } from '@/lib/data';

const ResultsEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const classes = user ? db.classes.getByTeacher(user.id) : [];
  const classId = classes[0]?.id || '';
  const students = classId ? db.classes.getStudents(classId) : [];
  const quizzes = classId ? db.quizzes.getByClass(classId) : [];
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  const questions = selectedQuiz ? db.quizzes.getQuestions(selectedQuiz) : [];
  const maxScore = questions.length;

  const handleSave = () => {
    const attempts: QuizAttempt[] = Object.entries(scores).map(([studentId, score]) => ({
      id: `attempt-${Date.now()}-${studentId}`,
      quizId: selectedQuiz,
      studentId,
      submittedAt: new Date().toISOString(),
      score,
      answersJson: {},
    }));
    db.attempts.bulkCreate(attempts);

    // Update mastery
    const quiz = quizzes.find(q => q.id === selectedQuiz);
    if (quiz) {
      Object.entries(scores).forEach(([studentId, score]) => {
        const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        db.mastery.update(studentId, quiz.topicId, pct);
      });
    }

    toast({ title: `Saved ${attempts.length} results!` });
    setScores({});
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">Quick Results Entry</h1>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="max-w-xs">
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger><SelectValue placeholder="Select a quiz" /></SelectTrigger>
            <SelectContent>
              {quizzes.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedQuiz && (
          <>
            <p className="text-sm text-muted-foreground">Max score: {maxScore} · Enter marks for each student</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-foreground">#</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Student</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Score (/{maxScore})</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, i: number) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 text-foreground font-medium">{s.name}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="w-20 h-8"
                          min={0} max={maxScore}
                          value={scores[s.id] ?? ''}
                          onChange={e => setScores(prev => ({ ...prev, [s.id]: +e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleSave} disabled={Object.keys(scores).length === 0} className="gap-2">
              <Save className="h-4 w-4" /> Save All Results
            </Button>
          </>
        )}

        {quizzes.length === 0 && (
          <p className="text-muted-foreground text-sm">No quizzes yet. Create one in the Quiz Builder first.</p>
        )}
      </div>
    </div>
  );
};

export default ResultsEntry;
