import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

const emojis = ['😢', '😕', '😐', '🙂', '😄'];
const labels = ['Very Unsatisfied', 'Needs Improvement', 'Okay', 'Good', 'Excellent'];

const FEEDBACK_CATEGORIES = [
  { value: 'class', label: 'Class Environment' },
  { value: 'teacher', label: 'Teacher & Content Delivery' },
  { value: 'content', label: 'Learning Materials' },
  { value: 'general', label: 'General Wellbeing' },
];

const CheckIn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || score === 0) { toast({ title: 'Please select a rating', variant: 'destructive' }); return; }

    const { data: enrollment } = await supabase.from('class_students').select('class_id').eq('student_id', user.id).limit(1);
    const classId = enrollment?.[0]?.class_id;

    const { error } = await supabase.from('student_checkins').insert({
      student_id: user.id,
      class_id: classId || null,
      date: new Date().toISOString().split('T')[0],
      happiness_score: score,
      comment: category !== 'general' ? `[${category}] ${comment}` : comment,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Feedback submitted! Thank you 🙏' });
    setSubmitted(true);
  };

  const handleReset = () => {
    setScore(0);
    setComment('');
    setCategory('general');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="animate-fade-in space-y-6 max-w-md mx-auto text-center">
        <div className="bg-card rounded-xl border border-border p-8 shadow-card">
          <p className="text-4xl mb-4">🙏</p>
          <h2 className="text-xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your feedback helps improve your learning experience.</p>
          <Button onClick={handleReset} variant="outline">Submit Another Feedback</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Feedback
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Share your thoughts about your class, teacher, and learning experience</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 shadow-card space-y-6">
        {/* Category Selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">What is your feedback about?</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FEEDBACK_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rating */}
        <div className="text-center">
          <label className="text-sm font-medium text-foreground mb-3 block">How would you rate it?</label>
          <div className="flex justify-center gap-4 mb-3">
            {emojis.map((e, i) => (
              <button
                key={i}
                onClick={() => setScore(i + 1)}
                className={`text-4xl transition-transform ${score === i + 1 ? 'scale-125' : 'opacity-40 hover:opacity-70 hover:scale-110'}`}
              >
                {e}
              </button>
            ))}
          </div>
          {score > 0 && <p className="text-lg font-semibold text-foreground">{labels[score - 1]}</p>}
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Tell us more (optional)</label>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={
              category === 'teacher' ? "How is your teacher's teaching style? Any suggestions?" :
              category === 'class' ? "How is the classroom environment? Is it comfortable?" :
              category === 'content' ? "Are the learning materials helpful? What could be better?" :
              "How are you feeling overall? Anything you'd like to share?"
            }
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={score === 0}>
          Submit Feedback
        </Button>
      </div>
    </div>
  );
};

export default CheckIn;
