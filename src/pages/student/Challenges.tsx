import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Send, CheckCircle, Clock, Award, Image, SmilePlus } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  created_at: string;
}

interface MySubmission {
  id: string;
  challenge_id: string;
  answer_text: string;
  attachment_url: string | null;
  review_text: string | null;
  is_winner: boolean;
  reaction_score: number | null;
}

interface MyBadge {
  id: string;
  badge_name: string;
  badge_description: string | null;
  points: number;
  awarded_at: string;
}

const EMOJIS = [
  { score: 1, emoji: '😟', label: 'Struggling' },
  { score: 2, emoji: '😐', label: 'Okay' },
  { score: 3, emoji: '🙂', label: 'Good' },
  { score: 4, emoji: '😊', label: 'Great' },
  { score: 5, emoji: '🤩', label: 'Amazing' },
];

const StudentChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, MySubmission>>({});
  const [badges, setBadges] = useState<MyBadge[]>([]);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) { fetchChallenges(); fetchBadges(); }
  }, [user?.id]);

  const fetchChallenges = async () => {
    if (!user) return;
    setLoading(true);

    // RLS handles visibility - just fetch active challenges
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenges:', error);
      toast({ title: 'Error loading challenges', description: error.message, variant: 'destructive' });
    }
    setChallenges(data || []);

    // Get my submissions
    const { data: subs } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('student_id', user.id);
    const subMap: Record<string, MySubmission> = {};
    (subs || []).forEach(s => { subMap[s.challenge_id] = s as unknown as MySubmission; });
    setSubmissions(subMap);
    setLoading(false);
  };

  const fetchBadges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('student_badges')
      .select('*')
      .eq('student_id', user.id)
      .order('awarded_at', { ascending: false });
    setBadges(data || []);
  };

  const handleSubmit = async (challengeId: string) => {
    const answer = answerDraft[challengeId]?.trim();
    if (!answer || !user) return;
    setSubmitting(true);

    let attachmentUrl: string | null = null;
    const file = attachments[challengeId];
    if (file) {
      const path = `${user.id}/${challengeId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('challenge-attachments').upload(path, file);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('challenge-attachments').getPublicUrl(path);
        attachmentUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('challenge_submissions').insert({
      challenge_id: challengeId,
      student_id: user.id,
      answer_text: answer,
      attachment_url: attachmentUrl,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    toast({ title: 'Answer submitted!' });
    setAnswerDraft(prev => ({ ...prev, [challengeId]: '' }));
    setAttachments(prev => { const n = { ...prev }; delete n[challengeId]; return n; });
    setSubmitting(false);
    fetchChallenges();
  };

  const handleReaction = async (submissionId: string, score: number) => {
    await supabase.from('challenge_submissions').update({ reaction_score: score }).eq('id', submissionId);
    toast({ title: 'Reaction saved!' });
    fetchChallenges();
  };

  const totalPoints = badges.reduce((s, b) => s + b.points, 0);
  if (!user) return null;

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Challenges</h1>
        <div className="flex items-center gap-2 bg-warning/10 rounded-lg px-4 py-2">
          <Award className="h-5 w-5 text-warning" />
          <span className="font-bold text-foreground">{totalPoints} pts</span>
          <span className="text-sm text-muted-foreground">· {badges.length} badges</span>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-3">My Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <Badge key={b.id} className="bg-warning/10 text-warning border-warning/30 px-3 py-1.5">
                {b.badge_name} (+{b.points}pts)
              </Badge>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No active challenges right now. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(c => {
            const sub = submissions[c.id];
            return (
              <ChallengeCard
                key={c.id}
                challenge={c}
                submission={sub}
                answerDraft={answerDraft[c.id] || ''}
                attachment={attachments[c.id]}
                submitting={submitting}
                onDraftChange={(val) => setAnswerDraft(prev => ({ ...prev, [c.id]: val }))}
                onAttach={(file) => setAttachments(prev => ({ ...prev, [c.id]: file }))}
                onSubmit={() => handleSubmit(c.id)}
                onReaction={(score) => handleReaction(sub?.id, score)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Extracted challenge card component
interface ChallengeCardProps {
  challenge: Challenge;
  submission?: MySubmission;
  answerDraft: string;
  attachment?: File;
  submitting: boolean;
  onDraftChange: (val: string) => void;
  onAttach: (file: File) => void;
  onSubmit: () => void;
  onReaction: (score: number) => void;
}

const ChallengeCard = ({ challenge: c, submission: sub, answerDraft, attachment, submitting, onDraftChange, onAttach, onSubmit, onReaction }: ChallengeCardProps) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-card">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-foreground">{c.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
        {c.due_date && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Due: {new Date(c.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      {sub?.is_winner && <Badge className="bg-warning text-warning-foreground"><Trophy className="h-3 w-3 mr-1" />Winner!</Badge>}
    </div>

    {sub ? (
      <SubmissionView submission={sub} onReaction={onReaction} />
    ) : (
      <SubmissionForm
        answerDraft={answerDraft}
        attachment={attachment}
        submitting={submitting}
        onDraftChange={onDraftChange}
        onAttach={onAttach}
        onSubmit={onSubmit}
      />
    )}
  </div>
);

const SubmissionView = ({ submission: sub, onReaction }: { submission: MySubmission; onReaction: (score: number) => void }) => (
  <div className="space-y-3">
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">Your Answer:</p>
      <p className="text-sm text-foreground">{sub.answer_text}</p>
      {sub.attachment_url && (
        <a href={sub.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
          <Image className="h-3 w-3" /> View Attachment
        </a>
      )}
    </div>
    {sub.review_text && (
      <div className="bg-primary/5 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Teacher Feedback:</p>
        <p className="text-sm text-foreground">{sub.review_text}</p>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 text-success text-xs">
        <CheckCircle className="h-3 w-3" /> Submitted
      </div>
      <div className="flex items-center gap-1">
        <SmilePlus className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">How did it go?</span>
        {EMOJIS.map(e => (
          <button
            key={e.score}
            onClick={() => onReaction(e.score)}
            className={`text-lg hover:scale-125 transition-transform ${sub.reaction_score === e.score ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
            title={e.label}
          >
            {e.emoji}
          </button>
        ))}
      </div>
    </div>
  </div>
);

interface SubmissionFormProps {
  answerDraft: string;
  attachment?: File;
  submitting: boolean;
  onDraftChange: (val: string) => void;
  onAttach: (file: File) => void;
  onSubmit: () => void;
}

const SubmissionForm = ({ answerDraft, attachment, submitting, onDraftChange, onAttach, onSubmit }: SubmissionFormProps) => (
  <div className="space-y-2">
    <Textarea
      value={answerDraft}
      onChange={e => onDraftChange(e.target.value)}
      placeholder="Write your answer..."
      rows={3}
    />
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (ev) => {
          const f = (ev.target as HTMLInputElement).files?.[0];
          if (f) onAttach(f);
        };
        input.click();
      }}>
        <Image className="h-3 w-3 mr-1" /> {attachment ? attachment.name : 'Attach Image'}
      </Button>
      <Button size="sm" onClick={onSubmit} disabled={!answerDraft.trim() || submitting}>
        <Send className="h-3 w-3 mr-1" /> Submit
      </Button>
    </div>
  </div>
);

export default StudentChallenges;
