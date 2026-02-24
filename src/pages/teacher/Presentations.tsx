import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Play, Eye, EyeOff, Trash2, Presentation } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface TeacherGuideline {
  id: string;
  topic_id: string;
  teaching_script: string;
  boardwork: string;
  reference_links: string;
  presentation_content: string;
  topics?: any;
}

interface PresentationItem {
  id: string;
  title: string;
  slides_json: Slide[];
  is_published: boolean;
  created_at: string;
  guideline_id: string;
}

interface Slide {
  heading: string;
  content: string;
  visual_cue: string;
  animation_type: string;
}

const animationVariants: Record<string, any> = {
  'fade-in': { initial: { opacity: 0 }, animate: { opacity: 1 } },
  'slide-left': { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 } },
  'slide-up': { initial: { y: 60, opacity: 0 }, animate: { y: 0, opacity: 1 } },
  'zoom-in': { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 } },
  'bounce': { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5 } } },
};

const slideColors = [
  'from-primary/20 to-primary/5',
  'from-accent/20 to-accent/5',
  'from-success/20 to-success/5',
  'from-warning/20 to-warning/5',
  'from-destructive/10 to-destructive/5',
];

const Presentations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [guidelines, setGuidelines] = useState<TeacherGuideline[]>([]);
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewingPresentation, setViewingPresentation] = useState<PresentationItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchGuidelines();
      fetchPresentations();
    }
  }, [user?.id]);

  const fetchGuidelines = async () => {
    const { data } = await supabase.from('teacher_guidelines').select('*, topics(title, units(title, subjects(name)))').eq('teacher_id', user!.id);
    setGuidelines(data || []);
  };

  const fetchPresentations = async () => {
    const { data } = await supabase.from('teacher_presentations').select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false });
    setPresentations((data || []).map(p => ({ ...p, slides_json: p.slides_json as unknown as Slide[] })));
  };

  const handleGenerate = async (g: TeacherGuideline) => {
    setGenerating(g.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: {
          teachingScript: g.teaching_script,
          title: g.topics?.title || 'Lesson',
          boardwork: g.boardwork,
          referenceLinks: g.reference_links,
        },
      });
      if (error) throw error;
      const slides = data.slides || [];
      const title = `${g.topics?.subjects?.name || ''} - ${g.topics?.title || 'Presentation'}`;
      const { error: insertErr } = await supabase.from('teacher_presentations').insert({
        teacher_id: user!.id,
        guideline_id: g.id,
        title,
        slides_json: slides,
      });
      if (insertErr) throw insertErr;
      toast({ title: 'Presentation generated! 🎬' });
      fetchPresentations();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const togglePublish = async (p: PresentationItem) => {
    await supabase.from('teacher_presentations').update({ is_published: !p.is_published }).eq('id', p.id);
    toast({ title: p.is_published ? 'Unpublished' : 'Published for students! 📢' });
    fetchPresentations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('teacher_presentations').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchPresentations();
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground">Animated Presentations</h1>

      {/* Generate from guidelines */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-3">Generate from Teaching Scripts</h2>
        {guidelines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teaching guidelines found. Create one first in Lesson Plans → Teacher Guideline tab.</p>
        ) : (
          <div className="space-y-2">
            {guidelines.map(g => (
              <div key={g.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                <div>
                  <span className="text-sm font-medium text-foreground">{g.topics?.title || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground ml-2">{(g.topics as any)?.units?.subjects?.name}</span>
                </div>
                <Button size="sm" onClick={() => handleGenerate(g)} disabled={generating === g.id}>
                  <Sparkles className="h-3 w-3 mr-1" />{generating === g.id ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved presentations */}
      {presentations.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-3">Saved Presentations</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slides</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentations.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.slides_json.length}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_published ? 'default' : 'secondary'}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingPresentation(p); setCurrentSlide(0); }}>
                      <Play className="h-3 w-3 mr-1" />Preview
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(p)}>
                      {p.is_published ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      {p.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Presentation Viewer Dialog */}
      <Dialog open={!!viewingPresentation} onOpenChange={() => setViewingPresentation(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{viewingPresentation?.title}</DialogTitle></DialogHeader>
          {viewingPresentation && (
            <div className="space-y-4">
              <div className={`rounded-xl bg-gradient-to-br ${slideColors[currentSlide % slideColors.length]} p-8 min-h-[300px] flex flex-col items-center justify-center text-center`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    {...(animationVariants[viewingPresentation.slides_json[currentSlide]?.animation_type] || animationVariants['fade-in'])}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <h3 className="text-2xl font-bold text-foreground">{viewingPresentation.slides_json[currentSlide]?.heading}</h3>
                    <p className="text-base text-foreground/80 max-w-lg">{viewingPresentation.slides_json[currentSlide]?.content}</p>
                    <p className="text-xs text-muted-foreground italic">🎨 {viewingPresentation.slides_json[currentSlide]?.visual_cue}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">{currentSlide + 1} / {viewingPresentation.slides_json.length}</span>
                <Button variant="outline" size="sm" disabled={currentSlide >= viewingPresentation.slides_json.length - 1} onClick={() => setCurrentSlide(s => s + 1)}>Next</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {presentations.length === 0 && guidelines.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Presentation className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Create teaching guidelines first, then generate animated presentations!</p>
        </div>
      )}
    </div>
  );
};

export default Presentations;
