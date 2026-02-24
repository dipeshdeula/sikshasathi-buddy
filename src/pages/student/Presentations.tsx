import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';

interface Slide {
  heading: string;
  content: string;
  visual_cue: string;
  animation_type: string;
}

interface PresentationItem {
  id: string;
  title: string;
  slides_json: Slide[];
  created_at: string;
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

const StudentPresentations = () => {
  const { user } = useAuth();
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [viewing, setViewing] = useState<PresentationItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchPresentations();
  }, []);

  const fetchPresentations = async () => {
    const { data } = await supabase.from('teacher_presentations').select('*').eq('is_published', true).order('created_at', { ascending: false });
    setPresentations((data || []).map(p => ({ ...p, slides_json: p.slides_json as unknown as Slide[] })));
  };

  if (viewing) {
    const slide = viewing.slides_json[currentSlide];
    return (
      <div className="animate-fade-in space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setViewing(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{viewing.title}</h2>
          <span className="text-sm text-muted-foreground">{currentSlide + 1}/{viewing.slides_json.length}</span>
        </div>

        <div className={`rounded-2xl bg-gradient-to-br ${slideColors[currentSlide % slideColors.length]} p-10 min-h-[400px] flex flex-col items-center justify-center text-center`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              {...(animationVariants[slide?.animation_type] || animationVariants['fade-in'])}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h3 className="text-3xl font-bold text-foreground">{slide?.heading}</h3>
              <p className="text-lg text-foreground/80 max-w-xl">{slide?.content}</p>
              <p className="text-sm text-muted-foreground italic">🎨 {slide?.visual_cue}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="flex gap-1">
            {viewing.slides_json.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 w-2 rounded-full transition-colors ${i === currentSlide ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <Button variant="outline" disabled={currentSlide >= viewing.slides_json.length - 1} onClick={() => setCurrentSlide(s => s + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Presentations</h1>
      {presentations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Presentation className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No presentations available yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {presentations.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => { setViewing(p); setCurrentSlide(0); }}>
              <div className="h-24 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{p.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{p.slides_json.length} slides</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentPresentations;
