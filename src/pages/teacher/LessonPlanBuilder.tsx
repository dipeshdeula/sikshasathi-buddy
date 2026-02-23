import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/store';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, BookOpen } from 'lucide-react';
import { LessonPlan } from '@/lib/data';

const LessonPlanBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subjects = db.subjects.getAll();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [level, setLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [duration, setDuration] = useState(40);
  const [objectives, setObjectives] = useState('');
  const [script, setScript] = useState('');
  const [boardwork, setBoardwork] = useState('');
  const [homework, setHomework] = useState('');
  const [generating, setGenerating] = useState(false);

  const topics = subjectId ? db.topics.getBySubject(subjectId) : [];
  const classes = user ? db.classes.getByTeacher(user.id) : [];
  const classId = classes[0]?.id || '';

  const handleGenerate = async () => {
    if (!topicId) { toast({ title: 'Select a topic first', variant: 'destructive' }); return; }
    const topic = db.topics.getAll().find(t => t.id === topicId);
    const subject = subjects.find(s => s.id === subjectId);
    if (!topic || !subject) return;

    setGenerating(true);
    const result = await aiService.generateLessonPlan({
      grade: 7, subject: subject.name, topic: topic.name, level, duration,
    });
    setObjectives(result.objectives || '');
    setScript(result.script || '');
    setBoardwork(result.boardwork || '');
    setHomework(result.homework || '');
    setGenerating(false);
    toast({ title: 'AI generated lesson plan!' });
  };

  const handleSave = () => {
    if (!classId || !topicId) { toast({ title: 'Missing class or topic', variant: 'destructive' }); return; }
    const lp: LessonPlan = {
      id: `lp-${Date.now()}`, classId, topicId, level, durationMinutes: duration,
      objectives, script, boardwork, homework, createdBy: user!.id, createdAt: new Date().toISOString(),
    };
    db.lessonPlans.create(lp);
    toast({ title: 'Lesson plan saved!' });
  };

  const saved = db.lessonPlans.getByClass(classId);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lesson Plan Builder</h1>
          <p className="text-muted-foreground">Create CDC-aligned lesson plans with AI assistance</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={v => { setSubjectId(v); setTopicId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class Level</Label>
            <Select value={level} onValueChange={v => setLevel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(+e.target.value)} min={15} max={90} />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating || !topicId} className="gap-2">
          <Sparkles className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate with AI'}
        </Button>

        <div className="space-y-4">
          <div><Label>Objectives</Label><Textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={3} /></div>
          <div><Label>Teaching Script</Label><Textarea value={script} onChange={e => setScript(e.target.value)} rows={8} /></div>
          <div><Label>Boardwork</Label><Textarea value={boardwork} onChange={e => setBoardwork(e.target.value)} rows={6} className="font-mono text-sm" /></div>
          <div><Label>Homework</Label><Textarea value={homework} onChange={e => setHomework(e.target.value)} rows={3} /></div>
        </div>

        <Button onClick={handleSave} variant="default" className="gap-2">
          <Save className="h-4 w-4" /> Save Lesson Plan
        </Button>
      </div>

      {saved.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Saved Plans ({saved.length})</h2>
          <div className="space-y-2">
            {saved.map(lp => {
              const topic = db.topics.getAll().find(t => t.id === lp.topicId);
              return (
                <div key={lp.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{topic?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{lp.level} · {lp.durationMinutes}min · {new Date(lp.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanBuilder;
