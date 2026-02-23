import { useState } from 'react';
import { db } from '@/lib/store';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Eye, Lightbulb } from 'lucide-react';

interface Message {
  role: 'user' | 'coach';
  content: string;
  hints?: string[];
  practiceQuestions?: string[];
}

const AICoach = () => {
  const topics = db.topics.getAll();
  const [topicId, setTopicId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const topic = topics.find(t => t.id === topicId);

  const askCoach = async () => {
    if (!input.trim() || !topic) return;
    const question = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    const resp = await aiService.generateCoachResponse({ topic: topic.title, question });
    setMessages(prev => [...prev, {
      role: 'coach', content: resp.explanation, hints: resp.hints, practiceQuestions: resp.practiceQuestions,
    }]);
    setLoading(false);

    // Audit log for coach usage
    db.audit.log({
      id: `audit-${Date.now()}`, actorUserId: 'current', action: 'coach_question',
      entityType: 'ai_coach', entityId: topicId, createdAt: new Date().toISOString(),
      metadataJson: { question },
    });
  };

  const showAnswer = async () => {
    if (!topic) return;
    setLoading(true);
    const resp = await aiService.generateCoachResponse({ topic: topic.title, question: 'Show answer', showAnswer: true });
    setMessages(prev => [...prev, { role: 'coach', content: resp.explanation }]);
    setLoading(false);

    db.audit.log({
      id: `audit-${Date.now()}`, actorUserId: 'current', action: 'coach_show_answer',
      entityType: 'ai_coach', entityId: topicId, createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-8rem)] max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">AI Learning Coach</h1>
          <p className="text-xs text-muted-foreground">Ask me anything — I'll guide you step by step!</p>
        </div>
        <div className="w-48">
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger><SelectValue placeholder="Pick topic" /></SelectTrigger>
            <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 bg-secondary/30 rounded-xl p-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a topic and ask a question to get started!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-4 ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border shadow-card'
            }`}>
              <p className="text-sm whitespace-pre-line">{m.content}</p>
              {m.hints && m.hints.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Hints:</p>
                  {m.hints.map((h, j) => (
                    <p key={j} className="text-xs bg-accent/10 rounded-lg p-2">{h}</p>
                  ))}
                </div>
              )}
              {m.practiceQuestions && m.practiceQuestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold">Practice:</p>
                  {m.practiceQuestions.map((q, j) => (
                    <p key={j} className="text-xs text-muted-foreground">• {q}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl p-4 shadow-card">
              <p className="text-sm text-muted-foreground animate-pulse-soft">Thinking…</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && askCoach()}
          placeholder={topic ? `Ask about ${topic.title}…` : 'Select a topic first'}
          disabled={!topicId || loading}
        />
        <Button onClick={askCoach} disabled={!topicId || !input.trim() || loading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
        <Button onClick={showAnswer} variant="outline" size="icon" disabled={!topicId || messages.length === 0 || loading} title="Show Answer">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AICoach;
