import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses, useClassStudents, useClassQuizzes, useQuizQuestions } from '@/hooks/use-supabase-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const ResultsEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useTeacherClasses(user?.id);
  const classId = classes[0]?.id || '';
  const { data: students } = useClassStudents(classId);
  const { data: quizzes } = useClassQuizzes(classId);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const { data: questions } = useQuizQuestions(selectedQuiz || undefined);

  const maxScore = questions.length;

  const handleSave = async () => {
    const attempts = Object.entries(scores).map(([studentId, score]) => ({
      quiz_id: selectedQuiz,
      student_id: studentId,
      score,
      answers_json: {},
    }));
    
    await supabase.from('quiz_attempts').insert(attempts);

    // Update mastery
    const quiz = quizzes.find(q => q.id === selectedQuiz);
    if (quiz) {
      for (const [studentId, score] of Object.entries(scores)) {
        const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        await supabase.from('mastery_states').upsert({
          student_id: studentId, topic_id: quiz.topicId, mastery_score: pct, updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id,topic_id' });
      }
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
