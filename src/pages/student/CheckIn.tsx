import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const emojis = ['😢', '😕', '😐', '🙂', '😄'];

const CheckIn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (!user || score === 0) { toast({ title: 'Please select a rating', variant: 'destructive' }); return; }

    // Get student's class
    const { data: enrollment } = await supabase.from('class_students').select('class_id').eq('student_id', user.id).limit(1);
    const classId = enrollment?.[0]?.class_id;

    await supabase.from('student_checkins').insert({
      student_id: user.id,
      class_id: classId || null,
      date: new Date().toISOString().split('T')[0],
      happiness_score: score,
      comment,
    });

    toast({ title: 'Check-in saved! Thank you 🙏' });
    setScore(0);
    setComment('');
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">How are you feeling?</h1>
        <p className="text-muted-foreground text-sm mt-1">Your feedback is private and helps your teacher</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 shadow-card text-center">
        <div className="flex justify-center gap-4 mb-6">
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
        {score > 0 && <p className="text-lg font-semibold text-foreground mb-4">{['Very sad', 'Not great', 'Okay', 'Good', 'Amazing!'][score - 1]}</p>}

        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Want to share more? (optional)"
          rows={3}
          className="mb-4"
        />

        <Button onClick={handleSubmit} className="w-full" disabled={score === 0}>
          Submit Check-in
        </Button>
      </div>
    </div>
  );
};

export default CheckIn;
