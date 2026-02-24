import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Loader2, CheckCircle2, Circle, ChevronRight, Trash2, Sparkles, MapPin, Target, Clock, ArrowLeft } from 'lucide-react';

interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  subject_area: string | null;
  status: string;
  roadmap_json: any;
  created_at: string;
  updated_at: string;
}

interface LearningModule {
  id: string;
  path_id: string;
  title: string;
  content: string | null;
  order_index: number;
  examples_json: any;
  references_json: any;
  is_completed: boolean;
  created_at: string;
}

const SelfLearning = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const fetchPaths = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('self_learning_paths')
      .select('*')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) setPaths(data as LearningPath[]);
  }, [user]);

  useEffect(() => { fetchPaths(); }, [fetchPaths]);

  const fetchModules = useCallback(async (pathId: string) => {
    const { data } = await supabase
      .from('self_learning_modules')
      .select('*')
      .eq('path_id', pathId)
      .order('order_index', { ascending: true });
    if (data) setModules(data as LearningModule[]);
  }, []);

  const createPath = async () => {
    if (!newTitle.trim() || !user) return;
    setLoading(true);
    try {
      // Create the path
      const { data: pathData, error: pathError } = await supabase
        .from('self_learning_paths')
        .insert({
          student_id: user.id,
          title: newTitle,
          description: newDesc || null,
          subject_area: newSubject || null,
          status: 'generating',
        })
        .select('*')
        .single();

      if (pathError || !pathData) throw new Error(pathError?.message || 'Failed to create path');

      // Generate roadmap via AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-learning-path', {
        body: { title: newTitle, description: newDesc, subjectArea: newSubject },
      });

      if (aiError || aiData?.error) throw new Error(aiData?.error || aiError?.message || 'AI generation failed');

      // Update path with roadmap
      await supabase
        .from('self_learning_paths')
        .update({ roadmap_json: aiData, status: 'active' })
        .eq('id', (pathData as any).id);

      // Create modules from roadmap
      if (aiData.roadmap?.length) {
        const modulesToInsert = aiData.roadmap.map((m: any, i: number) => ({
          path_id: (pathData as any).id,
          title: m.title,
          content: m.description || null,
          order_index: m.order_index ?? i,
        }));
        await supabase.from('self_learning_modules').insert(modulesToInsert);
      }

      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewSubject('');
      fetchPaths();
      toast({ title: 'Learning path created!', description: 'AI has generated your roadmap.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const deletePath = async (id: string) => {
    await supabase.from('self_learning_paths').delete().eq('id', id);
    if (activePath?.id === id) { setActivePath(null); setModules([]); setActiveModule(null); }
    fetchPaths();
  };

  const selectPath = async (path: LearningPath) => {
    setActivePath(path);
    setActiveModule(null);
    await fetchModules(path.id);
  };

  const generateModuleContent = async (mod: LearningModule) => {
    if (!activePath) return;
    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-learning-path', {
        body: {
          action: 'generate_module_content',
          title: activePath.title,
          subjectArea: activePath.subject_area,
          moduleTitle: mod.title,
          moduleContent: mod.content,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed to generate content');

      await supabase
        .from('self_learning_modules')
        .update({
          content: data.content || mod.content,
          examples_json: data.examples || null,
          references_json: data.references || null,
        })
        .eq('id', mod.id);

      await fetchModules(activePath.id);
      const updated = modules.find(m => m.id === mod.id);
      if (updated) setActiveModule({ ...updated, content: data.content, examples_json: data.examples, references_json: data.references });
      else setActiveModule({ ...mod, content: data.content, examples_json: data.examples, references_json: data.references });

      toast({ title: 'Content generated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setGeneratingContent(false);
  };

  const toggleModuleComplete = async (mod: LearningModule) => {
    const newVal = !mod.is_completed;
    await supabase.from('self_learning_modules').update({ is_completed: newVal }).eq('id', mod.id);
    if (activePath) await fetchModules(activePath.id);
    if (activeModule?.id === mod.id) setActiveModule({ ...mod, is_completed: newVal });
  };

  const completedCount = modules.filter(m => m.is_completed).length;
  const progressPct = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const roadmap = activePath?.roadmap_json;

  // Module detail view
  if (activeModule) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setActiveModule(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Roadmap
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{activeModule.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Module {activeModule.order_index + 1}</p>
          </div>
          <div className="flex gap-2">
            {!activeModule.examples_json && (
              <Button onClick={() => generateModuleContent(activeModule)} disabled={generatingContent} className="gap-2">
                {generatingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Full Content
              </Button>
            )}
            <Button
              variant={activeModule.is_completed ? 'default' : 'outline'}
              onClick={() => toggleModuleComplete(activeModule)}
              className="gap-2"
            >
              {activeModule.is_completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {activeModule.is_completed ? 'Completed' : 'Mark Complete'}
            </Button>
          </div>
        </div>

        {activeModule.content && (
          <Card>
            <CardHeader><CardTitle className="text-lg">📖 Lesson Content</CardTitle></CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">{activeModule.content}</div>
            </CardContent>
          </Card>
        )}

        {activeModule.examples_json && (
          <Card>
            <CardHeader><CardTitle className="text-lg">🌍 Real-World Examples</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(activeModule.examples_json as string[]).map((ex, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <span className="text-foreground">{ex}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {activeModule.references_json && (
          <Card>
            <CardHeader><CardTitle className="text-lg">📚 References & Resources</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(activeModule.references_json as string[]).map((ref, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span>•</span><span>{ref}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {!activeModule.content && !activeModule.examples_json && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4">No detailed content yet. Generate it with AI!</p>
              <Button onClick={() => generateModuleContent(activeModule)} disabled={generatingContent} className="gap-2">
                {generatingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Content
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Path detail view
  if (activePath) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => { setActivePath(null); setModules([]); }} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> All Learning Paths
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{activePath.title}</h1>
          {activePath.description && <p className="text-muted-foreground mt-1">{activePath.description}</p>}
          <div className="flex gap-3 mt-3">
            {activePath.subject_area && <Badge variant="secondary">{activePath.subject_area}</Badge>}
            <Badge variant="outline">{progressPct}% complete</Badge>
          </div>
        </div>

        {/* Roadmap metadata */}
        {roadmap && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roadmap.estimated_duration && (
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Duration</p>
                    <p className="text-sm font-medium text-foreground">{roadmap.estimated_duration}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {roadmap.prerequisites?.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Prerequisites</p>
                  <p className="text-sm text-foreground">{roadmap.prerequisites.join(', ')}</p>
                </CardContent>
              </Card>
            )}
            {roadmap.learning_goals?.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Goals</p>
                  <p className="text-sm text-foreground">{roadmap.learning_goals.slice(0, 2).join('; ')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Modules list */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Modules</h2>
          {modules.map((mod) => (
            <Card
              key={mod.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${mod.is_completed ? 'border-primary/30 bg-primary/5' : ''}`}
              onClick={() => setActiveModule(mod)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleModuleComplete(mod); }}
                  className="shrink-0"
                >
                  {mod.is_completed
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${mod.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {mod.order_index + 1}. {mod.title}
                  </p>
                  {mod.content && <p className="text-xs text-muted-foreground truncate mt-0.5">{mod.content.slice(0, 80)}…</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Paths list view
  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Self Learning</h1>
          <p className="text-sm text-muted-foreground">Create your own learning paths and let AI guide your journey</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Path</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Learning Path</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-foreground">What do you want to learn?</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Introduction to Algebra" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe your learning goals…" className="mt-1" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Subject Area (optional)</label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. Mathematics, Science" className="mt-1" />
              </div>
              <Button onClick={createPath} disabled={!newTitle.trim() || loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'AI is generating your roadmap…' : 'Create with AI Roadmap'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paths.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-2">No learning paths yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first self-directed learning path and AI will generate a complete roadmap for you!</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Your First Path</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {paths.map(path => {
          const rm = path.roadmap_json;
          return (
            <Card key={path.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => selectPath(path)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{path.title}</CardTitle>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePath(path.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {path.description && <CardDescription className="line-clamp-2">{path.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {path.subject_area && <Badge variant="secondary" className="text-xs">{path.subject_area}</Badge>}
                  <Badge variant="outline" className="text-xs">{path.status}</Badge>
                  {rm?.estimated_duration && <Badge variant="outline" className="text-xs">{rm.estimated_duration}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SelfLearning;
